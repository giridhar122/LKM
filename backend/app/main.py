import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database.session import SessionLocal
from app.database.init_db import init_db
from app.api.routes.auth import router as auth_router
from app.api.routes.tickets import router as tickets_router
from app.api.routes.departments import router as departments_router
from app.api.routes.employees import router as employees_router
from app.api.routes.whatsapp import router as whatsapp_router
from app.api.routes.telegram import router as telegram_router
from app.api.routes.simulator import router as simulator_router
from app.api.routes.reports import router as reports_router
from app.services.telegram_polling import start_telegram_polling, stop_telegram_polling
import asyncio

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("lkm_smartdesk")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event to ensure database tables and seed records exist upon startup, and start background listeners."""
    logger.info(f"Starting {settings.PROJECT_NAME} backend...")
    db = SessionLocal()
    try:
        init_db(db)
    except Exception as e:
        logger.error(f"Error during database initialization: {e}")
    finally:
        db.close()

    # Start Telegram background poller if enabled and token present
    polling_task = None
    if settings.TELEGRAM_ENABLED and settings.TELEGRAM_POLLING_MODE:
        polling_task = asyncio.create_task(start_telegram_polling())

    yield

    # Clean shutdown of Telegram poller
    if polling_task:
        await stop_telegram_polling()
        polling_task.cancel()
    logger.info(f"Shutting down {settings.PROJECT_NAME} backend...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Industrial AI-Powered Messaging-Based Issue Reporting and Ticket Management Platform",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers under /api/v1
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(tickets_router, prefix=settings.API_V1_STR)
app.include_router(departments_router, prefix=settings.API_V1_STR)
app.include_router(employees_router, prefix=settings.API_V1_STR)
app.include_router(whatsapp_router, prefix=settings.API_V1_STR)
app.include_router(telegram_router, prefix=settings.API_V1_STR)
app.include_router(simulator_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "system": settings.PROJECT_NAME,
        "organization": "LKM & Auralytic Technologies",
        "status": "online",
        "docs": f"{settings.API_V1_STR}/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "1.0.0"}
