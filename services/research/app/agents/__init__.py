from .analyst import AnalystAgent
from .base import Agent, AgentProfile
from .researcher import ResearcherAgent
from .reviewer import ReviewerAgent

#: Workflow order. Exposed through /metadata.
AGENT_PROFILES = [
    ResearcherAgent.profile,
    AnalystAgent.profile,
    ReviewerAgent.profile,
]

__all__ = [
    "Agent",
    "AgentProfile",
    "AnalystAgent",
    "ResearcherAgent",
    "ReviewerAgent",
    "AGENT_PROFILES",
]
