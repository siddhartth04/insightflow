"""Validation, workflow success, research dependency, and failure handling."""
from __future__ import annotations

import httpx
import pytest

from app.services import LLMError, ResearchUnavailable


# --- validation ----------------------------------------------------------


def test_run_rejects_a_missing_topic(client):
    assert client.post("/run", json={}).status_code == 422


def test_run_rejects_an_empty_topic(client):
    response = client.post("/run", json={"topic": "   "})

    assert response.status_code == 422
    assert isinstance(response.json()["detail"], str)


def test_run_rejects_an_invalid_content_type(client):
    response = client.post("/run", json={"topic": "RAG systems", "content_type": "tweet"})
    assert response.status_code == 422


def test_run_rejects_an_invalid_tone(client):
    response = client.post("/run", json={"topic": "RAG systems", "tone": "sarcastic"})
    assert response.status_code == 422


@pytest.mark.parametrize(
    "content_type",
    ["linkedin", "technical_article", "blog_post", "product_description", "research_summary"],
)
def test_run_accepts_every_supported_content_type(client, content_type):
    response = client.post(
        "/run", json={"topic": "Explain RAG to engineers", "content_type": content_type}
    )

    assert response.status_code == 200
    assert response.json()["content_type"] == content_type


# --- preview mode --------------------------------------------------------


def test_run_returns_a_complete_content_shape(client):
    body = client.post("/run", json={"topic": "Explain RAG to engineers"}).json()

    assert body["status"] == "completed"
    result = body["result"]
    assert result["title"]
    assert result["body"]
    assert result["word_count"] > 0
    assert "strategy" in result


def test_run_without_credentials_is_flagged_as_not_generated(client):
    body = client.post("/run", json={"topic": "Explain RAG to engineers"}).json()
    assert body["generated"] is False


# --- generated path ------------------------------------------------------


def test_run_returns_generated_content_when_the_model_succeeds(client, stub_llm):
    body = client.post("/run", json={"topic": "Explain RAG to engineers"}).json()

    assert body["generated"] is True
    assert body["result"]["title"] == "Understanding RAG"
    assert "Edited body" in body["result"]["body"]
    assert body["result"]["strategy"]["audience"] == "Senior backend engineers"
    assert body["result"]["editor_notes"]


def test_run_without_research_never_calls_the_research_service(client, stub_llm, monkeypatch):
    async def fail(self, topic, depth="standard"):
        raise AssertionError("Research must not be called when use_research is false.")

    monkeypatch.setattr(type(stub_llm.research_client), "research", fail)

    body = client.post(
        "/run", json={"topic": "Explain RAG to engineers", "use_research": False}
    ).json()

    assert body["used_research"] is False
    assert body["research_error"] is None


# --- research dependency -------------------------------------------------


def test_run_with_research_uses_the_research_report(client, stub_llm, monkeypatch):
    calls: list[str] = []

    async def fake_research(self, topic, depth="standard"):
        calls.append(topic)
        return {
            "result": {
                "summary": "RAG grounds answers in retrieved context.",
                "key_findings": ["Retrieval quality dominates."],
                "insights": ["Chunking strategy matters."],
                "analysis": "Detailed analysis.",
                "conclusion": "Evaluate retrieval separately.",
            },
            "generated": True,
        }

    monkeypatch.setattr(type(stub_llm.research_client), "research", fake_research)

    body = client.post(
        "/run", json={"topic": "Explain RAG to engineers", "use_research": True}
    ).json()

    assert calls == ["Explain RAG to engineers"]
    assert body["used_research"] is True
    assert body["research_error"] is None


def test_run_degrades_gracefully_when_research_is_unavailable(client, stub_llm, monkeypatch):
    async def unavailable(self, topic, depth="standard"):
        raise ResearchUnavailable("The Research service could not be reached.")

    monkeypatch.setattr(type(stub_llm.research_client), "research", unavailable)

    response = client.post(
        "/run", json={"topic": "Explain RAG to engineers", "use_research": True}
    )
    body = response.json()

    # A research outage must not fail the whole run.
    assert response.status_code == 200
    assert body["used_research"] is False
    assert "could not be reached" in body["research_error"]
    assert body["result"]["body"]


def test_run_ignores_research_preview_output(client, stub_llm, monkeypatch):
    async def preview(self, topic, depth="standard"):
        return {"result": {"summary": "Preview."}, "generated": False}

    monkeypatch.setattr(type(stub_llm.research_client), "research", preview)

    body = client.post(
        "/run", json={"topic": "Explain RAG to engineers", "use_research": True}
    ).json()

    # Preview research is not real grounding and must not be claimed as such.
    assert body["used_research"] is False
    assert body["research_error"]


def test_run_returns_502_when_the_model_fails(client, stub_llm, monkeypatch):
    async def boom(self, *, system, prompt, temperature=None, max_tokens=None):
        raise LLMError("provider exploded")

    monkeypatch.setattr(type(stub_llm.llm), "complete_json", boom)

    response = client.post("/run", json={"topic": "Explain RAG to engineers"})

    assert response.status_code == 502
    assert "provider exploded" not in response.json()["detail"]


# --- research client -----------------------------------------------------


@pytest.mark.asyncio
async def test_research_client_maps_timeouts_to_research_unavailable(monkeypatch):
    from app.services import get_research_client

    async def timeout(*args, **kwargs):
        raise httpx.TimeoutException("timed out")

    monkeypatch.setattr(httpx.AsyncClient, "post", timeout)

    with pytest.raises(ResearchUnavailable, match="timed out"):
        await get_research_client().research("RAG")


@pytest.mark.asyncio
async def test_research_client_maps_error_status_to_research_unavailable(monkeypatch):
    from app.services import get_research_client

    async def server_error(*args, **kwargs):
        return httpx.Response(500, json={"detail": "boom"})

    monkeypatch.setattr(httpx.AsyncClient, "post", server_error)

    with pytest.raises(ResearchUnavailable, match="HTTP 500"):
        await get_research_client().research("RAG")


@pytest.mark.asyncio
async def test_research_client_health_probe_is_false_when_unreachable(monkeypatch):
    from app.services import get_research_client

    async def unreachable(*args, **kwargs):
        raise httpx.ConnectError("no route")

    monkeypatch.setattr(httpx.AsyncClient, "get", unreachable)

    assert await get_research_client().is_healthy() is False
