from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from auth import get_current_user
from agent.orchestrator import chat as agent_chat, generate_weekly_report
from agent import memory as mem

router = APIRouter(prefix="/api/v1/agent", tags=["agent"])


class ChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None


class ChatResponse(BaseModel):
    reply: str
    playbook_activated: Optional[str]
    suggested_habit: Optional[str]


class TriggerRequest(BaseModel):
    trigger: str


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest,
    user_id: str = Depends(get_current_user),
):
    result = agent_chat(user_id=user_id, message=request.message)
    return ChatResponse(**result)


@router.post("/trigger")
async def trigger_endpoint(
    request: TriggerRequest,
    user_id: str = Depends(get_current_user),
):
    if request.trigger == "weekly_report":
        result = generate_weekly_report(user_id=user_id)
        return {"report": result["reply"]}
    return {"error": f"Trigger desconocido: {request.trigger}"}


@router.get("/history")
async def history_endpoint(user_id: str = Depends(get_current_user)):
    return {"messages": mem.get_history(user_id)}
