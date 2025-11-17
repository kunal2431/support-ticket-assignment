from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.tickets import router as tickets_router
from app.api.analysis import router as analysis_router

app = FastAPI(title="Support Ticket API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(health_router)
app.include_router(tickets_router)
app.include_router(analysis_router)

@app.get("/")
def root():
    return {"message": "Support Ticket Backend Running"}
