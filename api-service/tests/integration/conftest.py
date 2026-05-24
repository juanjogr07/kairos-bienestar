"""Shared fixtures for integration tests."""
from __future__ import annotations

from contextlib import ExitStack, contextmanager
from typing import Iterator
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from tests.integration.fake_supabase import FakeSupabase
from tests.integration.seed_data import DEMO_USER_ID, build_demo_tables, build_empty_tables

AUTH_HEADERS = {"Authorization": "Bearer integration-test-token"}

SUPABASE_PATCH_TARGETS = [
    "auth.supabase",
    "database.supabase",
    "routers.events.supabase",
    "routers.surveys.supabase",
    "routers.dashboard.supabase",
    "routers.habits.supabase",
    "routers.interventions.supabase",
    "routers.reports.supabase",
    "routers.ml_trigger.supabase",
    "routers.notifications.supabase",
    "services.notification_service.supabase",
    "services.streak_engine.supabase",
]


@contextmanager
def patch_supabase(db: FakeSupabase) -> Iterator[FakeSupabase]:
    with ExitStack() as stack:
        for target in SUPABASE_PATCH_TARGETS:
            stack.enter_context(patch(target, db))
        yield db


@pytest.fixture
def fake_supabase() -> FakeSupabase:
    return FakeSupabase(user_id=DEMO_USER_ID, tables=build_empty_tables())


@pytest.fixture
def seeded_supabase() -> FakeSupabase:
    return FakeSupabase(user_id=DEMO_USER_ID, tables=build_demo_tables())


@pytest.fixture
def api_client(seeded_supabase: FakeSupabase) -> Iterator[TestClient]:
    from main import app

    with patch_supabase(seeded_supabase):
        yield TestClient(app)
