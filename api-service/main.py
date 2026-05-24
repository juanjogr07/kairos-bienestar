from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import events, surveys, dashboard, habits, interventions, ml_trigger

app = FastAPI(title="Kairós API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "chrome-extension://*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events.router)
app.include_router(surveys.router)
app.include_router(dashboard.router)
app.include_router(habits.router)
app.include_router(interventions.router)
app.include_router(ml_trigger.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "api-service"}
