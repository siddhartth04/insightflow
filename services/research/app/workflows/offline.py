"""Deterministic preview output used when no LLM credentials are configured.

This keeps the interface fully explorable during local development. Responses
carry `generated: false` so the frontend can label them as previews rather than
presenting them as real analysis.
"""
from __future__ import annotations

from app.models import Depth, ResearchResult

_NOTICE = (
    "**Preview mode.** No LLM credentials are configured, so this is placeholder "
    "structure rather than real analysis. Set `OPENAI_API_KEY` (or another "
    "provider key supported by LiteLLM) in your `.env` and run the workflow again "
    "to get a generated report."
)

_DEPTH_SECTIONS = {
    Depth.quick: 3,
    Depth.standard: 5,
    Depth.deep: 7,
}


def offline_report(topic: str, depth: Depth) -> ResearchResult:
    sections = _DEPTH_SECTIONS[depth]
    return ResearchResult(
        summary=(
            f"{_NOTICE}\n\nA completed run would open with a three-to-five sentence "
            f"executive summary of **{topic}**, written after the Researcher, Analyst "
            "and Reviewer agents have each passed over the material."
        ),
        key_findings=[
            f"Finding {i + 1} — the Analyst agent produces one substantiated claim here."
            for i in range(sections)
        ],
        analysis=(
            f"### Detailed analysis\n\nThe Researcher agent decomposes *{topic}* into "
            f"{sections} subtopics and writes notes for each. The Analyst groups those "
            "notes into themes and states the relationships between them. The Reviewer "
            "then removes weak conclusions and tightens the prose.\n\n"
            "This preview shows the shape of that output; the narrative itself is "
            "produced by the model at run time."
        ),
        insights=[
            "Insights call out the non-obvious consequences of the findings.",
            "The Reviewer drops any claim the analysis does not support.",
            "Depth controls how much ground the Researcher covers.",
        ],
        conclusion=(
            "The conclusion ties the findings back to the original question and states "
            "what follows from them."
        ),
        limitations=(
            "This is preview output, not a generated report. Reports from this service "
            "reflect the model's training knowledge rather than live sources — no "
            "internet search is performed."
        ),
    )
