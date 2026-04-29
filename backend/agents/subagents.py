from langchain_core.tools import tool
from langchain_core.runnables import RunnableConfig
from deepagents import create_deep_agent
from backend.agents.base import get_model
from backend.agents.prompts import (
    SEARCH_AGENT_PROMPT, PAPER_AGENT_PROMPT, WRITE_AGENT_PROMPT,
    REFERENCES_AGENT_PROMPT, FIGURE_AGENT_PROMPT, CRITIC_AGENT_PROMPT,
)
from backend.tools.tavily_search import tavily_search
from backend.tools.arxiv_search import arxiv_search
from backend.tools.semantic_scholar import semantic_scholar_search
from backend.tools.bibtex_manager import bibtex_to_markdown, format_bibtex
from backend.tools.save_reference import save_reference


@tool
def call_search_agent(task: str) -> str:
    """Delegate web search to SearchAgent. Input: detailed task description. Returns Markdown."""
    agent = create_deep_agent(
        model=get_model(),
        tools=[tavily_search],
        system_prompt=SEARCH_AGENT_PROMPT,
    )
    result = agent.invoke({"messages": [{"role": "user", "content": task}]})
    return result["messages"][-1].content


@tool
def call_paper_agent(task: str, config: RunnableConfig) -> str:
    """Delegate academic literature search to PaperAgent. Returns Markdown with BibTeX."""
    agent = create_deep_agent(
        model=get_model(),
        tools=[arxiv_search, semantic_scholar_search, save_reference],
        system_prompt=PAPER_AGENT_PROMPT,
    )
    sub_config = {"configurable": config.get("configurable", {})}
    result = agent.invoke({"messages": [{"role": "user", "content": task}]}, config=sub_config)
    return result["messages"][-1].content


@tool
def call_write_agent(task: str) -> str:
    """Delegate chapter writing to WriteAgent. Returns LaTeX code only."""
    agent = create_deep_agent(
        model=get_model(),
        tools=[],
        system_prompt=WRITE_AGENT_PROMPT,
    )
    result = agent.invoke({"messages": [{"role": "user", "content": task}]})
    return result["messages"][-1].content


@tool
def call_references_agent(task: str) -> str:
    """Delegate BibTeX collection and normalization to ReferencesAgent."""
    agent = create_deep_agent(
        model=get_model(),
        tools=[bibtex_to_markdown, format_bibtex],
        system_prompt=REFERENCES_AGENT_PROMPT,
    )
    result = agent.invoke({"messages": [{"role": "user", "content": task}]})
    return result["messages"][-1].content


@tool
def call_figure_agent(task: str) -> str:
    """Delegate figure/table/equation LaTeX generation to FigureAgent."""
    agent = create_deep_agent(
        model=get_model(),
        tools=[],
        system_prompt=FIGURE_AGENT_PROMPT,
    )
    result = agent.invoke({"messages": [{"role": "user", "content": task}]})
    return result["messages"][-1].content


@tool
def call_critic_agent(task: str) -> str:
    """Delegate chapter review to CriticAgent. Returns structured review with PASS/FAIL."""
    agent = create_deep_agent(
        model=get_model(),
        tools=[],
        system_prompt=CRITIC_AGENT_PROMPT,
    )
    result = agent.invoke({"messages": [{"role": "user", "content": task}]})
    return result["messages"][-1].content
