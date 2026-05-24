"""
In-memory Supabase client for integration tests.

Mirrors the tables defined in infra/supabase/migrations/ and supports the
query chain used across api-service (select/insert/update + eq/gte/lt/gt/order/limit).
"""
from __future__ import annotations

import copy
import uuid
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from typing import Any


class FakeIntegrityError(Exception):
    """Raised when a unique constraint would be violated."""


TABLES = {
    "usage_events",
    "survey_responses",
    "habits",
    "habit_completions",
    "streaks",
    "ml_results",
    "daily_features",
    "playbooks",
    "playbook_chunks",
    "weekly_reports",
    "intervention_log",
    "notifications",
}

UUID_TABLES = {
    "survey_responses",
    "habits",
    "streaks",
    "playbooks",
    "playbook_chunks",
    "weekly_reports",
    "intervention_log",
    "notifications",
}

BIGINT_TABLES = {"usage_events", "habit_completions", "ml_results"}


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _normalize(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.replace(tzinfo=None).isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return value


def _compare(left: Any, right: Any) -> int:
    left = _normalize(left)
    right = _normalize(right)
    if left == right:
        return 0
    return -1 if left < right else 1


@dataclass
class FakeResult:
    data: list[dict[str, Any]] = field(default_factory=list)


class FakeAuth:
    def __init__(self, user_id: str) -> None:
        self.user_id = user_id

    def get_user(self, _token: str) -> Any:
        class User:
            id = self.user_id

        class Response:
            user = User()

        return Response()


class FakeQueryBuilder:
    def __init__(self, store: "FakeSupabase", table: str) -> None:
        self._store = store
        self._table = table
        self._mode: str | None = None
        self._columns: str = "*"
        self._payload: dict[str, Any] | list[dict[str, Any]] | None = None
        self._filters: list[tuple[str, str, Any]] = []
        self._order_col: str | None = None
        self._order_desc: bool = False
        self._limit: int | None = None

    def select(self, columns: str = "*") -> "FakeQueryBuilder":
        self._mode = "select"
        self._columns = columns
        return self

    def insert(self, payload: dict[str, Any] | list[dict[str, Any]]) -> "FakeQueryBuilder":
        self._mode = "insert"
        self._payload = payload
        return self

    def update(self, payload: dict[str, Any]) -> "FakeQueryBuilder":
        self._mode = "update"
        self._payload = payload
        return self

    def eq(self, column: str, value: Any) -> "FakeQueryBuilder":
        self._filters.append(("eq", column, value))
        return self

    def gte(self, column: str, value: Any) -> "FakeQueryBuilder":
        self._filters.append(("gte", column, value))
        return self

    def lt(self, column: str, value: Any) -> "FakeQueryBuilder":
        self._filters.append(("lt", column, value))
        return self

    def gt(self, column: str, value: Any) -> "FakeQueryBuilder":
        self._filters.append(("gt", column, value))
        return self

    def order(self, column: str, desc: bool = False) -> "FakeQueryBuilder":
        self._order_col = column
        self._order_desc = desc
        return self

    def limit(self, count: int) -> "FakeQueryBuilder":
        self._limit = count
        return self

    def execute(self) -> FakeResult:
        if self._mode == "insert":
            return self._execute_insert()
        if self._mode == "update":
            return self._execute_update()
        return self._execute_select()

    def _execute_select(self) -> FakeResult:
        rows = copy.deepcopy(self._store.tables.get(self._table, []))
        rows = [row for row in rows if self._matches(row)]
        if self._order_col:
            rows.sort(
                key=lambda row: _normalize(row.get(self._order_col)),
                reverse=self._order_desc,
            )
        if self._limit is not None:
            rows = rows[: self._limit]
        return FakeResult(data=[self._project(row) for row in rows])

    def _execute_insert(self) -> FakeResult:
        assert self._payload is not None
        rows = self._payload if isinstance(self._payload, list) else [self._payload]
        inserted: list[dict[str, Any]] = []
        for row in rows:
            new_row = self._store._prepare_insert(self._table, row)
            self._store._enforce_constraints(self._table, new_row, is_update=False)
            self._store.tables.setdefault(self._table, []).append(new_row)
            inserted.append(copy.deepcopy(new_row))
        return FakeResult(data=inserted)

    def _execute_update(self) -> FakeResult:
        assert isinstance(self._payload, dict)
        updated: list[dict[str, Any]] = []
        for row in self._store.tables.get(self._table, []):
            if not self._matches(row):
                continue
            row.update(copy.deepcopy(self._payload))
            self._store._enforce_constraints(self._table, row, is_update=True)
            updated.append(copy.deepcopy(row))
        return FakeResult(data=updated)

    def _matches(self, row: dict[str, Any]) -> bool:
        for op, column, value in self._filters:
            row_value = row.get(column)
            if op == "eq" and row_value != value:
                return False
            if op == "gte" and _compare(row_value, value) < 0:
                return False
            if op == "lt" and _compare(row_value, value) >= 0:
                return False
            if op == "gt" and _compare(row_value, value) <= 0:
                return False
        return True

    def _project(self, row: dict[str, Any]) -> dict[str, Any]:
        if self._columns.strip() == "*":
            return copy.deepcopy(row)
        keys = [key.strip() for key in self._columns.split(",")]
        return {key: copy.deepcopy(row.get(key)) for key in keys}


class FakeSupabase:
    def __init__(
        self,
        *,
        user_id: str = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        tables: dict[str, list[dict[str, Any]]] | None = None,
    ) -> None:
        self.user_id = user_id
        self.auth = FakeAuth(user_id)
        self.tables: dict[str, list[dict[str, Any]]] = copy.deepcopy(tables or {})
        self._bigint_counters: dict[str, int] = {}

    def table(self, name: str) -> FakeQueryBuilder:
        if name not in TABLES:
            raise KeyError(f"Unknown table '{name}'. Known tables: {sorted(TABLES)}")
        return FakeQueryBuilder(self, name)

    def rows(self, table: str) -> list[dict[str, Any]]:
        return copy.deepcopy(self.tables.get(table, []))

    def count(self, table: str) -> int:
        return len(self.tables.get(table, []))

    def _next_bigint(self, table: str) -> int:
        current = self._bigint_counters.get(table, 0) + 1
        self._bigint_counters[table] = current
        return current

    def _prepare_insert(self, table: str, row: dict[str, Any]) -> dict[str, Any]:
        prepared = copy.deepcopy(row)
        now = _utcnow_iso()

        if table in UUID_TABLES and "id" not in prepared:
            prepared["id"] = str(uuid.uuid4())
        if table in BIGINT_TABLES and "id" not in prepared:
            prepared["id"] = self._next_bigint(table)

        defaults = {
            "usage_events": {"source": "extension", "created_at": now},
            "survey_responses": {"created_at": now},
            "habits": {"frequency": "daily", "active": True, "created_at": now},
            "habit_completions": {"completed_at": now},
            "streaks": {
                "current_streak": 0,
                "longest_streak": 0,
                "grace_days_used": 0,
            },
            "ml_results": {"computed_at": now},
            "daily_features": {"created_at": now, "updated_at": now},
            "playbooks": {"created_at": now, "crisis_escalation": False},
            "weekly_reports": {"created_at": now},
            "intervention_log": {"shown_at": now, "acted_upon": False},
            "notifications": {"read": False, "created_at": now},
        }
        for key, value in defaults.get(table, {}).items():
            prepared.setdefault(key, value)

        for key, value in list(prepared.items()):
            prepared[key] = _normalize(value)
        return prepared

    def _enforce_constraints(
        self,
        table: str,
        row: dict[str, Any],
        *,
        is_update: bool,
    ) -> None:
        if table == "streaks":
            habit_id = row.get("habit_id")
            for existing in self.tables.get("streaks", []):
                if existing is row:
                    continue
                if existing.get("habit_id") == habit_id:
                    raise FakeIntegrityError("duplicate key value violates unique constraint on streaks(habit_id)")

        if table == "daily_features":
            user_id = row.get("user_id")
            day = _normalize(row.get("date"))
            for existing in self.tables.get("daily_features", []):
                if existing is row:
                    continue
                if existing.get("user_id") == user_id and _normalize(existing.get("date")) == day:
                    raise FakeIntegrityError("duplicate key value violates unique constraint on daily_features(user_id, date)")

        if table == "notifications" and not is_update:
            user_id = row.get("user_id")
            notif_type = row.get("type")
            created_at = row.get("created_at", _utcnow_iso())
            day = created_at[:10]
            for existing in self.tables.get("notifications", []):
                existing_day = str(existing.get("created_at", ""))[:10]
                if (
                    existing.get("user_id") == user_id
                    and existing.get("type") == notif_type
                    and existing_day == day
                ):
                    raise FakeIntegrityError(
                        "duplicate key value violates unique constraint idx_notifications_one_per_type_per_day"
                    )
