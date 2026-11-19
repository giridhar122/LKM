import asyncio
import logging
from typing import Optional
import httpx
from app.core.config import settings
from app.database.session import SessionLocal
from app.integrations.messaging.telegram import telegram_provider
from app.services.ticket_service import ticket_service

logger = logging.getLogger(__name__)

_stop_event = asyncio.Event()
_polling_task: Optional[asyncio.Task] = None


async def start_telegram_polling():
    """
    Background worker that runs long-polling against Telegram Bot API.
    Enables instant incident reporting on localhost without requiring ngrok or public webhooks.
    """
    if not telegram_provider.is_configured():
        logger.info(
            "[TELEGRAM POLLER] TELEGRAM_BOT_TOKEN is not set in backend/.env. "
            "Polling is paused until a token is provided."
        )
        return

    # Check bot info first
    bot_info = telegram_provider.get_me()
    if bot_info.get("ok"):
        username = bot_info.get("result", {}).get("username")
        bot_name = bot_info.get("result", {}).get("first_name")
        logger.info(f"✅ [TELEGRAM POLLER] Connected to Telegram Bot: @{username} ('{bot_name}'). Polling started!")
    else:
        logger.warning(f"[TELEGRAM POLLER] Failed to verify bot token: {bot_info.get('error')}. Retrying in loop...")

    _stop_event.clear()
    offset = 0

    async with httpx.AsyncClient(timeout=35.0) as client:
        while not _stop_event.is_set():
            try:
                url = f"{telegram_provider.api_base}/getUpdates"
                params = {"offset": offset, "timeout": 20, "allowed_updates": ["message", "edited_message"]}
                
                resp = await client.get(url, params=params)
                if resp.status_code != 200:
                    logger.warning(f"[TELEGRAM POLLER] HTTP {resp.status_code} from getUpdates: {resp.text}")
                    await asyncio.sleep(4)
                    continue

                data = resp.json()
                if not data.get("ok"):
                    logger.warning(f"[TELEGRAM POLLER] Telegram error: {data.get('description')}")
                    await asyncio.sleep(4)
                    continue

                updates = data.get("result", [])
                for update in updates:
                    offset = max(offset, update.get("update_id", 0) + 1)
                    parsed = telegram_provider.parse_webhook_payload(update)
                    if not parsed:
                        continue

                    # Process in a scoped DB session
                    db = SessionLocal()
                    try:
                        ticket, is_dup = ticket_service.process_incoming_message(
                            db=db,
                            provider_message_id=parsed["provider_message_id"],
                            sender_phone=parsed["sender_phone"],
                            message_text=parsed["message_text"],
                            platform="TELEGRAM",
                            raw_payload=parsed["raw"]
                        )
                        logger.info(
                            f"[TELEGRAM POLLER] ✅ Created Ticket {ticket.ticket_number} for issue: "
                            f"'{ticket.issue_title}' (Dept: {ticket.department.name if ticket.department else 'Review'}, Priority: {ticket.priority})"
                        )
                    except Exception as e:
                        logger.error(f"[TELEGRAM POLLER] Error processing Telegram message: {e}", exc_info=True)
                    finally:
                        db.close()

            except httpx.TimeoutException:
                # Normal long-polling timeout when no messages arrived, continue immediately
                continue
            except asyncio.CancelledError:
                logger.info("[TELEGRAM POLLER] Polling task cancelled.")
                break
            except Exception as e:
                logger.error(f"[TELEGRAM POLLER] Unexpected error in polling loop: {e}")
                await asyncio.sleep(3)


async def stop_telegram_polling():
    """Stops the active Telegram long-polling worker cleanly."""
    _stop_event.set()
    global _polling_task
    if _polling_task and not _polling_task.done():
        _polling_task.cancel()
        try:
            await _polling_task
        except asyncio.CancelledError:
            pass
    logger.info("[TELEGRAM POLLER] Stopped Telegram long polling.")
