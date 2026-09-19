def test_health_reports_healthy(client):
    response = client.get("/health")
    assert response.status_code == 200

    body = response.json()
    assert body["status"] == "healthy"
    assert body["module"] == "content"
    assert body["llm_available"] is False


def test_health_reports_the_research_dependency(client):
    body = client.get("/health").json()

    # No Research service runs during tests, so the probe must report it as down
    # rather than failing the health check itself.
    assert body["research_reachable"] is False
