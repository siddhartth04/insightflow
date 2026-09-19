"""Request and response contracts for the Content service."""
from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field, field_validator


class ContentType(str, Enum):
    linkedin = "linkedin"
    technical_article = "technical_article"
    blog_post = "blog_post"
    product_description = "product_description"
    research_summary = "research_summary"


CONTENT_TYPE_LABELS: dict[ContentType, str] = {
    ContentType.linkedin: "LinkedIn Post",
    ContentType.technical_article: "Technical Article",
    ContentType.blog_post: "Blog Post",
    ContentType.product_description: "Product Description",
    ContentType.research_summary: "Research Summary",
}


class Tone(str, Enum):
    professional = "professional"
    conversational = "conversational"
    authoritative = "authoritative"
    friendly = "friendly"
    technical = "technical"


class ContentRequest(BaseModel):
    topic: str = Field(
        ...,
        min_length=3,
        max_length=500,
        description="What the content should be about.",
        examples=["Explain RAG to software engineers"],
    )
    content_type: ContentType = Field(
        default=ContentType.linkedin,
        description="The format to produce.",
    )
    tone: Tone = Field(default=Tone.professional)
    use_research: bool = Field(
        default=False,
        description=(
            "When true, the Content service calls the Research service over HTTP "
            "and grounds the content in the resulting report."
        ),
    )
    audience: str | None = Field(
        default=None,
        max_length=200,
        description="Optional audience hint, e.g. 'senior backend engineers'.",
    )

    @field_validator("topic")
    @classmethod
    def topic_not_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 3:
            raise ValueError("Topic must contain at least 3 characters.")
        return cleaned


class ContentStrategy(BaseModel):
    audience: str = ""
    angle: str = ""
    tone: str = ""
    structure: list[str] = Field(default_factory=list)
    key_message: str = ""


class ContentResult(BaseModel):
    title: str
    body: str = Field(..., description="The final content, formatted as markdown.")
    strategy: ContentStrategy = Field(default_factory=ContentStrategy)
    editor_notes: list[str] = Field(
        default_factory=list, description="What the Editor changed and why."
    )
    word_count: int = 0


class ContentResponse(BaseModel):
    status: str = Field(default="completed", examples=["completed"])
    topic: str
    content_type: ContentType
    tone: Tone
    used_research: bool = Field(
        default=False,
        description="True when a Research report actually informed this run.",
    )
    research_error: str | None = Field(
        default=None,
        description="Set when research was requested but unavailable; the run continues without it.",
    )
    result: ContentResult
    duration_ms: int = 0
    model: str = ""
    generated: bool = True


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
    content_types: list[dict[str, str]]
    tones: list[str]
    model: str
    llm_available: bool
    research_service_url: str
    research_available: bool


class HealthResponse(BaseModel):
    status: str
    module: str
    version: str
    llm_available: bool
    research_reachable: bool


class ErrorResponse(BaseModel):
    detail: str
