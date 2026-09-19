"""InsightFlow — Content service entrypoint."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import router
from app.config import get_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)-5s %(name)s | %(message)s",
)
logger = logging.getLogger("insightflow.content")

settings = get_settings()

@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    logger.info(
        "Content service ready | model=%s llm_available=%s research_url=%s",
        settings.llm_model,
        settings.has_credentials and not settings.offline_mode,
        settings.research_service_url,
    )
    if not settings.has_credentials:
        logger.warning(
            "No LLM credentials found. /run will return preview output until a "
            "provider key or LITELLM_BASE_URL is configured."
        )
    yield


app = FastAPI(
    title="InsightFlow — Content Service",
    description=(
        "Turns a topic into polished content using a "
        "Researcher -> Strategist -> Writer -> Editor agent workflow. "
        "Can optionally ground the content in the Research service over HTTP."
    ),
    version=settings.version,
    docs_url="/docs",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins or ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    """Return a readable message instead of a nested validation tree."""
    first = exc.errors()[0] if exc.errors() else {}
    field = ".".join(str(part) for part in first.get("loc", ()) if part != "body")
    message = first.get("msg", "The request was invalid.")
    message = message.removeprefix("Value error, ")
    detail = f"{field}: {message}" if field else message
    return JSONResponse(status_code=422, content={"detail": detail})
