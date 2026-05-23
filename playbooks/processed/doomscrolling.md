---
slug: doomscrolling
title: Patrón de Doomscrolling
signal_type: behavioral
activates_when: "scroll_speed_avg > 800 OR session_duration > 60min en redes sociales"
crisis_escalation: false
sources:
  - "Twenge, J.M. et al. (2018). Increases in Depressive Symptoms. Clinical Psychological Science."
  - "Ryff, C.D. (2014). Psychological Well-Being Revisited. Psychotherapy and Psychosomatics."
  - "Vannucci, A. et al. (2017). Social media use and anxiety in emerging adults. Computers in Human Behavior."
---

## ¿Qué es el doomscrolling?

El doomscrolling es el patrón de consumo compulsivo y acelerado de contenido mayoritariamente negativo en redes sociales. Se caracteriza por sesiones largas con alta velocidad de desplazamiento y sensación de incapacidad para detener el scroll.

## Señales que Kairós detecta

- Velocidad de scroll superior a 800 px/s mantenida por más de 5 minutos consecutivos
- Sesiones de más de 60 minutos sin interrupción en dominios de redes sociales (Instagram, Twitter/X, TikTok, Reddit)
- Patrón de uso que aumenta progresivamente en las últimas 2 semanas
- Actividad concentrada en horario nocturno (22:00–01:00)

## Impacto en el bienestar (evidencia)

Estudios con más de 500,000 adolescentes y adultos jóvenes muestran correlación entre uso intensivo de redes sociales (>3h/día) y:
- Reducción de la calidad del sueño (OR 1.7)
- Aumento de síntomas de ansiedad leve (OR 1.4)
- Reducción de satisfacción vital autoreportada

La causalidad no está establecida — la correlación es bidireccional.

## Intervenciones basadas en evidencia

**Intervención 1 — Pausa consciente (evidencia fuerte)**
Insertar 3 minutos de pausa antes de abrir la app. Estudios de diseño de pausa intencional muestran reducción del 23% del tiempo total de uso. En Kairós: overlay de pausa consciente antes de abrir dominios marcados.

**Intervención 2 — Límite de sesión visible**
Notificación a los 20 minutos de sesión continua. Recordatorio no bloqueante — la decisión es del usuario.

**Intervención 3 — Curación activa del feed**
Seguir activamente cuentas que generan emociones positivas. Dejar de seguir fuentes de contenido que producen malestar. Acción: 5 minutos de revisión del feed una vez por semana.

**Intervención 4 — Horario de uso**
Establecer una ventana de uso (ej. 18:00–20:00) fuera de las cuales el teléfono está en modo silencio. Efectividad reportada: reducción del 31% del uso total.

## Hábito sugerido para Kairós

`"Límite de 30 minutos en redes sociales antes de las 20:00"`

Frecuencia: diaria. Nivel de dificultad: moderado. Tiempo para formar hábito: ~21 días.

## Lenguaje aprobado para el agente

**Usar:**
- "Detecté un patrón de uso intensivo que puede estar afectando tu energía y sueño"
- "En los últimos 3 días, el tiempo en redes sociales aumentó un 40%"
- "Una pausa antes de abrir Instagram puede ayudarte a elegir conscientemente si quieres entrar"

**No usar:**
- "Estás desarrollando una adicción"
- "El uso de redes sociales te está deprimiendo"
- "Necesitas reducir tu uso" (prescriptivo)
