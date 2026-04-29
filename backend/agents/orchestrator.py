from deepagents import create_deep_agent
from backend.agents.base import get_model
from backend.agents.prompts import ORCHESTRATOR_PROMPT
from backend.agents.subagents import (
    call_search_agent, call_paper_agent, call_write_agent,
    call_references_agent, call_figure_agent, call_critic_agent,
)
from backend.agents.hitl_tools import request_human_decision, request_human_answers
from backend.memory.tools import search_memory, save_to_memory
from backend.tools.save_reference import save_reference
from backend.tools.save_chapter import save_chapter

_orchestrator = None


def init_orchestrator(checkpointer) -> None:
    global _orchestrator
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
            save_reference,
            save_chapter,
        ],
        system_prompt=ORCHESTRATOR_PROMPT,
        checkpointer=checkpointer,
    )


def get_orchestrator():
    return _orchestrator
