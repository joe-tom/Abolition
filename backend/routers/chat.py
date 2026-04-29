import json
import logging
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from langgraph.types import Command
from backend.models.schemas import ChatRequest, ResumeRequest
from backend.agents.orchestrator import get_orchestrator
from backend.db.repos.messages import save_message, get_messages

logger = logging.getLogger(__name__)

router = APIRouter()


def _make_config(session_id: str) -> dict:
    return {"configurable": {"thread_id": session_id}}


async def _stream_events(input_, session_id: str, user_content: str | None = None):
    agent = get_orchestrator()
    config = _make_config(session_id)

    if user_content:
        save_message(session_id, "user", user_content)

    agent_buffer: list[str] = []

    try:
        async for event in agent.astream_events(input_, config=config, version="v2"):
            event_type = event.get("event", "")

            if event_type == "on_chat_model_stream":
                raw = event["data"]["chunk"].content
                if isinstance(raw, list):
                    chunk = "".join(
                        b.get("text", "") if isinstance(b, dict) else str(b)
                        for b in raw
                    )
                else:
                    chunk = raw
                if chunk:
                    agent_buffer.append(chunk)
                    yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"

            elif event_type == "on_tool_end":
                tool_name = event.get("name", "")
                output = event["data"].get("output")

                if tool_name in ("request_human_decision", "request_human_answers"):
                    if agent_buffer:
                        save_message(session_id, "agent", "".join(agent_buffer))
                        agent_buffer.clear()
                    yield f"data: {json.dumps({'type': 'hitl', 'data': output})}\n\n"

                elif tool_name in ("call_write_agent", "call_critic_agent"):
                    yield f"data: {json.dumps({'type': 'preview_update', 'session_id': session_id})}\n\n"

                elif tool_name == "save_reference":
                    yield f"data: {json.dumps({'type': 'reference_update', 'session_id': session_id})}\n\n"

        if agent_buffer:
            save_message(session_id, "agent", "".join(agent_buffer))

        yield f"data: {json.dumps({'type': 'done'})}\n\n"
    except Exception as e:
        logger.exception("SSE stream error")
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"


@router.get("/sessions/{session_id}/messages", response_model=list)
def list_messages(session_id: str):
    return get_messages(session_id)


@router.post("/sessions/{session_id}/chat")
async def chat(session_id: str, body: ChatRequest):
    input_ = {"messages": [{"role": "user", "content": body.message}]}
    return StreamingResponse(
        _stream_events(input_, session_id, user_content=body.message),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/sessions/{session_id}/resume")
async def resume(session_id: str, body: ResumeRequest):
    return StreamingResponse(
        _stream_events(Command(resume=body.response), session_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
