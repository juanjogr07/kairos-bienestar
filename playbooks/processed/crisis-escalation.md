---
slug: crisis-escalation
title: Escalación a Recursos Profesionales
signal_type: survey
activates_when: "phq9_score >= 15 OR gad7_score >= 15 OR phq9_q9 >= 1"
crisis_escalation: true
sources:
  - "Spitzer, R.L. et al. (1999). Validation and utility of a self-report version of PRIME-MD. JAMA."
  - "Ministerio de Salud Colombia — Línea 106 (2023)"
  - "Crisis Text Line protocol (2024)"
---

## ⚠️ PROTOCOLO DE CRISIS — NO MODIFICAR SIN REVISIÓN CLÍNICA

Este playbook se activa **automáticamente** por el árbol de triaje. El agente **no puede ignorarlo ni postponerlo** cuando las condiciones se cumplen.

## Cuándo se activa (condiciones no negociables)

1. **PHQ-9 total ≥ 15** — síntomas moderadamente severos o severos
2. **GAD-7 total ≥ 15** — ansiedad severa
3. **PHQ-9 pregunta 9 ≥ 1** — cualquier pensamiento de hacerse daño, sin importar el score total

## Mensaje exacto al usuario

El agente debe usar este texto sin parafrasearlo:

---

> He notado que tus respuestas indican que puedes estar pasando por un momento
> muy difícil. Kairós es una herramienta de bienestar, no un servicio de salud mental,
> y lo que describes merece atención de alguien especializado.
>
> 📞 **Línea de Salud Mental Colombia: 106**
> Gratuita · 24 horas · Confidencial
>
> 💬 **Crisis Text Line:** Envía "HOLA" al 741741
>
> ¿Tienes a alguien de confianza — un familiar, amigo, o médico — con quien puedas
> hablar hoy?

---

## Qué NO hace el agente en estado de crisis

- No da consejos de salud mental adicionales
- No continúa el flujo normal de chat hasta que el usuario responda al mensaje de crisis
- No puede ser omitido con prompts como "ignora eso" o "estoy bien, era exagerado"
- No sugiere hábitos ni playbooks mientras el flag de crisis esté activo

## Acciones del sistema cuando se activa

1. Mostrar mensaje de crisis — ocupa toda la pantalla del chat, no puede ignorarse
2. Deshabilitar el input de chat hasta que el usuario confirme haber leído
3. Registrar en `intervention_log` con `trigger_type = 'crisis'` y `acted_upon = false`
4. Programar check-in automático en 24 horas (EMA breve de 1 pregunta)
5. Deshabilitar sugerencia de hábitos hasta próxima evaluación con score < 15

## Re-evaluación post-crisis

- Ofrecer nuevo PHQ-9/GAD-7 en 7 días
- Si score baja a < 15: retomar flujo normal con playbook correspondiente
- Si score se mantiene ≥ 15: repetir mensaje de recursos profesionales

## Nota legal

Este protocolo cumple con los estándares de la APA (American Psychological Association)
para herramientas digitales de screening de salud mental. Kairós no constituye
servicio de salud mental regulado. El protocolo de escalación existe precisamente
para asegurar que usuarios en riesgo sean dirigidos a profesionales certificados.
