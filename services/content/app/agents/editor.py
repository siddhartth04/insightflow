"""Editor: the final pass for clarity, consistency and readability."""
from __future__ import annotations

from typing import Any

from app.agents.base import Agent, AgentProfile


class EditorAgent(Agent):
    profile = AgentProfile(
        id="editor",
        name="Editor",
        role="Polish grammar, clarity and structure",
        description=(
            "Improves grammar, clarity, structure and flow, removes repetition and "
            "holds the tone consistent through the final piece."
        ),
        next_agent=None,
    )

    system_prompt = (
        "You are a meticulous editor. Improve grammar, clarity, structure, flow and "
        "readability. Cut repetition and hedging. Keep the author's voice and the "
        "intended tone; do not add new claims or change the substance. Return the "
        "complete edited piece, not a diff or a list of suggestions."
    )

    async def run(self, title: str, body: str, tone: str) -> dict[str, Any]:
        prompt = (
            f"Intended tone: {tone}\n\nDraft title: {title}\n\nDraft body:\n{body}\n\n"
            "Edit the piece. Return JSON with this exact shape:\n"
            "{\n"
            '  "title": "string (refined title)",\n'
            '  "body": "string (the complete edited content in markdown)",\n'
            '  "notes": ["string (what you changed and why, 2-4 items)"]\n'
            "}"
        )
        raw = await self._complete_json(prompt, max_tokens=3600)
        return {
            "title": self.as_text(raw.get("title")) or title,
            "body": self.as_text(raw.get("body")) or body,
            "notes": self.as_list(raw.get("notes"), limit=6),
        }
