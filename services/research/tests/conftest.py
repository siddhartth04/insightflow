"""Shared fixtures. Tests run against the service without any provider key."""
from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Guarantee deterministic preview behaviour regardless of the developer's shell.
for _key in ("OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GEMINI_API_KEY", "LITELLM_BASE_URL"):
    os.environ.pop(_key, None)
os.environ["OFFLINE_MODE"] = "true"


@pytest.fixture(scope="session")
def client() -> TestClient:
    from app.main import app

    return TestClient(app)
