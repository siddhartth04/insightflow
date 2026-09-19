"""HTTP surface for the Content service."""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status

from app.agents import AGENT_PROFILES
from app.config import get_settings
from app.models import (
    AgentInfo,
    ContentRequest,
    ContentResponse,
    ContentType,
    HealthResponse,
    MetadataResponse,
    Tone,
    CONTENT_TYPE_LABELS,
)
from app.services import LLMError, get_llm_client, get_research_client
from app.workflows import get_workflow

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["system"])
async def health() -> HealthResponse:
    """Liveness probe. Also reports whether the Research dependency is reachable."""
    settings = get_settings()
    return HealthResponse(
        status="healthy",
        module=settings.module_id,
        version=settings.version,
        llm_available=get_llm_client().available,
        research_reachable=await get_research_client().is_healthy(),
    )


@router.get("/metadata", response_model=MetadataResponse, tags=["system"])
async def metadata() -> MetadataResponse:
    """Describe the module, its agents and the formats it can produce."""
    settings = get_settings()
    return MetadataResponse(
        module_id=settings.module_id,
        module_name=settings.module_name,
        version=settings.version,
        status="online",
        agents=[profile.id for profile in AGENT_PROFILES],
        agent_details=[
            AgentInfo(
                id=profile.id,
                name=profile.name,
                role=profile.role,
                description=profile.description,
                next_agent=profile.next_agent,
            )
            for profile in AGENT_PROFILES
        ],
        content_types=[
            {"id": content_type.value, "label": CONTENT_TYPE_LABELS[content_type]}
            for content_type in ContentType
        ],
        tones=[tone.value for tone in Tone],
        model=settings.llm_model,
        llm_available=get_llm_client().available,
        research_service_url=settings.research_service_url,
        research_available=await get_research_client().is_healthy(),
    )


@router.post(
    "/run",
    response_model=ContentResponse,
    tags=["content"],
    responses={
        422: {"description": "The request failed validation."},
        502: {"description": "The language model could not complete the workflow."},
    },
)
async def run_content(request: ContentRequest) -> ContentResponse:
    """Run the Researcher -> Strategist -> Writer -> Editor workflow."""
    logger.info(
        "Content request received | topic=%r type=%s",
        request.topic,
        request.content_type.value,
    )
    try:
        return await get_workflow().run(request)
    except LLMError as exc:
        logger.error("Content workflow failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The language model could not complete the content workflow.",
        ) from exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Unexpected content failure")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The content workflow failed unexpectedly.",
        ) from exc
