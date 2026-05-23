from supabase import create_client, Client
from config import settings


def get_supabase() -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_key)


class _LazySupabase:
    """Defers Supabase connection until first attribute access."""
    def __getattr__(self, name: str):
        return getattr(get_supabase(), name)


supabase: Client = _LazySupabase()  # type: ignore[assignment]
