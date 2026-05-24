"""Tests — CV integration into triage tree (NIVEL 7: physical)."""
from unittest.mock import patch


class TestCVTriageIntegration:
    def test_eye_strain_triggers_physical_level(self):
        from triage.tree import run_triage
        with patch("triage.tree.get_survey_scores", return_value={"crisis_flag": False}), \
             patch("triage.tree.get_ml_scores", return_value={}), \
             patch("triage.tree.get_usage_summary", return_value={}), \
             patch("triage.tree._safe_get_forecast", return_value={"relapse_risk_score": 0.0}), \
             patch("triage.tree.get_cv_scores", return_value={
                 "cv_available": True, "eye_strain_score": 0.85,
                 "posture_score": 0.9, "distraction_risk_score": 0.1,
                 "environment_context": "workspace", "blink_rate_rpm": 5.0,
             }):
            result = run_triage("user-123")
        assert result["level"] == "physical"
        assert result["playbook_slug"] == "eye-strain-alert"

    def test_bad_posture_triggers_physical_level(self):
        from triage.tree import run_triage
        with patch("triage.tree.get_survey_scores", return_value={"crisis_flag": False}), \
             patch("triage.tree.get_ml_scores", return_value={}), \
             patch("triage.tree.get_usage_summary", return_value={}), \
             patch("triage.tree._safe_get_forecast", return_value={"relapse_risk_score": 0.0}), \
             patch("triage.tree.get_cv_scores", return_value={
                 "cv_available": True, "eye_strain_score": 0.1,
                 "posture_score": 0.25, "distraction_risk_score": 0.0,
                 "environment_context": "workspace", "blink_rate_rpm": 16.0,
             }):
            result = run_triage("user-123")
        assert result["level"] == "physical"
        assert result["playbook_slug"] == "posture-correction"

    def test_bedroom_distraction_triggers_physical_level(self):
        from triage.tree import run_triage
        with patch("triage.tree.get_survey_scores", return_value={"crisis_flag": False}), \
             patch("triage.tree.get_ml_scores", return_value={}), \
             patch("triage.tree.get_usage_summary", return_value={}), \
             patch("triage.tree._safe_get_forecast", return_value={"relapse_risk_score": 0.0}), \
             patch("triage.tree.get_cv_scores", return_value={
                 "cv_available": True, "eye_strain_score": 0.1,
                 "posture_score": 0.8, "distraction_risk_score": 0.75,
                 "environment_context": "bedroom", "blink_rate_rpm": 14.0,
             }):
            result = run_triage("user-123")
        assert result["level"] == "physical"
        assert result["playbook_slug"] == "nocturnal-use-pattern"

    def test_cv_unavailable_skips_physical_level(self):
        from triage.tree import run_triage
        with patch("triage.tree.get_survey_scores", return_value={"crisis_flag": False}), \
             patch("triage.tree.get_ml_scores", return_value={}), \
             patch("triage.tree.get_usage_summary", return_value={}), \
             patch("triage.tree._safe_get_forecast", return_value={"relapse_risk_score": 0.0}), \
             patch("triage.tree.get_cv_scores", return_value={"cv_available": False}):
            result = run_triage("user-123")
        assert result["level"] == "default"

    def test_crisis_takes_priority_over_cv(self):
        from triage.tree import run_triage
        with patch("triage.tree.get_survey_scores", return_value={"crisis_flag": True}), \
             patch("triage.tree.get_cv_scores", return_value={
                 "cv_available": True, "eye_strain_score": 0.99,
             }):
            result = run_triage("user-123")
        assert result["level"] == "crisis"

    def test_eye_strain_threshold_boundary(self):
        from triage.tree import run_triage
        with patch("triage.tree.get_survey_scores", return_value={"crisis_flag": False}), \
             patch("triage.tree.get_ml_scores", return_value={}), \
             patch("triage.tree.get_usage_summary", return_value={}), \
             patch("triage.tree._safe_get_forecast", return_value={"relapse_risk_score": 0.0}), \
             patch("triage.tree.get_cv_scores", return_value={
                 "cv_available": True, "eye_strain_score": 0.70,  # exactly at threshold
                 "posture_score": 0.9, "distraction_risk_score": 0.1,
                 "environment_context": "workspace", "blink_rate_rpm": 14.0,
             }):
            result = run_triage("user-123")
        assert result["level"] == "default"  # threshold is > 0.70, not >=

    def test_posture_threshold_boundary(self):
        from triage.tree import run_triage
        with patch("triage.tree.get_survey_scores", return_value={"crisis_flag": False}), \
             patch("triage.tree.get_ml_scores", return_value={}), \
             patch("triage.tree.get_usage_summary", return_value={}), \
             patch("triage.tree._safe_get_forecast", return_value={"relapse_risk_score": 0.0}), \
             patch("triage.tree.get_cv_scores", return_value={
                 "cv_available": True, "eye_strain_score": 0.1,
                 "posture_score": 0.40,  # exactly at threshold — should NOT trigger
                 "distraction_risk_score": 0.0,
                 "environment_context": "workspace", "blink_rate_rpm": 14.0,
             }):
            result = run_triage("user-123")
        assert result["level"] == "default"  # threshold is < 0.40, not <=
