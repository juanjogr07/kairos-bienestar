-- Kairós — Seed inicial de playbooks
-- Ejecutar DESPUÉS de 001_initial_schema.sql
-- Los embeddings se generan por separado con embed_playbooks.py

INSERT INTO playbooks (slug, title, signal_type, content, activates_when, crisis_escalation)
VALUES
  (
    'doomscrolling',
    'Patrón de Doomscrolling',
    'behavioral',
    'Patrón de consumo compulsivo de contenido negativo en redes sociales. Intervenciones: pausa consciente 3 min antes de abrir app, límite de sesión a 30 min, curación activa del feed. Hábito: Límite de 30 minutos en redes sociales antes de las 20:00.',
    'scroll_speed_avg > 800 OR session_duration > 60min',
    false
  ),
  (
    'attention-fragmentation',
    'Fragmentación de Atención',
    'behavioral',
    'Cambio frecuente entre apps que impide concentración profunda. Costo cognitivo de 23 min para recuperar foco tras cada interrupción. Intervenciones: bloques Pomodoro 25 min, silencio de notificaciones, revisión de redes en lotes. Hábito: Un bloque de trabajo enfocado de 25 minutos al día.',
    'app_switches_per_hour > 20 OR avg_session_min < 3',
    false
  ),
  (
    'nocturnal-use-pattern',
    'Uso Nocturno del Teléfono',
    'behavioral',
    'Uso del teléfono después de las 22:00 suprime melatonina y retrasa inicio del sueño. Intervenciones: zona libre de pantallas 1h antes de dormir, modo nocturno automático desde 20:00, alarma de desconexión a las 21:30. Hábito: Sin teléfono la última hora antes de dormir.',
    'nocturnal_ratio > 0.3 OR usage_after_22h > 45',
    false
  ),
  (
    'low-mood-indicators',
    'Indicadores de Estado de Ánimo Bajo',
    'survey_behavioral',
    'PHQ-9 scores 5-14 indican síntomas leves a moderados con buena respuesta a intervenciones conductuales. Intervenciones: activación conductual (actividad placentera diaria), rutina de sueño estable, conexión social mínima diaria. Hábito: Una actividad que disfrutes por 15 minutos al día.',
    'phq9_score >= 5 AND phq9_score < 15',
    false
  ),
  (
    'crisis-escalation',
    'Escalación a Recursos Profesionales',
    'survey',
    'Protocolo activado cuando PHQ-9 >= 15 o GAD-7 >= 15 o q9 PHQ-9 >= 1. Mensaje de recursos: Línea 106 Colombia (gratuita 24h), Crisis Text Line envía HOLA al 741741. El agente no da consejos adicionales en este estado.',
    'phq9_score >= 15 OR gad7_score >= 15 OR phq9_q9 >= 1',
    true
  )
ON CONFLICT (slug) DO UPDATE
  SET title = EXCLUDED.title,
      content = EXCLUDED.content,
      activates_when = EXCLUDED.activates_when,
      crisis_escalation = EXCLUDED.crisis_escalation;
