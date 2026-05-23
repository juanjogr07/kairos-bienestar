from supabase import create_client, Client
from config import settings
from typing import Optional

_client: Optional[Client] = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_service_key)
    return _client


class _LazySupabase:
    """Proxy that defers Supabase connection until first use."""

    def __getattr__(self, name: str):
        return getattr(get_supabase(), name)


supabase: Client = _LazySupabase()  # type: ignore[assignment]
