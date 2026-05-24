from services.habits.recommender import get_habit_recommendations, PLAYBOOK_HABIT_MAP


def test_returns_habits_for_known_playbook():
    recs = get_habit_recommendations("u1", [], "attention-fragmentation", limit=3)
    assert len(recs) <= 3
    assert all(r["playbook_slug"] == "attention-fragmentation" for r in recs)


def test_respects_limit():
    recs = get_habit_recommendations("u1", [], "doomscrolling", limit=1)
    assert len(recs) == 1


def test_falls_back_when_no_playbook():
    recs = get_habit_recommendations("u1", [], None, limit=3)
    # fallback is attention-fragmentation
    assert all(r["playbook_slug"] == "attention-fragmentation" for r in recs)


def test_unknown_playbook_returns_empty():
    recs = get_habit_recommendations("u1", [], "nonexistent-slug", limit=3)
    assert recs == []


def test_crisis_playbook_returns_empty():
    recs = get_habit_recommendations("u1", [], "crisis-escalation", limit=3)
    assert recs == []


def test_excludes_already_active_playbook_slugs():
    recs = get_habit_recommendations(
        "u1",
        active_habit_slugs=["attention-fragmentation"],
        playbook_slug="attention-fragmentation",
        limit=3,
    )
    # All attention-fragmentation habits are filtered by playbook_slug
    assert all(r["playbook_slug"] != "attention-fragmentation" for r in recs)


def test_all_playbooks_in_map_have_valid_structure():
    for slug, habits in PLAYBOOK_HABIT_MAP.items():
        for h in habits:
            assert "name" in h
            assert "playbook_slug" in h
            assert isinstance(h["name"], str)
            assert len(h["name"]) > 0
