"""Shared fixtures. Tests run against the service without any provider key."""
from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

for _key in ("OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GEMINI_API_KEY", "LITELLM_BASE_URL"):
    os.environ.pop(_key, None)
os.environ["OFFLINE_MODE"] = "true"
os.environ["RESEARCH_SERVICE_URL"] = "http://research-test:8001"


@pytest.fixture(scope="session")
def client() -> TestClient:
    from app.main import app

    return TestClient(app)


@pytest.fixture
def stub_llm(monkeypatch):
    """Drive the four agents with a stubbed model so the real path is covered."""
    from app.workflows import get_workflow

    workflow = get_workflow()
    monkeypatch.setattr(type(workflow.llm), "available", property(lambda self: True))

    async def fake_complete_json(self, *, system, prompt, temperature=None, max_tokens=None):
        if "key_points" in prompt:
            return {
                "key_points": ["Retrieval grounds generation."],
                "examples": ["A support bot citing internal docs."],
                "terminology": ["embedding"],
                "misconceptions": ["RAG removes the need for evaluation."],
            }
        if "key_message" in prompt:
            return {
                "audience": "Senior backend engineers",
                "angle": "Practical trade-offs",
                "tone": "professional",
                "structure": ["Hook", "How it works", "Trade-offs"],
                "key_message": "Retrieval quality bounds answer quality.",
            }
        if "notes" in prompt:
            return {
                "title": "Understanding RAG",
                "body": "# Understanding RAG\n\nEdited body with real substance.",
                "notes": ["Tightened the opening.", "Removed repetition."],
            }
        return {"title": "RAG draft", "body": "# RAG draft\n\nDraft body."}

    monkeypatch.setattr(type(workflow.llm), "complete_json", fake_complete_json)
    return workflow
