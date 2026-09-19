"""Request and response contracts for the Research service."""
from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field, field_validator


class Depth(str, Enum):
    """How much ground the workflow should cover."""

    quick = "quick"
    standard = "standard"
    deep = "deep"


class ResearchRequest(BaseModel):
    topic: str = Field(
        ...,
        min_length=3,
        max_length=500,
        description="The question or subject to research.",
        examples=["Impact of AI agents on software development"],
    )
    depth: Depth = Field(
        default=Depth.standard,
        description="Quick for a fast pass, deep for a broader investigation.",
    )

    @field_validator("topic")
    @classmethod
    def topic_not_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 3:
            raise ValueError("Topic must contain at least 3 characters.")
        return cleaned


class ResearchResult(BaseModel):
    summary: str = Field(..., description="Executive summary of the report.")
    key_findings: list[str] = Field(default_factory=list)
    analysis: str = Field(..., description="Detailed analysis section.")
    insights: list[str] = Field(default_factory=list)
    conclusion: str = ""
    limitations: str = ""


class ResearchResponse(BaseModel):
    status: str = Field(default="completed", examples=["completed"])
    topic: str
    depth: Depth = Depth.standard
    result: ResearchResult
    duration_ms: int = Field(default=0, description="Wall-clock duration of the workflow.")
    model: str = Field(default="", description="Model identifier used for this run.")
    generated: bool = Field(
        default=True,
        description="False when the service produced a deterministic offline preview.",
    )


class AgentInfo(BaseModel):
    id: str
    name: str
    role: str
    description: str
    next_agent: str | None = None


class MetadataResponse(BaseModel):
    module_id: str
    module_name: str
    version: str
    status: str
    agents: list[str]
    agent_details: list[AgentInfo]
    model: str
    llm_available: bool


class HealthResponse(BaseModel):
    status: str
    module: str
    version: str
    llm_available: bool


class ErrorResponse(BaseModel):
    detail: str
