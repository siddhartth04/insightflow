"""Strategist: decides audience, angle, tone, structure and key message."""
from __future__ import annotations

from typing import Any

from app.agents.base import Agent, AgentProfile

_FORMAT_BRIEF = {
    "linkedin": "A LinkedIn post: 150-250 words, a strong opening line, short paragraphs, no hashtag spam.",
    "technical_article": "A technical article: 700-1000 words, clear section headings, precise and concrete.",
    "blog_post": "A blog post: 600-900 words, an engaging hook, accessible but substantive.",
    "product_description": "A product description: 120-200 words, benefit-led, concrete rather than salesy.",
    "research_summary": "A research summary: 400-600 words, findings first, neutral register.",
}


class StrategistAgent(Agent):
    profile = AgentProfile(
        id="strategist",
        name="Strategist",
        role="Set audience, angle, tone and structure",
        description=(
            "Decides who the content is for, the angle worth taking, the tone to "
            "hold, the structure to follow and the single key message."
        ),
        next_agent="writer",
    )

    system_prompt = (
        "You are a content strategist. Given source material and a format, decide "
        "the audience, the angle, the tone, the structure and the one message the "
        "reader should leave with. Be specific: 'senior backend engineers evaluating "
        "retrieval systems' beats 'technical people'."
    )

    async def run(
        self,
        topic: str,
        material: str,
        content_type: str,
        tone: str,
        audience: str | None = None,
    ) -> dict[str, Any]:
        brief = _FORMAT_BRIEF.get(content_type, "")
        audience_hint = f"\nRequested audience: {audience}" if audience else ""
        prompt = (
            f"Topic: {topic}\nFormat: {brief}\nRequested tone: {tone}{audience_hint}\n\n"
            f"Source material:\n{material}\n\n"
            "Return JSON with this exact shape:\n"
            "{\n"
            '  "audience": "string",\n'
            '  "angle": "string",\n'
            '  "tone": "string",\n'
            '  "structure": ["string (ordered sections)"],\n'
            '  "key_message": "string"\n'
            "}"
        )
        raw = await self._complete_json(prompt, max_tokens=1200)
        return {
            "audience": self.as_text(raw.get("audience")) or (audience or "General readers"),
            "angle": self.as_text(raw.get("angle")),
            "tone": self.as_text(raw.get("tone")) or tone,
            "structure": self.as_list(raw.get("structure"), limit=10),
            "key_message": self.as_text(raw.get("key_message")),
        }

    @staticmethod
    def render(strategy: dict[str, Any]) -> str:
        lines = [
            f"Audience: {strategy['audience']}",
            f"Angle: {strategy['angle']}",
            f"Tone: {strategy['tone']}",
            f"Key message: {strategy['key_message']}",
        ]
        if strategy.get("structure"):
            lines.append("Structure:\n- " + "\n- ".join(strategy["structure"]))
        return "\n".join(lines)


FORMAT_BRIEF = _FORMAT_BRIEF
