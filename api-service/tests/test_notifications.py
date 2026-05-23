from datetime import date, timedelta
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

USER_ID = "test-user-uuid"
NOTIFICATION_ID = "notif-1"
HABIT_ID = "habit-1"
AUTH_HEADERS = {"Authorization": "Bearer test-token"}


def _make_mock_db():
    mock_db = MagicMock()
    mock_db.auth.get_user.return_value = MagicMock(user=MagicMock(id=USER_ID))
    return mock_db


def _client():
    from main import app

    return TestClient(app)


def _mark_read(mock_db, notification_id=NOTIFICATION_ID):
    with patch("auth.supabase", mock_db), patch("routers.notifications.supabase", mock_db):
        return _client().post(
            f"/api/v1/notifications/{notification_id}/read",
            headers=AUTH_HEADERS,
        )


def _chain_execute(data):
    chain = MagicMock()
    chain.execute.return_value = MagicMock(data=data)
    return chain


def test_list_notifications_requires_auth():
    response = _client().get("/api/v1/notifications")
    assert response.status_code == 403


def test_list_notifications_returns_unread():
    mock_db = _make_mock_db()
    unread = [
        {
            "id": NOTIFICATION_ID,
            "type": "habit_reminder",
            "title": "¿Cómo va tu hábito?",
            "body": "Llevas 2 días sin completar 'Sin teléfono la primera hora'",
            "created_at": "2026-05-23T10:00:00Z",
        }
    ]

    habits_chain = _chain_execute([])
    notifications_list_chain = MagicMock()
    notifications_list_chain.select.return_value = notifications_list_chain
    notifications_list_chain.eq.return_value = notifications_list_chain
    notifications_list_chain.order.return_value = notifications_list_chain
    notifications_list_chain.execute.return_value = MagicMock(data=unread)

    def table_side_effect(name):
        if name == "habits":
            return habits_chain
        if name == "notifications":
            return notifications_list_chain
        return MagicMock()

    mock_db.table.side_effect = table_side_effect

    with (
        patch("auth.supabase", mock_db),
        patch("routers.notifications.supabase", mock_db),
        patch("services.notification_service.supabase", mock_db),
    ):
        response = _client().get("/api/v1/notifications", headers=AUTH_HEADERS)

    assert response.status_code == 200
    assert response.json() == unread


def test_list_notifications_triggers_check_habit_reminders():
    mock_db = _make_mock_db()
    unread = [
        {
            "id": NOTIFICATION_ID,
            "type": "habit_reminder",
            "title": "¿Cómo va tu hábito?",
            "body": "Llevas 2 días sin completar 'Sin teléfono la primera hora'",
            "created_at": "2026-05-23T10:00:00Z",
        }
    ]

    notifications_list_chain = MagicMock()
    notifications_list_chain.select.return_value = notifications_list_chain
    notifications_list_chain.eq.return_value = notifications_list_chain
    notifications_list_chain.order.return_value = notifications_list_chain
    notifications_list_chain.execute.return_value = MagicMock(data=unread)
    mock_db.table.return_value = notifications_list_chain

    with (
        patch("auth.supabase", mock_db),
        patch("routers.notifications.supabase", mock_db),
        patch("routers.notifications.check_habit_reminders") as mock_check,
    ):
        response = _client().get("/api/v1/notifications", headers=AUTH_HEADERS)

    assert response.status_code == 200
    assert response.json() == unread
    mock_check.assert_called_once_with(USER_ID)


def test_mark_notification_read():
    mock_db = _make_mock_db()
    update_chain = MagicMock()
    update_chain.update.return_value = update_chain
    update_chain.eq.return_value = update_chain
    update_chain.execute.return_value = MagicMock(data=[{"id": NOTIFICATION_ID}])
    mock_db.table.return_value = update_chain

    response = _mark_read(mock_db)

    assert response.status_code == 200
    assert response.json() == {"success": True}
    update_chain.update.assert_called_once_with({"read": True})


def test_mark_notification_read_not_found():
    mock_db = _make_mock_db()
    update_chain = MagicMock()
    update_chain.update.return_value = update_chain
    update_chain.eq.return_value = update_chain
    update_chain.execute.return_value = MagicMock(data=[])
    mock_db.table.return_value = update_chain

    response = _mark_read(mock_db)

    assert response.status_code == 404


def test_check_habit_reminders_creates_notification():
    mock_db = MagicMock()
    inserted_rows = []
    two_days_ago = (date.today() - timedelta(days=2)).isoformat()

    habits_chain = MagicMock()
    habits_chain.select.return_value = habits_chain
    habits_chain.eq.return_value = habits_chain
    habits_chain.execute.return_value = MagicMock(
        data=[{"id": HABIT_ID, "name": "Sin teléfono la primera hora"}]
    )

    streaks_chain = MagicMock()
    streaks_chain.select.return_value = streaks_chain
    streaks_chain.eq.return_value = streaks_chain
    streaks_chain.execute.return_value = MagicMock(
        data=[{"last_completion": two_days_ago}]
    )

    existing_chain = MagicMock()
    existing_chain.select.return_value = existing_chain
    existing_chain.eq.return_value = existing_chain
    existing_chain.gte.return_value = existing_chain
    existing_chain.execute.return_value = MagicMock(data=[])

    insert_chain = MagicMock()

    def capture_insert(row):
        inserted_rows.append(row)
        return MagicMock(execute=lambda: MagicMock())

    insert_chain.insert.side_effect = capture_insert

    call_count = {"notifications": 0}

    def table_side_effect(name):
        if name == "habits":
            return habits_chain
        if name == "streaks":
            return streaks_chain
        if name == "notifications":
            call_count["notifications"] += 1
            return existing_chain if call_count["notifications"] == 1 else insert_chain
        return MagicMock()

    mock_db.table.side_effect = table_side_effect

    with patch("services.notification_service.supabase", mock_db):
        from services.notification_service import check_habit_reminders

        check_habit_reminders(USER_ID)

    assert inserted_rows == [
        {
            "user_id": USER_ID,
            "type": "habit_reminder",
            "title": "¿Cómo va tu hábito?",
            "body": "Llevas 2 días sin completar 'Sin teléfono la primera hora'",
        }
    ]


def test_check_habit_reminders_does_not_duplicate():
    mock_db = MagicMock()
    inserted_rows = []
    two_days_ago = (date.today() - timedelta(days=3)).isoformat()

    habits_chain = MagicMock()
    habits_chain.select.return_value = habits_chain
    habits_chain.eq.return_value = habits_chain
    habits_chain.execute.return_value = MagicMock(
        data=[{"id": HABIT_ID, "name": "Meditar 5 minutos"}]
    )

    streaks_chain = MagicMock()
    streaks_chain.select.return_value = streaks_chain
    streaks_chain.eq.return_value = streaks_chain
    streaks_chain.execute.return_value = MagicMock(
        data=[{"last_completion": two_days_ago}]
    )

    existing_chain = MagicMock()
    existing_chain.select.return_value = existing_chain
    existing_chain.eq.return_value = existing_chain
    existing_chain.gte.return_value = existing_chain
    existing_chain.execute.return_value = MagicMock(data=[{"id": "existing-notif"}])

    insert_chain = MagicMock()
    insert_chain.insert.side_effect = lambda row: (
        inserted_rows.append(row) or MagicMock(execute=lambda: MagicMock())
    )

    def table_side_effect(name):
        if name == "habits":
            return habits_chain
        if name == "streaks":
            return streaks_chain
        if name == "notifications":
            return existing_chain
        return MagicMock()

    mock_db.table.side_effect = table_side_effect

    with patch("services.notification_service.supabase", mock_db):
        from services.notification_service import check_habit_reminders

        check_habit_reminders(USER_ID)

    assert inserted_rows == []


def test_check_habit_reminders_skips_recent_completion():
    mock_db = MagicMock()
    inserted_rows = []
    yesterday = (date.today() - timedelta(days=1)).isoformat()

    habits_chain = MagicMock()
    habits_chain.select.return_value = habits_chain
    habits_chain.eq.return_value = habits_chain
    habits_chain.execute.return_value = MagicMock(
        data=[{"id": HABIT_ID, "name": "Meditar 5 minutos"}]
    )

    streaks_chain = MagicMock()
    streaks_chain.select.return_value = streaks_chain
    streaks_chain.eq.return_value = streaks_chain
    streaks_chain.execute.return_value = MagicMock(
        data=[{"last_completion": yesterday}]
    )

    insert_chain = MagicMock()
    insert_chain.insert.side_effect = lambda row: (
        inserted_rows.append(row) or MagicMock(execute=lambda: MagicMock())
    )

    def table_side_effect(name):
        if name == "habits":
            return habits_chain
        if name == "streaks":
            return streaks_chain
        if name == "notifications":
            return insert_chain
        return MagicMock()

    mock_db.table.side_effect = table_side_effect

    with patch("services.notification_service.supabase", mock_db):
        from services.notification_service import check_habit_reminders

        check_habit_reminders(USER_ID)

    assert inserted_rows == []


def test_list_habits_triggers_check_habit_reminders():
    mock_db = _make_mock_db()
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[]
    )

    with (
        patch("auth.supabase", mock_db),
        patch("routers.habits.supabase", mock_db),
        patch("routers.habits.check_habit_reminders") as mock_check,
    ):
        response = _client().get("/api/v1/habits", headers=AUTH_HEADERS)

    assert response.status_code == 200
    mock_check.assert_called_once_with(USER_ID)
