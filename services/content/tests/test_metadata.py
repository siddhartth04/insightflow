def test_metadata_describes_the_module(client):
    body = client.get("/metadata").json()

    assert body["module_id"] == "content"
    assert body["module_name"] == "Content Studio"
    assert body["status"] == "online"
    assert body["agents"] == ["researcher", "strategist", "writer", "editor"]


def test_metadata_lists_agents_in_workflow_order(client):
    details = client.get("/metadata").json()["agent_details"]

    assert [agent["next_agent"] for agent in details] == [
        "strategist",
        "writer",
        "editor",
        None,
    ]


def test_metadata_lists_every_supported_content_type(client):
    ids = {item["id"] for item in client.get("/metadata").json()["content_types"]}

    assert ids == {
        "linkedin",
        "technical_article",
        "blog_post",
        "product_description",
        "research_summary",
    }


def test_metadata_reports_the_research_service_url_from_config(client):
    body = client.get("/metadata").json()

    # The URL comes from the environment, never hard-coded in the service.
    assert body["research_service_url"] == "http://research-test:8001"


def test_metadata_never_exposes_system_prompts(client):
    raw = client.get("/metadata").text.lower()

    assert "system_prompt" not in raw
    assert "you are a content strategist" not in raw
