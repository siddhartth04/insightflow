"""Researcher agent: decomposes a topic into structured research notes."""
from __future__ import annotations

from typing import Any

from app.agents.base import Agent, AgentProfile
from app.models import Depth

_DEPTH_GUIDANCE = {
    Depth.quick: "Cover 3 subtopics. Keep notes tight and high-signal.",
    Depth.standard: "Cover 4 to 5 subtopics with substantive notes for each.",
    Depth.deep: "Cover 6 to 7 subtopics, including second-order effects and counterarguments.",
}


class ResearcherAgent(Agent):
    profile = AgentProfile(
        id="researcher",
        name="Researcher",
        role="Research and organize information",
        description=(
            "Breaks the topic into subtopics, produces research notes and "
            "identifies the concepts that matter for analysis."
        ),
        next_agent="analyst",
    )

    system_prompt = (
        "You are a rigorous research assistant. You work from your own knowledge; "
        "you do not have internet access and must never imply that you browsed sources "
        "or cite URLs, papers or statistics you cannot vouch for. Decompose the topic "
        "into subtopics, write substantive notes for each, and surface the key concepts "
        "an analyst would need. Be concrete and avoid filler."
    )

    async def run(self, topic: str, depth: Depth) -> dict[str, Any]:
        prompt = (
            f"Topic: {topic}\n"
            f"Depth: {depth.value}. {_DEPTH_GUIDANCE[depth]}\n\n"
            "Return JSON with this exact shape:\n"
            "{\n"
            '  "subtopics": [{"title": "string", "notes": "string"}],\n'
            '  "key_concepts": ["string"],\n'
            '  "open_questions": ["string"]\n'
            "}"
        )
        raw = await self._complete_json(prompt, max_tokens=2200)

        subtopics: list[dict[str, str]] = []
        for item in raw.get("subtopics") or []:
            if isinstance(item, dict):
                title = self.as_text(item.get("title") or item.get("name"))
                notes = self.as_text(item.get("notes") or item.get("content"))
            else:
                title, notes = self.as_text(item), ""
            if title or notes:
                subtopics.append({"title": title or "Untitled subtopic", "notes": notes})

        return {
            "subtopics": subtopics[:8],
            "key_concepts": self.as_list(raw.get("key_concepts"), limit=10),
            "open_questions": self.as_list(raw.get("open_questions"), limit=8),
        }

    @staticmethod
    def render(notes: dict[str, Any]) -> str:
        """Flatten researcher output into prompt text for the next agent."""
        lines: list[str] = []
        for sub in notes.get("subtopics", []):
            lines.append(f"## {sub['title']}\n{sub['notes']}")
        if notes.get("key_concepts"):
            lines.append("Key concepts: " + "; ".join(notes["key_concepts"]))
        if notes.get("open_questions"):
            lines.append("Open questions: " + "; ".join(notes["open_questions"]))
        return "\n\n".join(lines)
