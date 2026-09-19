"""Writer: produces the draft from the strategy brief."""
from __future__ import annotations

from typing import Any

from app.agents.base import Agent, AgentProfile
from app.agents.strategist import FORMAT_BRIEF


class WriterAgent(Agent):
    profile = AgentProfile(
        id="writer",
        name="Writer",
        role="Write the draft",
        description=(
            "Turns the strategy and source material into a complete draft that "
            "follows the chosen structure and format."
        ),
        next_agent="editor",
    )

    system_prompt = (
        "You are a skilled writer. Follow the strategy brief exactly: hold the "
        "stated tone, write for the stated audience, and follow the given structure. "
        "Write in markdown. Be concrete and specific; avoid filler, throat-clearing "
        "openings and marketing cliche. Never invent statistics, quotes or sources."
    )

    async def run(
        self,
        topic: str,
        material: str,
        strategy: str,
        content_type: str,
    ) -> dict[str, Any]:
        prompt = (
            f"Topic: {topic}\n"
            f"Format: {FORMAT_BRIEF.get(content_type, '')}\n\n"
            f"Strategy brief:\n{strategy}\n\n"
            f"Source material:\n{material}\n\n"
            "Write the full draft. Return JSON with this exact shape:\n"
            "{\n"
            '  "title": "string",\n'
            '  "body": "string (the full content in markdown)"\n'
            "}"
        )
        raw = await self._complete_json(prompt, max_tokens=3600)
        return {
            "title": self.as_text(raw.get("title")) or topic,
            "body": self.as_text(raw.get("body")),
        }
