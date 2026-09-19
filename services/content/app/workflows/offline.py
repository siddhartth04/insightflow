"""Deterministic preview output used when no LLM credentials are configured."""
from __future__ import annotations

from app.models import ContentResult, ContentType, CONTENT_TYPE_LABELS, Tone
from app.models.schemas import ContentStrategy

_NOTICE = (
    "> **Preview mode** — no LLM credentials are configured, so this is placeholder "
    "structure rather than generated content. Set `OPENAI_API_KEY` (or another "
    "provider key supported by LiteLLM) in your `.env` and generate again."
)


def offline_content(topic: str, content_type: ContentType, tone: Tone) -> ContentResult:
    label = CONTENT_TYPE_LABELS[content_type]
    body = (
        f"{_NOTICE}\n\n"
        f"A completed run produces a finished **{label.lower()}** about *{topic}*, "
        f"written in a {tone.value} tone.\n\n"
        "## How it is produced\n\n"
        "1. **Researcher** — gathers the key points, examples and terminology.\n"
        "2. **Strategist** — fixes the audience, angle, tone, structure and key message.\n"
        "3. **Writer** — writes the full draft against that brief.\n"
        "4. **Editor** — tightens grammar, clarity, structure and flow.\n\n"
        "## What you would see here\n\n"
        "The finished piece, formatted and ready to copy or download. With "
        "**Use Research** enabled, the Content service first calls the Research "
        "service over HTTP and grounds the draft in that report."
    )
    return ContentResult(
        title=f"{label}: {topic}",
        body=body,
        strategy=ContentStrategy(
            audience="Set by the Strategist agent at run time",
            angle="Chosen from the source material",
            tone=tone.value,
            structure=["Opening", "Core sections", "Close"],
            key_message="The single point the reader should leave with",
        ),
        editor_notes=["Preview output — the Editor agent did not run."],
        word_count=len(body.split()),
    )
