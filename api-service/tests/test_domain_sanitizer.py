from models.events import UsageEvent
from datetime import datetime, timezone


def _event(domain: str) -> UsageEvent:
    return UsageEvent(
        domain=domain,
        duration_seconds=60,
        event_type="tab_active",
        timestamp=datetime.now(timezone.utc),
    )


def test_strips_https_protocol():
    assert _event("https://instagram.com").domain == "instagram.com"


def test_strips_http_protocol():
    assert _event("http://youtube.com").domain == "youtube.com"


def test_strips_www_prefix():
    assert _event("www.reddit.com").domain == "reddit.com"


def test_strips_www_after_protocol():
    assert _event("https://www.facebook.com").domain == "facebook.com"


def test_strips_path():
    assert _event("twitter.com/home/feed").domain == "twitter.com"


def test_strips_query_string():
    assert _event("google.com?q=search").domain == "google.com"


def test_strips_fragment():
    assert _event("youtube.com#watch").domain == "youtube.com"


def test_strips_port():
    assert _event("localhost:3000").domain == "localhost"


def test_lowercases():
    assert _event("Instagram.COM").domain == "instagram.com"


def test_combined_sanitization():
    assert _event("HTTPS://WWW.Twitter.Com/feed?utm=123").domain == "twitter.com"


def test_plain_domain_unchanged():
    assert _event("tiktok.com").domain == "tiktok.com"
