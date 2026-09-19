"""HTTP client for the Research module.

Cross-module communication is deliberately HTTP-only: the Content service never
imports Research code, so the two remain independently deployable.
"""
from __future__ import annotations

import logging
from functools import lru_cache
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


class ResearchUnavailable(RuntimeError):
    """The Research service could not be reached or failed to respond."""


class ResearchClient:
    def __init__(self) -> None:
        settings = get_settings()
        self.base_url = settings.research_service_url
        self.timeout = settings.research_timeout

    async def is_healthy(self) -> bool:
        """Best-effort health probe used by /health and /metadata."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/health")
            return response.status_code == 200
        except httpx.HTTPError:
            return False

    async def research(self, topic: str, depth: str = "standard") -> dict[str, Any]:
        """Run a research workflow through the Research service."""
        url = f"{self.base_url}/run"
        logger.info("Calling Research service | url=%s topic=%r", url, topic)
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json={"topic": topic, "depth": depth})
        except httpx.TimeoutException as exc:
            logger.error("Research service timed out after %ss", self.timeout)
            raise ResearchUnavailable("The Research service timed out.") from exc
        except httpx.HTTPError as exc:
            logger.error("Research service unavailable: %s", exc)
            raise ResearchUnavailable("The Research service could not be reached.") from exc

        if response.status_code != 200:
            logger.error("Research service returned HTTP %s", response.status_code)
            raise ResearchUnavailable(
                f"The Research service returned an error (HTTP {response.status_code})."
            )

        try:
            payload = response.json()
        except ValueError as exc:
            raise ResearchUnavailable("The Research service returned an invalid response.") from exc

        result = payload.get("result")
        if not isinstance(result, dict):
            raise ResearchUnavailable("The Research service returned an unexpected payload.")

        logger.info("Research service responded successfully")
        return {
            "result": result,
            "generated": bool(payload.get("generated", True)),
        }

    @staticmethod
    def render(result: dict[str, Any]) -> str:
        """Flatten a research report into prompt context."""
        parts: list[str] = []
        if result.get("summary"):
            parts.append(f"Summary:\n{result['summary']}")
        if result.get("key_findings"):
            parts.append("Key findings:\n- " + "\n- ".join(result["key_findings"]))
        if result.get("insights"):
            parts.append("Insights:\n- " + "\n- ".join(result["insights"]))
        if result.get("analysis"):
            parts.append(f"Analysis:\n{result['analysis']}")
        if result.get("conclusion"):
            parts.append(f"Conclusion:\n{result['conclusion']}")
        return "\n\n".join(parts)


@lru_cache(maxsize=1)
def get_research_client() -> ResearchClient:
    return ResearchClient()
