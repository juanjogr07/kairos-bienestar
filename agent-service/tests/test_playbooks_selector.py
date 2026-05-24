from triage.playbooks import (
    PLAYBOOK_METADATA,
    get_active_playbook,
    build_rag_query,
    list_all_slugs,
)


def test_all_9_playbooks_in_metadata():
    assert len(PLAYBOOK_METADATA) == 9


def test_each_playbook_has_required_fields():
    for slug, meta in PLAYBOOK_METADATA.items():
        assert "signal_type" in meta, f"{slug} missing signal_type"
        assert "activates_when" in meta, f"{slug} missing activates_when"
        assert "rag_query_template" in meta, f"{slug} missing rag_query_template"
        assert len(meta["rag_query_template"]) > 5, f"{slug} rag_query_template too short"


def test_get_active_playbook_returns_slug():
    result = {"level": "digital", "playbook_slug": "doomscrolling"}
    assert get_active_playbook(result) == "doomscrolling"


def test_get_active_playbook_returns_none_for_default():
    result = {"level": "default", "playbook_slug": None}
    assert get_active_playbook(result) is None


def test_build_rag_query_returns_template():
    q = build_rag_query("nocturnal-use-pattern")
    assert "nocturno" in q.lower() or "noche" in q.lower()


def test_build_rag_query_unknown_slug_returns_humanized():
    q = build_rag_query("unknown-slug")
    assert "unknown slug" == q  # hyphens replaced with spaces


def test_list_all_slugs_returns_9():
    slugs = list_all_slugs()
    assert len(slugs) == 9


def test_crisis_escalation_in_slugs():
    assert "crisis-escalation" in list_all_slugs()


def test_momentum_builder_in_slugs():
    assert "momentum-builder" in list_all_slugs()
