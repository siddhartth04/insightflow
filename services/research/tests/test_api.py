"""Validation, workflow success, and failure handling for POST /run."""
from __future__ import annotations

import pytest

from app.services import LLMError, extract_json


# --- validation ----------------------------------------------------------


def test_run_rejects_a_missing_topic(client):
    assert client.post("/run", json={}).status_code == 422


def test_run_rejects_an_empty_topic(client):
    response = client.post("/run", json={"topic": "   "})

    assert response.status_code == 422
    # The error must be a readable sentence, not a nested validation tree.
    assert isinstance(response.json()["detail"], str)


def test_run_rejects_a_too_short_topic(client):
    assert client.post("/run", json={"topic": "ai"}).status_code == 422


def test_run_rejects_an_unknown_depth(client):
    response = client.post("/run", json={"topic": "AI agents", "depth": "exhaustive"})
    assert response.status_code == 422


@pytest.mark.parametrize("depth", ["quick", "standard", "deep"])
def test_run_accepts_every_valid_depth(client, depth):
    response = client.post("/run", json={"topic": "AI agents in healthcare", "depth": depth})
    assert response.status_code == 200
    assert response.json()["depth"] == depth


# --- preview mode --------------------------------------------------------


def test_run_returns_a_complete_report_shape(client):
    body = client.post("/run", json={"topic": "Impact of AI agents on software"}).json()

    assert body["status"] == "completed"
    assert body["topic"] == "Impact of AI agents on software"

    result = body["result"]
    for field in ("summary", "key_findings", "analysis", "insights", "conclusion", "limitations"):
        assert field in result, field
    assert result["summary"]
    assert isinstance(result["key_findings"], list) and result["key_findings"]


def test_run_without_credentials_is_flagged_as_not_generated(client):
    body = client.post("/run", json={"topic": "Vector databases"}).json()

    # The UI relies on this flag to label preview output honestly.
    assert body["generated"] is False


def test_run_trims_whitespace_from_the_topic(client):
    body = client.post("/run", json={"topic": "  Edge computing  "}).json()
    assert body["topic"] == "Edge computing"


# --- generated path (LLM mocked) -----------------------------------------


@pytest.fixture
def stub_llm(monkeypatch):
    """Drive the workflow with a stubbed model so the real path is covered."""
    from app.workflows import get_workflow

    workflow = get_workflow()
    monkeypatch.setattr(type(workflow.llm), "available", property(lambda self: True))

    async def fake_complete_json(self, *, system, prompt, temperature=None, max_tokens=None):
        if "subtopics" in prompt:
            return {
                "subtopics": [{"title": "Adoption", "notes": "Teams adopt agents gradually."}],
                "key_concepts": ["autonomy"],
                "open_questions": ["How is quality measured?"],
            }
        if "themes" in prompt:
            return {
                "themes": [{"title": "Velocity", "explanation": "Throughput rises."}],
                "key_findings": ["Review load shifts to humans."],
                "relationships": ["Autonomy increases review burden."],
                "analysis": "A structured analysis body.",
            }
        return {
            "summary": "A concise executive summary.",
            "key_findings": ["Finding one.", "Finding two."],
            "analysis": "The reviewed analysis body.",
            "insights": ["A non-obvious insight."],
            "conclusion": "A conclusion.",
            "limitations": "Reflects model knowledge, not live sources.",
        }

    monkeypatch.setattr(type(workflow.llm), "complete_json", fake_complete_json)
    return workflow


def test_run_returns_generated_output_when_the_model_succeeds(client, stub_llm):
    body = client.post("/run", json={"topic": "AI agents in software"}).json()

    assert body["generated"] is True
    assert body["result"]["summary"] == "A concise executive summary."
    assert body["result"]["key_findings"] == ["Finding one.", "Finding two."]
    assert body["duration_ms"] >= 0


def test_run_returns_502_when_the_model_fails(client, stub_llm, monkeypatch):
    async def boom(self, *, system, prompt, temperature=None, max_tokens=None):
        raise LLMError("provider unavailable")

    monkeypatch.setattr(type(stub_llm.llm), "complete_json", boom)

    response = client.post("/run", json={"topic": "AI agents in software"})

    assert response.status_code == 502
    detail = response.json()["detail"]
    assert "could not complete" in detail
    # The raw provider error must not reach the client.
    assert "provider unavailable" not in detail


# --- JSON extraction -----------------------------------------------------


@pytest.mark.parametrize(
    "raw",
    [
        '{"summary": "x"}',
        '```json\n{"summary": "x"}\n```',
        'Here you go:\n{"summary": "x"}\nHope that helps.',
    ],
)
def test_extract_json_tolerates_model_formatting(raw):
    assert extract_json(raw)["summary"] == "x"


def test_extract_json_raises_on_unparsable_text():
    with pytest.raises(LLMError):
        extract_json("no json at all")


# --- truncated response recovery -----------------------------------------


@pytest.mark.parametrize(
    "raw,expected",
    [
        ('{"summary": "x", "analysis": "unterminated', {"summary": "x", "analysis": "unterminated"}),
        ('{"summary": "x",', {"summary": "x"}),
        ('{"summary": "x", "key_findings": ["a", "b', {"summary": "x", "key_findings": ["a", "b"]}),
        ('{"summary": "x", "insights":', {"summary": "x"}),
    ],
)
def test_extract_json_recovers_truncated_responses(raw, expected):
    """A response cut off at max_tokens should still yield the fields that arrived."""
    assert extract_json(raw) == expected
