"""
Feature engineering for ML models.
Extracts the 7-feature vector from usage_events data or a pre-built dict.
"""
import numpy as np

FEATURE_NAMES = [
    "total_minutes",
    "nocturnal_ratio",
    "social_ratio",
    "avg_scroll_speed",
    "session_count",
    "max_session_minutes",
    "productive_ratio",
]

SOCIAL_DOMAINS = {"instagram.com", "twitter.com", "x.com", "tiktok.com", "facebook.com", "reddit.com"}
PRODUCTIVE_DOMAINS = {"docs.google.com", "notion.so", "github.com", "gmail.com", "outlook.com", "linear.app"}
NOCTURNAL_HOURS = set(range(22, 24)) | set(range(0, 7))


def build_feature_vector(features: dict) -> np.ndarray:
    """Convert a feature dict to a numpy array in FEATURE_NAMES order."""
    return np.array([[features[k] for k in FEATURE_NAMES]], dtype=float)


def extract_features_from_events(events: list[dict]) -> dict:
    """
    Compute the 7 features from a list of usage_event dicts.

    Each event must have:
        domain (str), duration_seconds (int), timestamp (ISO str),
        scroll_speed (float, optional)
    """
    if not events:
        return {k: 0.0 for k in FEATURE_NAMES}

    total_seconds = sum(e.get("duration_seconds", 0) for e in events)
    total_minutes = total_seconds / 60.0

    nocturnal_seconds = sum(
        e.get("duration_seconds", 0)
        for e in events
        if _is_nocturnal(e.get("timestamp", ""))
    )
    nocturnal_ratio = nocturnal_seconds / total_seconds if total_seconds else 0.0

    social_seconds = sum(
        e.get("duration_seconds", 0)
        for e in events
        if _is_social(e.get("domain", ""))
    )
    social_ratio = social_seconds / total_seconds if total_seconds else 0.0

    productive_seconds = sum(
        e.get("duration_seconds", 0)
        for e in events
        if _is_productive(e.get("domain", ""))
    )
    productive_ratio = productive_seconds / total_seconds if total_seconds else 0.0

    scroll_speeds = [e["scroll_speed"] for e in events if e.get("scroll_speed") is not None]
    avg_scroll_speed = float(np.mean(scroll_speeds)) if scroll_speeds else 0.0

    session_count = len(events)

    durations = [e.get("duration_seconds", 0) / 60.0 for e in events]
    max_session_minutes = float(max(durations)) if durations else 0.0

    return {
        "total_minutes": total_minutes,
        "nocturnal_ratio": nocturnal_ratio,
        "social_ratio": social_ratio,
        "avg_scroll_speed": avg_scroll_speed,
        "session_count": float(session_count),
        "max_session_minutes": max_session_minutes,
        "productive_ratio": productive_ratio,
    }


def _is_nocturnal(timestamp: str) -> bool:
    try:
        hour = int(timestamp[11:13])
        return hour in NOCTURNAL_HOURS
    except (IndexError, ValueError):
        return False


def _is_social(domain: str) -> bool:
    return any(sd in domain for sd in SOCIAL_DOMAINS)


def _is_productive(domain: str) -> bool:
    return any(pd in domain for pd in PRODUCTIVE_DOMAINS)
