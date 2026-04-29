from deepagents import create_deep_agent
from langgraph.checkpoint.memory import MemorySaver
from backend.agents.base import get_model
from backend.agents.prompts import ORCHESTRATOR_PROMPT
from backend.agents.subagents import (
    call_search_agent, call_paper_agent, call_write_agent,
    call_references_agent, call_figure_agent, call_critic_agent,
)
from backend.agents.hitl_tools import request_human_decision, request_human_answers
from backend.memory.tools import search_memory, save_to_memory

_checkpointer = MemorySaver()
_orchestrator = None


def get_orchestrator():
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = create_deep_agent(
            model=get_model(),
            tools=[
                call_search_agent,
                call_paper_agent,
                call_write_agent,
                call_references_agent,
                call_figure_agent,
                call_critic_agent,
                request_human_decision,
                request_human_answers,
                search_memory,
                save_to_memory,
            ],
            system_prompt=ORCHESTRATOR_PROMPT,
            checkpointer=_checkpointer,
        )
    return _orchestrator
