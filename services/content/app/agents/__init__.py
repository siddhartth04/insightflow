from .base import Agent, AgentProfile
from .editor import EditorAgent
from .researcher import ContentResearcherAgent
from .strategist import StrategistAgent
from .writer import WriterAgent

#: Workflow order. Exposed through /metadata.
AGENT_PROFILES = [
    ContentResearcherAgent.profile,
    StrategistAgent.profile,
    WriterAgent.profile,
    EditorAgent.profile,
]

__all__ = [
    "Agent",
    "AgentProfile",
    "ContentResearcherAgent",
    "EditorAgent",
    "StrategistAgent",
    "WriterAgent",
    "AGENT_PROFILES",
]
