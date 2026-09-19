"""Reviewer agent: sharpens the analysis into the final report."""
from __future__ import annotations

from typing import Any

from app.agents.base import Agent, AgentProfile


class ReviewerAgent(Agent):
    profile = AgentProfile(
        id="reviewer",
        name="Reviewer",
        role="Review, sharpen and finalize the report",
        description=(
            "Checks the analysis for weak or inconsistent conclusions, improves "
            "clarity, and assembles the final research report."
        ),
        next_agent=None,
    )

    system_prompt = (
        "You are a senior reviewer producing a final research report. Tighten "
        "loose reasoning, drop unsupported conclusions, and make the writing clear "
        "and direct. The report is based on model knowledge rather than live "
        "sources, and the limitations section must say so plainly. Never fabricate "
        "citations, URLs or figures."
    )

    async def run(self, topic: str, analysis: str) -> dict[str, Any]:
        prompt = (
            f"Topic: {topic}\n\nAnalysis to review:\n{analysis}\n\n"
            "Produce the final report. Return JSON with this exact shape:\n"
            "{\n"
            '  "summary": "string (3-5 sentence executive summary)",\n'
            '  "key_findings": ["string (5-7 findings)"],\n'
            '  "analysis": "string (the detailed analysis, markdown allowed)",\n'
            '  "insights": ["string (3-5 non-obvious insights)"],\n'
            '  "conclusion": "string",\n'
            '  "limitations": "string (state that this reflects model knowledge, '
            'not live sources)"\n'
            "}"
        )
        raw = await self._complete_json(prompt, max_tokens=3000)
        return {
            "summary": self.as_text(raw.get("summary")),
            "key_findings": self.as_list(raw.get("key_findings"), limit=10),
            "analysis": self.as_text(raw.get("analysis")),
            "insights": self.as_list(raw.get("insights"), limit=8),
            "conclusion": self.as_text(raw.get("conclusion")),
            "limitations": self.as_text(raw.get("limitations")),
        }
