from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import sessions, chat, upload, output

app = FastAPI(title="Paper Writer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:10000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(output.router, prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok"}
