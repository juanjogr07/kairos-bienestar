import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from rate_limit import limiter
from routers import chat
from routers.progress import router as progress_router

app = FastAPI(title="Kairós Agent Service", version="0.1.0")
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)


def _retry_after_seconds(request: Request, exc: RateLimitExceeded) -> int:
    """Calcula segundos hasta que el cubo se reinicie.

    Lee el window stats del storage de slowapi cuando está disponible. Si
    no, cae al periodo del límite excedido (`exc.limit.limit.get_expiry()`).
    Garantiza un mínimo de 1 segundo para que el header `Retry-After` sea
    válido.
    """
    try:
        view_rate_limit = getattr(request.state, "view_rate_limit", None)
        if view_rate_limit is not None:
            limit_obj, args = view_rate_limit
            reset_at, _remaining = request.app.state.limiter.limiter.get_window_stats(
                limit_obj.limit, *args
            )
            return max(1, int(reset_at - time.time()))
    except Exception:
        pass
    try:
        return max(1, int(exc.limit.limit.get_expiry()))
    except Exception:
        return 3600


def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Devuelve 429 con mensaje en español y minutos restantes dinámicos."""
    retry_after_s = _retry_after_seconds(request, exc)
    minutes = max(1, (retry_after_s + 59) // 60)
    return JSONResponse(
        status_code=429,
        headers={"Retry-After": str(retry_after_s)},
        content={
            "error": f"Límite de conversaciones alcanzado. Vuelve en {minutes} minutos."
        },
    )


app.add_exception_handler(RateLimitExceeded, custom_rate_limit_handler)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(progress_router)


@app.get("/health")
def health():
    """Health check — excluido del rate limiting (sin decorador @limiter.limit)."""
    return {"status": "ok", "service": "agent-service"}
