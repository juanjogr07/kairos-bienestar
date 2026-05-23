---
slug: low-mood-indicators
title: Indicadores de Estado de Ánimo Bajo
signal_type: survey_behavioral
activates_when: "phq9_score >= 5 AND phq9_score < 15"
crisis_escalation: false
sources:
  - "Kroenke, K. et al. (2001). The PHQ-9: Validity of a Brief Depression Severity Measure. JGIM."
  - "Mohr, D.C. et al. (2017). Personal Sensing: Understanding Mental Health Using Ubiquitous Sensors. npj Digital Medicine."
  - "Cuijpers, P. et al. (2019). Psychological treatment of depression in primary care. BMJ."
---

## Contexto

El PHQ-9 (Patient Health Questionnaire) es el screening de síntomas depresivos más validado a nivel mundial. Scores entre 5 y 14 indican síntomas leves a moderados que responden muy bien a intervenciones conductuales de bajo umbral, sin necesidad de intervención clínica inmediata.

**Importante:** Kairós usa el PHQ-9 como herramienta de screening, no de diagnóstico. Un score elevado indica que vale la pena prestar atención, no que existe una condición clínica.

## Señales que Kairós detecta

- PHQ-9 total entre 5 y 14
- Posible reducción del uso digital total (puede indicar menor energía/motivación)
- Patrón de uso nocturno en aumento (asociado con disregulación del estado de ánimo)
- Interrupción de rachas de hábitos en la última semana

## Indicadores del PHQ-9 (referencia para el agente)

| Score | Interpretación | Acción Kairós |
|---|---|---|
| 1–4 | Mínimo | Solo monitoreo pasivo |
| 5–9 | Leve | Activar este playbook |
| 10–14 | Moderado | Activar este playbook + sugerir consulta si persiste |
| 15–19 | Moderadamente severo | **Activar crisis-escalation** |
| 20–27 | Severo | **Activar crisis-escalation** |

## Intervenciones basadas en evidencia (scores 5–14)

**Intervención 1 — Activación conductual (evidencia fuerte)**
Realizar una actividad placentera pequeña cada día, aunque no haya ganas. La activación conductual es la intervención con más evidencia para síntomas leves. No requiere "sentir ganas" — basta con actuar.
Ejemplos: 15 min de caminata, escuchar música favorita, cocinar algo rico, llamar a un amigo.

**Intervención 2 — Rutina de sueño estable**
Acostarse y levantarse a la misma hora 5 días de la semana. La regularidad del sueño tiene efecto directo sobre la regulación emocional.

**Intervención 3 — Conexión social mínima**
Un mensaje, llamada o encuentro breve con alguien de confianza al día. El aislamiento social amplifica los síntomas; la conexión los amortigua.

**Intervención 4 — Reducción de noticias negativas**
Limitar el consumo de noticias a 15 minutos al día en un horario definido. El consumo pasivo e ilimitado de noticias negativas aumenta la sensación de impotencia.

## Hábito sugerido para Kairós

`"Una actividad que disfrutes por 15 minutos al día"`

Frecuencia: diaria. Nivel de dificultad: bajo (elegir algo que antes gustaba). Tiempo para notar cambio: 7–10 días.

## Seguimiento que debe hacer Kairós

- Sugerir re-evaluación PHQ-9 en 7 días
- Si en 14 días el score no baja o sube: sugerir consulta con profesional de salud
- Monitorear si el score alcanza 15: activar crisis-escalation inmediatamente

## Lenguaje aprobado para el agente

**Usar:**
- "Tu score en la evaluación de bienestar indica que puedes estar pasando por un momento de menor energía"
- "Este tipo de fluctuaciones son normales. Hay cosas pequeñas que ayudan mucho"
- "¿Hay alguna actividad que antes disfrutabas y que podrías retomar esta semana, aunque sea por 15 minutos?"

**No usar:**
- "Tienes síntomas de depresión"
- "Tu PHQ-9 indica que estás deprimido/a"
- "Deberías ir al psicólogo" (sin que hayan intentado las intervenciones conductuales primero)
- "Todo va a estar bien" (invalidante y vacío)
