"""Researcher -> Analyst -> Reviewer."""
from __future__ import annotations

import logging
import time
from functools import lru_cache

from app.agents import AnalystAgent, ResearcherAgent, ReviewerAgent
from app.models import Depth, ResearchResponse, ResearchResult
from app.services import LLMError, get_llm_client
from app.workflows.offline import offline_report

logger = logging.getLogger(__name__)


class ResearchWorkflow:
    """Runs the three research agents in sequence."""

    def __init__(self) -> None:
        self.researcher = ResearcherAgent()
        self.analyst = AnalystAgent()
        self.reviewer = ReviewerAgent()
        self.llm = get_llm_client()

    async def run(self, topic: str, depth: Depth) -> ResearchResponse:
        started = time.perf_counter()

        if not self.llm.available:
            logger.warning(
                "No LLM credentials configured; returning an offline preview report."
            )
            result = offline_report(topic, depth)
            return ResearchResponse(
                status="completed",
                topic=topic,
                depth=depth,
                result=result,
                duration_ms=int((time.perf_counter() - started) * 1000),
                model=self.llm.model,
                generated=False,
            )

        logger.info("Research workflow started | topic=%r depth=%s", topic, depth.value)

        notes = await self.researcher.run(topic, depth)
        analysis = await self.analyst.run(topic, ResearcherAgent.render(notes))
        report = await self.reviewer.run(topic, AnalystAgent.render(analysis))

        # The reviewer occasionally trims a section; fall back to upstream output
        # rather than returning an empty report.
        summary = report["summary"] or analysis["analysis"][:600]
        body = report["analysis"] or analysis["analysis"]
        findings = report["key_findings"] or analysis["key_findings"]
        if not summary or not body:
            raise LLMError("The workflow produced an incomplete report.")

        result = ResearchResult(
            summary=summary,
            key_findings=findings,
            analysis=body,
            insights=report["insights"],
            conclusion=report["conclusion"],
            limitations=report["limitations"]
            or (
                "This report reflects the model's training knowledge rather than "
                "live sources. No internet search was performed."
            ),
        )

        duration_ms = int((time.perf_counter() - started) * 1000)
        logger.info("Research workflow completed | topic=%r in %dms", topic, duration_ms)
        return ResearchResponse(
            status="completed",
            topic=topic,
            depth=depth,
            result=result,
            duration_ms=duration_ms,
            model=self.llm.model,
            generated=True,
        )


@lru_cache(maxsize=1)
def get_workflow() -> ResearchWorkflow:
    return ResearchWorkflow()
