"""Shared agent scaffolding for the Research workflow."""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from app.services import LLMClient, get_llm_client

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class AgentProfile:
    """Public description of an agent, surfaced through /metadata."""

    id: str
    name: str
    role: str
    description: str
    next_agent: str | None = None


class Agent:
    """Base class holding the LLM handle and the public profile.

    System prompts stay internal: they are never included in API responses.
    """

    profile: AgentProfile
    system_prompt: str = ""

    def __init__(self, llm: LLMClient | None = None) -> None:
        self.llm = llm or get_llm_client()

    async def _complete_json(self, prompt: str, *, max_tokens: int = 2000) -> dict[str, Any]:
        logger.info("Agent '%s' started", self.profile.id)
        result = await self.llm.complete_json(
            system=self.system_prompt,
            prompt=prompt,
            max_tokens=max_tokens,
        )
        logger.info("Agent '%s' completed", self.profile.id)
        return result

    @staticmethod
    def as_list(value: Any, *, limit: int = 12) -> list[str]:
        """Coerce a model field into a clean list of strings."""
        if isinstance(value, str):
            items = [line.strip(" -*\t") for line in value.splitlines()]
        elif isinstance(value, list):
            items = []
            for item in value:
                if isinstance(item, str):
                    items.append(item)
                elif isinstance(item, dict):
                    # Models sometimes emit [{"finding": "..."}] instead of strings.
                    items.append(" ".join(str(v) for v in item.values() if v))
                else:
                    items.append(str(item))
        else:
            items = []
        return [item.strip() for item in items if item and item.strip()][:limit]

    @staticmethod
    def as_text(value: Any) -> str:
        if isinstance(value, str):
            return value.strip()
        if isinstance(value, list):
            return "\n\n".join(str(item).strip() for item in value if item)
        if isinstance(value, dict):
            return "\n\n".join(f"{k}: {v}" for k, v in value.items())
        return "" if value is None else str(value)
