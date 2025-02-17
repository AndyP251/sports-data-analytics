from functools import wraps
from django.core.cache import cache
import logging
from asgiref.sync import sync_to_async
import asyncio

logger = logging.getLogger(__name__)

def resource_lock(resource_type: str, timeout: int = 300):
    """
    Decorator that locks a resource so multiple requests don't overlap.
    Handles both sync and async functions.
    """
    def decorator(func):
        if asyncio.iscoroutinefunction(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                lock_id = f"{resource_type}:{args[0].athlete.id if args else 'unknown'}"
                has_lock = await sync_to_async(cache.get)(lock_id)
                if has_lock:
                    logger.warning(f"{resource_type.title()} already in progress for {lock_id}")
                    return False

                await sync_to_async(cache.set)(lock_id, True, timeout)
                try:
                    return await func(*args, **kwargs)
                finally:
                    await sync_to_async(cache.delete)(lock_id)
            return wrapper
        else:
            @wraps(func)
            def wrapper(*args, **kwargs):
                lock_id = f"{resource_type}:{args[0].athlete.id if args else 'unknown'}"
                has_lock = cache.get(lock_id)
                if has_lock:
                    logger.warning(f"{resource_type.title()} already in progress for {lock_id}")
                    return False

                cache.set(lock_id, True, timeout)
                try:
                    return func(*args, **kwargs)
                finally:
                    cache.delete(lock_id)
            return wrapper

    return decorator 