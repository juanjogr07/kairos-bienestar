from models.events import UsageEvent
from datetime import datetime, timezone


def test_domain_sanitization():
    event = UsageEvent(
        domain="www.Instagram.com",
        duration_seconds=120,
        event_type="tab_active",
        timestamp=datetime.now(timezone.utc),
    )
    assert event.domain == "instagram.com"


def test_domain_lowercase():
    event = UsageEvent(
        domain="YouTube.COM",
        duration_seconds=60,
        event_type="tab_active",
        timestamp=datetime.now(timezone.utc),
    )
    assert event.domain == "youtube.com"


def test_scroll_speed_optional():
    event = UsageEvent(
        domain="youtube.com",
        duration_seconds=60,
        event_type="scroll",
        timestamp=datetime.now(timezone.utc),
    )
    assert event.scroll_speed is None
