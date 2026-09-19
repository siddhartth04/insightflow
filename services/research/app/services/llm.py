"""LiteLLM abstraction.

Agents depend on this module and never on a provider SDK directly. Swapping
providers is therefore a matter of changing LLM_MODEL in the environment.
"""
from __future__ import annotations

import asyncio
import json
import logging
import random
import re
from functools import lru_cache
from typing import Any

import litellm

from app.config import get_settings

logger = logging.getLogger(__name__)

# LiteLLM is chatty by default; keep our logs readable.
litellm.suppress_debug_info = True
litellm.drop_params = True


class LLMError(RuntimeError):
    """Raised when the model could not produce a usable response."""


class RateLimited(LLMError):
    """The provider rejected the call because of a rate limit."""

    def __init__(self, message: str, retry_after: float | None = None) -> None:
        super().__init__(message)
        self.retry_after = retry_after


_RETRY_AFTER = re.compile(r"try again in ([0-9.]+)s", re.IGNORECASE)


def _rate_limit_delay(error: Exception) -> float | None:
    """Return the provider's suggested wait, when the error is a rate limit.

    Providers report this differently, so this checks the exception type name and
    the message rather than importing provider-specific exception classes.
    """
    name = type(error).__name__.lower()
    text = str(error)
    is_rate_limit = "ratelimit" in name or "rate_limit_exceeded" in text or "429" in text
    if not is_rate_limit:
        return None
    match = _RETRY_AFTER.search(text)
    if match:
        try:
            return min(float(match.group(1)) + 0.75, 30.0)
        except ValueError:
            pass
    return 8.0


_JSON_BLOCK = re.compile(r"```(?:json)?\s*(.*?)```", re.DOTALL)


def extract_json(raw: str) -> dict[str, Any]:
    """Pull a JSON object out of a model response.

    Models wrap JSON in prose or fences often enough that a tolerant parser is
    worth more than a strict one.
    """
    candidates: list[str] = []
    fenced = _JSON_BLOCK.search(raw)
    if fenced:
        candidates.append(fenced.group(1))
    candidates.append(raw)

    start, end = raw.find("{"), raw.rfind("}")
    if start != -1 and end > start:
        candidates.append(raw[start : end + 1])

    for candidate in candidates:
        try:
            parsed = json.loads(candidate.strip())
        except (json.JSONDecodeError, ValueError):
            continue
        if isinstance(parsed, dict):
            return parsed

    # A response cut off at max_tokens leaves unterminated strings and open
    # brackets. Repairing it salvages the fields that did arrive, which is far
    # better than discarding a long generation over a missing brace.
    repaired = _repair_truncated_json(raw)
    if repaired is not None:
        logger.warning("Recovered a truncated JSON response from the model.")
        return repaired

    raise LLMError("The model response could not be parsed as JSON.")


def _repair_truncated_json(raw: str) -> dict[str, Any] | None:
    """Best-effort repair of a JSON object truncated mid-generation."""
    start = raw.find("{")
    if start == -1:
        return None
    text = raw[start:]

    # Walk the text tracking string state so brackets inside strings are ignored.
    in_string = False
    escaped = False
    stack: list[str] = []
    for char in text:
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            continue
        if char == '"':
            in_string = True
        elif char in "{[":
            stack.append(char)
        elif char in "}]":
            if stack:
                stack.pop()

    patched = text
    if in_string:
        patched += '"'
    # Drop a dangling key or trailing comma before closing the structure.
    patched = re.sub(r",\s*$", "", patched.rstrip())
    patched = re.sub(r',\s*"[^"]*"\s*:\s*$', "", patched)
    patched = re.sub(r'\{\s*"[^"]*"\s*:\s*$', "{", patched)
    for opener in reversed(stack):
        patched += "}" if opener == "{" else "]"

    try:
        parsed = json.loads(patched)
    except (json.JSONDecodeError, ValueError):
        return None
    return parsed if isinstance(parsed, dict) else None


class LLMClient:
    """Thin async wrapper around litellm.acompletion."""

    def __init__(self) -> None:
        self._settings = get_settings()

    @property
    def model(self) -> str:
        return self._settings.llm_model

    @property
    def available(self) -> bool:
        settings = self._settings
        return not settings.offline_mode and settings.has_credentials

    async def complete(
        self,
        *,
        system: str,
        prompt: str,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> str:
        """Run a single completion and return the message text."""
        settings = self._settings
        kwargs: dict[str, Any] = {
            "model": settings.llm_model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            "temperature": settings.llm_temperature if temperature is None else temperature,
            "max_tokens": settings.llm_max_tokens if max_tokens is None else max_tokens,
            "timeout": settings.llm_timeout,
        }
        if settings.litellm_base_url:
            kwargs["api_base"] = settings.litellm_base_url
            kwargs["api_key"] = settings.litellm_api_key or "sk-insightflow-local"

        # Free provider tiers commonly enforce a tokens-per-minute cap, which a
        # multi-agent workflow hits easily. Wait out the limit rather than
        # failing a run that would otherwise succeed.
        attempts = settings.llm_max_retries + 1
        response = None
        for attempt in range(1, attempts + 1):
            try:
                response = await litellm.acompletion(**kwargs)
                break
            except Exception as exc:  # LiteLLM raises a wide family of provider errors.
                delay = _rate_limit_delay(exc)
                if delay is not None and attempt < attempts:
                    # Jitter keeps concurrent workflows from retrying in lockstep.
                    wait = delay + random.uniform(0, 0.6)
                    logger.warning(
                        "Rate limited by the provider; retrying in %.1fs (attempt %d/%d)",
                        wait,
                        attempt,
                        attempts,
                    )
                    await asyncio.sleep(wait)
                    continue
                logger.error("LLM call failed: %s", exc)
                if delay is not None:
                    raise RateLimited(
                        "The model provider rate limit was exceeded. "
                        "Please wait a moment and try again.",
                        delay,
                    ) from exc
                raise LLMError(str(exc)) from exc

        if response is None:  # pragma: no cover - loop always sets or raises
            raise LLMError("The model call did not return a response.")

        try:
            content = response["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise LLMError("The model returned an unexpected response shape.") from exc

        if not content or not content.strip():
            raise LLMError("The model returned an empty response.")
        return content.strip()

    async def complete_json(
        self,
        *,
        system: str,
        prompt: str,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> dict[str, Any]:
        """Run a completion that is expected to return a JSON object."""
        raw = await self.complete(
            system=f"{system}\n\nRespond with a single valid JSON object and nothing else.",
            prompt=prompt,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return extract_json(raw)


@lru_cache(maxsize=1)
def get_llm_client() -> LLMClient:
    return LLMClient()
