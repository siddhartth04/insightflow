"""Analyst agent: turns research notes into structured analysis."""
from __future__ import annotations

from typing import Any

from app.agents.base import Agent, AgentProfile


class AnalystAgent(Agent):
    profile = AgentProfile(
        id="analyst",
        name="Analyst",
        role="Identify themes and structure findings",
        description=(
            "Reads the research notes, identifies themes and relationships, and "
            "produces a structured analysis with explicit findings."
        ),
        next_agent="reviewer",
    )

    system_prompt = (
        "You are an analyst. Work only from the research notes you are given. "
        "Identify the themes that actually carry weight, state the relationships "
        "between them, and write an analysis that a decision-maker could act on. "
        "Do not invent statistics or sources. Prefer precise claims over hedged ones."
    )

    async def run(self, topic: str, notes: str) -> dict[str, Any]:
        prompt = (
            f"Topic: {topic}\n\nResearch notes:\n{notes}\n\n"
            "Return JSON with this exact shape:\n"
            "{\n"
            '  "themes": [{"title": "string", "explanation": "string"}],\n'
            '  "key_findings": ["string"],\n'
            '  "relationships": ["string"],\n'
            '  "analysis": "string (several paragraphs, markdown allowed)"\n'
            "}"
        )
        raw = await self._complete_json(prompt, max_tokens=2600)

        themes: list[dict[str, str]] = []
        for item in raw.get("themes") or []:
            if isinstance(item, dict):
                title = self.as_text(item.get("title") or item.get("name"))
                explanation = self.as_text(item.get("explanation") or item.get("description"))
            else:
                title, explanation = self.as_text(item), ""
            if title or explanation:
                themes.append({"title": title or "Theme", "explanation": explanation})

        return {
            "themes": themes[:8],
            "key_findings": self.as_list(raw.get("key_findings"), limit=10),
            "relationships": self.as_list(raw.get("relationships"), limit=8),
            "analysis": self.as_text(raw.get("analysis")),
        }

    @staticmethod
    def render(analysis: dict[str, Any]) -> str:
        lines: list[str] = []
        for theme in analysis.get("themes", []):
            lines.append(f"## {theme['title']}\n{theme['explanation']}")
        if analysis.get("key_findings"):
            lines.append("Findings:\n- " + "\n- ".join(analysis["key_findings"]))
        if analysis.get("relationships"):
            lines.append("Relationships:\n- " + "\n- ".join(analysis["relationships"]))
        if analysis.get("analysis"):
            lines.append(f"Analysis:\n{analysis['analysis']}")
        return "\n\n".join(lines)
