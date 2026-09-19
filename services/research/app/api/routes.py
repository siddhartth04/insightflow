"""HTTP surface for the Research service."""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status

from app.agents import AGENT_PROFILES
from app.config import get_settings
from app.models import (
    AgentInfo,
    HealthResponse,
    MetadataResponse,
    ResearchRequest,
    ResearchResponse,
)
from app.services import LLMError, RateLimited, get_llm_client
from app.workflows import get_workflow

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["system"])
async def health() -> HealthResponse:
    """Liveness probe used by the reverse proxy and the Services page."""
    settings = get_settings()
    return HealthResponse(
        status="healthy",
        module=settings.module_id,
        version=settings.version,
        llm_available=get_llm_client().available,
    )


@router.get("/metadata", response_model=MetadataResponse, tags=["system"])
async def metadata() -> MetadataResponse:
    """Describe the module and the agents in its workflow."""
    settings = get_settings()
    llm = get_llm_client()
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
        model=settings.llm_model,
        llm_available=llm.available,
    )


@router.post(
    "/run",
    response_model=ResearchResponse,
    tags=["research"],
    responses={
        422: {"description": "The request failed validation."},
        429: {"description": "The model provider rate limit was exceeded."},
        502: {"description": "The language model could not complete the workflow."},
    },
)
async def run_research(request: ResearchRequest) -> ResearchResponse:
    """Run the Researcher -> Analyst -> Reviewer workflow."""
    logger.info("Research request received | topic=%r", request.topic)
    try:
        return await get_workflow().run(request.topic, request.depth)
    except RateLimited as exc:
        logger.warning("Research workflow rate limited: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(exc),
        ) from exc
    except LLMError as exc:
        logger.error("Research workflow failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The language model could not complete the research workflow.",
        ) from exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Unexpected research failure")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The research workflow failed unexpectedly.",
        ) from exc
