from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .classifier import classify_message


# ==========================================
# FastAPI application
# ==========================================

app = FastAPI(
    title="Concepción Citizen AI Assistant",
    description="AI-powered citizen reporting API",
    version="0.1.0"
)


# ==========================================
# CORS
# ==========================================

app.add_middleware(

    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173"
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"]
)


# ==========================================
# Request model
# ==========================================

class ChatRequest(BaseModel):

    message: str

    conversation_history: list = []

    current_result: dict | None = None


# ==========================================
# Root endpoint
# ==========================================

@app.get("/")
def root():

    return {
        "message":
        "Citizen AI Assistant API is running."
    }


# ==========================================
# Chat endpoint
# ==========================================

@app.post("/api/chat")
def chat(request: ChatRequest):

    history = list(
        request.conversation_history
    )

    history.append(
        {
            "role": "citizen",
            "content": request.message
        }
    )

    result = classify_message(

        conversation_history=history,

        current_result=
        request.current_result
    )

    return result