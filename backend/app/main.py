import os

import httpx
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .classifier import classify_message

cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "BACKEND_CORS_ORIGINS",
        "http://localhost:5173,https://peichitsai.github.io"
    ).split(",")
    if origin.strip()
]


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

    allow_origins=cors_origins,

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

    language_reference: str | None = None

    ui_language: str | None = None
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
def chat(
    request: ChatRequest,
    authorization: str | None = Header(default=None),
):
    supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    supabase_anon_key = os.getenv("SUPABASE_ANON_KEY")
    if not supabase_url or not supabase_anon_key:
        raise HTTPException(
            status_code=503,
            detail="The backend Supabase authentication settings are not configured.",
        )

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Sign in to use the citizen assistant.",
        )

    try:
        auth_response = httpx.get(
            f"{supabase_url}/auth/v1/user",
            headers={
                "apikey": supabase_anon_key,
                "Authorization": authorization,
            },
            timeout=5.0,
        )
    except httpx.RequestError as error:
        raise HTTPException(
            status_code=503,
            detail="Unable to verify the Supabase session right now.",
        ) from error

    if auth_response.status_code in (401, 403):
        raise HTTPException(
            status_code=401,
            detail="Your session is invalid or expired. Please sign in again.",
        )
    if not auth_response.is_success:
        raise HTTPException(
            status_code=503,
            detail="Supabase could not verify the current session.",
        )

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

        language_reference=request.language_reference,

        ui_language=request.ui_language,
        current_result=
        request.current_result
    )

    return result