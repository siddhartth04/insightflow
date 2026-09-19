"""Researcher -> Strategist -> Writer -> Editor."""
from __future__ import annotations

import logging
import time
from functools import lru_cache

from app.agents import (
    ContentResearcherAgent,
    EditorAgent,
    StrategistAgent,
    WriterAgent,
)
from app.models import ContentRequest, ContentResponse, ContentResult
from app.models.schemas import ContentStrategy
from app.services import LLMError, ResearchUnavailable, get_llm_client, get_research_client
from app.workflows.offline import offline_content

logger = logging.getLogger(__name__)


class ContentWorkflow:
    """Runs the four content agents in sequence, optionally grounded in research."""

    def __init__(self) -> None:
        self.researcher = ContentResearcherAgent()
        self.strategist = StrategistAgent()
        self.writer = WriterAgent()
        self.editor = EditorAgent()
        self.llm = get_llm_client()
        self.research_client = get_research_client()

    async def run(self, request: ContentRequest) -> ContentResponse:
        started = time.perf_counter()
        topic = request.topic

        if not self.llm.available:
            logger.warning(
                "No LLM credentials configured; returning offline preview content."
            )
            return ContentResponse(
                status="completed",
                topic=topic,
                content_type=request.content_type,
                tone=request.tone,
                used_research=False,
                research_error=None,
                result=offline_content(topic, request.content_type, request.tone),
                duration_ms=int((time.perf_counter() - started) * 1000),
                model=self.llm.model,
                generated=False,
            )

        logger.info(
            "Content workflow started | topic=%r type=%s use_research=%s",
            topic,
            request.content_type.value,
            request.use_research,
        )

        # Optional cross-module step. A research failure degrades the run rather
        # than ending it: the caller still gets content, plus an honest note.
        research_context: str | None = None
        research_error: str | None = None
        used_research = False
        if request.use_research:
            try:
                payload = await self.research_client.research(topic)
                research_context = self.research_client.render(payload["result"])
                used_research = bool(research_context) and payload["generated"]
                if not payload["generated"]:
                    research_error = (
                        "The Research service returned preview output, so the content "
                        "was written without it."
                    )
                    research_context = None
            except ResearchUnavailable as exc:
                logger.error("Research step skipped: %s", exc)
                research_error = f"{exc} The content was written without research."

        material = await self.researcher.run(topic, research_context)
        strategy = await self.strategist.run(
            topic,
            ContentResearcherAgent.render(material),
            request.content_type.value,
            request.tone.value,
            request.audience,
        )
        draft = await self.writer.run(
            topic,
            ContentResearcherAgent.render(material),
            StrategistAgent.render(strategy),
            request.content_type.value,
        )
        if not draft["body"]:
            raise LLMError("The writer produced an empty draft.")

        edited = await self.editor.run(draft["title"], draft["body"], request.tone.value)

        result = ContentResult(
            title=edited["title"],
            body=edited["body"],
            strategy=ContentStrategy(
                audience=strategy["audience"],
                angle=strategy["angle"],
                tone=strategy["tone"],
                structure=strategy["structure"],
                key_message=strategy["key_message"],
            ),
            editor_notes=edited["notes"],
            word_count=len(edited["body"].split()),
        )

        duration_ms = int((time.perf_counter() - started) * 1000)
        logger.info("Content workflow completed | topic=%r in %dms", topic, duration_ms)
        return ContentResponse(
            status="completed",
            topic=topic,
            content_type=request.content_type,
            tone=request.tone,
            used_research=used_research,
            research_error=research_error,
            result=result,
            duration_ms=duration_ms,
            model=self.llm.model,
            generated=True,
        )


@lru_cache(maxsize=1)
def get_workflow() -> ContentWorkflow:
    return ContentWorkflow()
