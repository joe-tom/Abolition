from langchain_core.tools import tool
from langgraph.types import interrupt


@tool
def request_human_decision(critic_report: str, question: str) -> str:
    """Pause execution to show user a critic report and ask for a decision.
    Returns the user's decision string ('rewrite' or 'proceed')."""
    return interrupt({
        "type": "hitl_decision",
        "critic_report": critic_report,
        "question": question,
        "options": ["rewrite", "proceed"],
    })


@tool
def request_human_answers(questions: list[str]) -> str:
    """Pause execution to collect targeted answers from the user before rewriting.
    Returns user answers as a Markdown string."""
    return interrupt({
        "type": "hitl_questions",
        "questions": questions,
    })
