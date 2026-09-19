"""LiteLLM abstraction.

Agents depend on this module and never on a provider SDK directly. Swapping
providers is therefore a matter of changing LLM_MODEL in the environment.
"""
from __future__ import annotations

import json
import logging
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
    raise LLMError("The model response could not be parsed as JSON.")


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

        try:
            response = await litellm.acompletion(**kwargs)
        except Exception as exc:  # LiteLLM raises a wide family of provider errors.
            logger.error("LLM call failed: %s", exc)
            raise LLMError(str(exc)) from exc

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
