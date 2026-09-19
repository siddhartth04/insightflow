def test_metadata_describes_the_module(client):
    body = client.get("/metadata").json()

    assert body["module_id"] == "research"
    assert body["module_name"] == "Research"
    assert body["status"] == "online"
    assert body["agents"] == ["researcher", "analyst", "reviewer"]


def test_metadata_lists_agents_in_workflow_order(client):
    details = client.get("/metadata").json()["agent_details"]

    assert [agent["id"] for agent in details] == ["researcher", "analyst", "reviewer"]
    assert details[0]["next_agent"] == "analyst"
    assert details[1]["next_agent"] == "reviewer"
    assert details[2]["next_agent"] is None


def test_metadata_never_exposes_system_prompts(client):
    raw = client.get("/metadata").text.lower()

    assert "system_prompt" not in raw
    assert "you are a rigorous research assistant" not in raw
