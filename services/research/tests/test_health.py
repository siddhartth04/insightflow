def test_health_reports_healthy(client):
    response = client.get("/health")
    assert response.status_code == 200

    body = response.json()
    assert body["status"] == "healthy"
    assert body["module"] == "research"
    assert body["version"]
    # No credentials are configured in the test environment.
    assert body["llm_available"] is False
