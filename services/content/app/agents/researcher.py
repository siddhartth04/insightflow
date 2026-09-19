"""Content Researcher: gathers the material the content will be built from."""
from __future__ import annotations

from typing import Any

from app.agents.base import Agent, AgentProfile


class ContentResearcherAgent(Agent):
    profile = AgentProfile(
        id="researcher",
        name="Researcher",
        role="Understand the topic and gather material",
        description=(
            "Establishes what the topic actually involves and collects the points, "
            "examples and terminology the content will draw on."
        ),
        next_agent="strategist",
    )

    system_prompt = (
        "You prepare source material for a writer. You work from your own knowledge "
        "and have no internet access, so never cite URLs, studies or statistics you "
        "cannot vouch for. Collect the points that matter, note concrete examples, "
        "and flag anything commonly misunderstood about the topic."
    )

    async def run(self, topic: str, research_context: str | None = None) -> dict[str, Any]:
        context = (
            f"\n\nA research report on this topic is available. Build on it rather than "
            f"repeating it:\n{research_context}"
            if research_context
            else ""
        )
        prompt = (
            f"Topic: {topic}{context}\n\n"
            "Return JSON with this exact shape:\n"
            "{\n"
            '  "key_points": ["string"],\n'
            '  "examples": ["string"],\n'
            '  "terminology": ["string"],\n'
            '  "misconceptions": ["string"]\n'
            "}"
        )
        raw = await self._complete_json(prompt, max_tokens=1600)
        return {
            "key_points": self.as_list(raw.get("key_points"), limit=10),
            "examples": self.as_list(raw.get("examples"), limit=6),
            "terminology": self.as_list(raw.get("terminology"), limit=8),
            "misconceptions": self.as_list(raw.get("misconceptions"), limit=5),
        }

    @staticmethod
    def render(material: dict[str, Any]) -> str:
        parts: list[str] = []
        for label, key in (
            ("Key points", "key_points"),
            ("Examples", "examples"),
            ("Terminology", "terminology"),
            ("Common misconceptions", "misconceptions"),
        ):
            if material.get(key):
                parts.append(f"{label}:\n- " + "\n- ".join(material[key]))
        return "\n\n".join(parts)
