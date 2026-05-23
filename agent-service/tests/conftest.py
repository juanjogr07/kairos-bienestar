"""
Mock out heavy dependencies (supabase, anthropic) before test collection.
This allows triage and logic tests to run without installed packages.
"""
import sys
from unittest.mock import MagicMock

# Stub out modules that require real credentials or heavy deps
for mod in ["supabase", "anthropic", "openai", "sentence_transformers"]:
    sys.modules.setdefault(mod, MagicMock())

# Stub database module so triage/tree.py imports cleanly
import types

database_mod = types.ModuleType("database")
database_mod.supabase = MagicMock()
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
