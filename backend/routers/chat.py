import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from langgraph.types import Command
from backend.models.schemas import ChatRequest, ResumeRequest
from backend.agents.orchestrator import get_orchestrator

router = APIRouter()

def _make_config(session_id: str) -> dict:
    return {"configurable": {"thread_id": session_id}}

async def _stream_events(input_, session_id: str):
    agent = get_orchestrator()
    config = _make_config(session_id)
    try:
        async for event in agent.astream_events(input_, config=config, version="v2"):
            event_type = event.get("event", "")

            if event_type == "on_chat_model_stream":
                chunk = event["data"]["chunk"].content
                if chunk:
                    yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"

            elif event_type == "on_tool_end":
                tool_name = event.get("name", "")
                output = event["data"].get("output")

                if tool_name in ("request_human_decision", "request_human_answers"):
                    yield f"data: {json.dumps({'type': 'hitl', 'data': output})}\n\n"

                elif tool_name in ("call_write_agent", "call_critic_agent"):
                    yield f"data: {json.dumps({'type': 'preview_update', 'session_id': session_id})}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

@router.post("/sessions/{session_id}/chat")
async def chat(session_id: str, body: ChatRequest):
    input_ = {"messages": [{"role": "user", "content": body.message}]}
    return StreamingResponse(
        _stream_events(input_, session_id),
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
