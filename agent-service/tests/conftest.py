"""
Mock out heavy dependencies (supabase, anthropic) before test collection.
This allows triage and logic tests to run without installed packages.
"""
# pytest-asyncio 0.23 / pytest 8 compatibility — disable asyncio plugin for sync-only tests
collect_ignore_glob = []
import sys
from unittest.mock import MagicMock

# Stub out modules that require real credentials or heavy deps
for mod in ["supabase", "anthropic", "openai", "sentence_transformers"]:
    sys.modules.setdefault(mod, MagicMock())

# Stub database module so triage/tree.py imports cleanly
import types

# Configure the supabase mock so that execute().data always returns []
# instead of a truthy MagicMock, which would cause TypeError in triage comparisons
def _make_supabase_mock() -> MagicMock:
    mock = MagicMock()
    empty_result = MagicMock()
    empty_result.data = []
    mock.table.return_value.select.return_value.eq.return_value.eq.return_value \
        .order.return_value.limit.return_value.execute.return_value = empty_result
    mock.table.return_value.select.return_value.eq.return_value \
        .order.return_value.limit.return_value.execute.return_value = empty_result
    mock.table.return_value.select.return_value.eq.return_value \
        .execute.return_value = empty_result
    return mock

database_mod = types.ModuleType("database")
database_mod.supabase = _make_supabase_mock()
database_mod.get_supabase = MagicMock()
sys.modules["database"] = database_mod

config_mod = types.ModuleType("config")
config_settings = MagicMock()
config_settings.anthropic_api_key = "sk-test"
config_settings.supabase_url = "https://test.supabase.co"
config_settings.supabase_anon_key = "anon-test"
config_settings.supabase_service_key = "service-test"
config_mod.settings = config_settings
sys.modules["config"] = config_mod
