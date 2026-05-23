# Kairós — Concepto de Producto

> **Nota sobre el nombre:** "Kairós" (griego: *el momento oportuno*) es un nombre de trabajo para que el documento se lea bien. Al final propongo alternativas. Puedes cambiarlo cuando quieras.

> **Estado:** este es el documento de **idea/concepto**, no el plan de ejecución. Su objetivo es que la visión quede sólida, defendible y priorizada antes de hacer roadmap.

---

## 1. La idea en una frase

**Kairós es un copiloto de bienestar digital y físico: un asistente de IA que detecta tu estado real a partir de varias señales (uso del teléfono, navegador, sesiones con cámara, autorreporte y datos de salud), identifica patrones con modelos de machine learning, y te acompaña con hábitos, intervenciones y métricas para mejorar tu atención, reducir distracciones y cuidar tu salud mental — sin pretender ser un médico.**

Esa última cláusula no es decorativa: es la decisión de diseño más importante de todo el proyecto. Volveré a ella en la sección de viabilidad legal.

---

## 2. El problema y por qué ahora

El problema es conocido: las plataformas de atención están diseñadas para capturar tiempo, y eso correlaciona con ansiedad, sueño deteriorado y pérdida de foco. Lo que cambió y hace este el momento correcto:

- **El mercado está validado y creciendo rápido.** Según informes de 2026, el mercado de plataformas de *digital wellbeing* ronda los **6.400 millones USD** y crece a un CAGR cercano al **19,6%**; el de apps de bienestar y salud mental se estima en **~5.780 millones USD en 2026** creciendo al **16% anual**. No es un nicho experimental.
- **Hay prueba de que un equipo pequeño puede ganar.** Opal, una app de foco, llegó a **~10 millones USD de ingresos recurrentes anuales con solo 11 personas** y un único *seed* de ~4,3M USD. Demuestra que el producto enfocado vence al producto enorme.
- **La IA cambió lo posible.** Hace tres años, "un asistente que razona sobre tus datos de comportamiento" era ciencia ficción de producto. Hoy un LLM puede orquestar modelos de ML como herramientas y narrar insights en lenguaje natural.
- **El hueco real:** la mayoría de competidores hacen *una* cosa (bloquear apps, o medir tiempo, o registrar ánimo). Casi nadie **fusiona señales de varias fuentes y las convierte en acompañamiento accionable**. Ahí está tu espacio.

---

## 3. El concepto: qué es Kairós

Kairós no es "otra app de screen time". Es una **capa de inteligencia** sobre los datos de comportamiento de la persona. Tiene tres caras:

1. **Sensor** — recolecta señales desde donde puede (app Android, extensión de navegador, sesiones de cámara opt-in, cuestionarios, datos de salud).
2. **Cerebro** — un agente de IA que usa modelos de ML como herramientas para detectar patrones, estimar señales de riesgo y decidir qué recomendar.
3. **Acompañante** — una web/app que muestra métricas, sugiere hábitos basados en evidencia, sostiene rachas e interviene en el momento (no solo informa: actúa).

La arquitectura técnica correcta — y esto tu PDF ya lo confirma — es **híbrida multi-fuente**: la app Android y la extensión son los *sensores*, el backend es el *cerebro*, la web es el *acompañante*. En iOS, donde el sistema bloquea el acceso a datos crudos, se sustituye con autorreporte enriquecido, OCR de capturas de Screen Time, atajos (Shortcuts) e integración con Apple Health.

---

## 4. Los cinco módulos del sistema

### 4.1 Módulo de Sensado (Sensing)
Recolección desde múltiples fuentes, priorizando privacidad:
- **Android:** `UsageStatsManager` (tiempo por app, sesiones), `NotificationListenerService` (frecuencia de interrupciones), opcionalmente `AccessibilityService` (detección de scroll compulsivo — con la salvedad de revisión de Play Store).
- **Navegador:** extensión con `chrome.tabs`, `chrome.idle`, content scripts para velocidad de scroll.
- **Cámara (opt-in, por sesión — ver 5.4):** atención, postura, presencia, objetos del entorno.
- **Salud:** Apple HealthKit / Health Connect (sueño, actividad, variabilidad cardíaca).
- **Autorreporte:** micro-encuestas EMA (*Ecological Momentary Assessment*) y cuestionarios validados.

Principio rector: **on-device primero, sincronizar solo datos agregados**, nunca URLs ni contenido.

### 4.2 Módulo de Inteligencia (el agente + ML) — el corazón del producto
Detallado en la sección 5. Es lo que te diferencia.

### 4.3 Módulo de Hábitos y Rachas
Detallado en la sección 6.

### 4.4 Módulo de Intervención
No basta con mostrar gráficas. Kairós **actúa en el momento**: pausa consciente antes de abrir una app de riesgo (mecánica tipo One Sec), overlay amigable cuando detecta doomscrolling, recordatorios contextuales, ejercicios de respiración, preguntas reflexivas. La intervención es lo que convierte "dashboard" en "cambio de conducta".

### 4.5 Módulo de Insights y Reportes
Reportes semanales narrados por el LLM, comparación contra tus propios históricos (nunca contra otros usuarios — eso genera comparación social, justo lo que combates), y una "vista de terapeuta" opcional con acceso por roles para quien quiera compartir datos con un profesional.

---

## 5. La arquitectura de IA: el agente que usa ML como herramientas

Esta es la parte que más te interesa, así que la desarrollo a fondo. El concepto clave:

> **El LLM no "es" la inteligencia. El LLM es el orquestador. La inteligencia real está en los modelos de ML especializados, que el LLM invoca como herramientas (tools).**

Esto es un patrón moderno y sólido (*agent + tools*). El LLM razona, decide qué herramienta llamar, interpreta el resultado y lo traduce a lenguaje humano. Los modelos de ML hacen el trabajo numérico que un LLM hace mal.

### 5.1 El agente orquestador (LLM)
Recomendación honesta: **no fine-tunees un LLM.** Es caro, frágil y casi nunca necesario. En su lugar:
- Usa un LLM hospedado (Claude, GPT u open-source tipo Llama) vía API.
- Dale **herramientas** (las de abajo) que puede llamar.
- Dale **conocimiento** vía RAG (*Retrieval-Augmented Generation*): un índice vectorial sobre tu base de "blueprints" (5.3). Así el modelo responde con tu documentación, no con lo que recuerde.
- El "fine-tuning" lo reservas para los modelos pequeños de ML/visión, donde sí rinde.

### 5.2 El árbol de decisión — reframe obligatorio: de "diagnóstico" a **triaje**
Pediste "un árbol de decisiones completo para describir con qué problemas está pasando" la persona. Hay que reformularlo, y no es un capricho:

- Un sistema que **diagnostica** = dispositivo médico regulado. Riesgo legal alto, sin certificación = ilegal de vender en muchos mercados.
- Un sistema que **hace screening, triaje y deriva** = herramienta de bienestar. Legal, ético, y de hecho **más creíble**.

El árbol entonces es un **árbol de triaje**, no de diagnóstico. Funciona así:

1. **Entrada:** señales de comportamiento (uso nocturno, fragmentación de sesiones, doomscrolling) + resultados de **cuestionarios validados** (PHQ-9 para ánimo, GAD-7 para ansiedad — son de dominio público y científicamente respaldados; usarlos es mucho más defendible que un árbol casero).
2. **Ramas:** según umbrales, el árbol enruta hacia un *playbook* relevante ("señales de atención fragmentada", "patrón de uso nocturno", "indicadores de ánimo bajo").
3. **Salida:** nunca "tienes depresión". Sí: *"Tus respuestas y patrones muestran señales que vale la pena atender. Aquí tienes un plan, y si esto persiste, considera hablar con un profesional."*
4. **Escalamiento de crisis:** si el cuestionario detecta señales de riesgo serio, el árbol **siempre** deriva a recursos de ayuda profesional de inmediato. Esta rama no es negociable y debe diseñarse con un clínico.

El árbol puede ser híbrido: reglas explícitas (transparentes, auditables) para el enrutamiento principal, y un clasificador ML (5.5) para afinar la confianza de cada señal.

### 5.3 El "blueprint agent": base de conocimiento de playbooks
Tu idea de "un blueprint con documentación para cada tipo de diagnóstico" se convierte en: **una biblioteca de *playbooks* basados en evidencia**, uno por cada tipo de señal/objetivo. Cada playbook contiene:
- Qué señales lo activan.
- Qué dice la evidencia (con referencias — *digital phenotyping*, los papers de tu PDF).
- Hábitos e intervenciones recomendadas, ordenadas por esfuerzo/impacto.
- Cuándo recomendar ayuda profesional.
- El lenguaje aprobado para comunicarlo (revisado por un clínico).

El LLM **no inventa** consejo: recupera el playbook vía RAG y lo personaliza con los datos de la persona. Esto te da control de calidad, trazabilidad y seguridad. Es, literalmente, tu activo más valioso y defendible.

### 5.4 El módulo de visión por computadora — reframe honesto: **Focus Sessions**
Pediste un sistema que use la cámara del teléfono y la computadora para monitorear hábitos con detección de objetos y segmentación. Es técnicamente posible, pero **monitoreo de cámara siempre encendido es inviable**: drena batería, es un infierno de privacidad, y la gente no lo aceptará. La versión viable y atractiva:

**"Focus Session"** — el usuario *inicia* una sesión de trabajo enfocado de duración definida. Durante esa sesión, y solo entonces, la cámara analiza **en el dispositivo** (nada de video al servidor — solo métricas):
- **Presencia y atención:** ¿está la persona en su puesto? ¿mirando la pantalla o el teléfono?
- **Postura:** detección de encorvamiento (salud física).
- **Teléfono en mano:** detectar el objeto "teléfono" como señal de distracción.
- **Entorno:** segmentación ligera del espacio (¿escritorio ordenado? ¿el teléfono está a la vista?) para sugerencias de ambiente.

Al terminar la sesión: un puntaje de foco, no un video. Los datos crudos nunca salen del aparato.

**Modelos preentrenados a usar (tu requisito de "preentrenado + fine-tuning"):**
- **MediaPipe** (Google) — face landmarks, pose, hand tracking. Corre on-device, listo para atención/postura/teléfono-en-mano. Casi sin fine-tuning.
- **YOLOv8/v11** — detección de objetos del entorno; fine-tuning ligero con tus clases relevantes (teléfono, escritorio, etc.).
- **SAM 2** (Meta) — segmentación, si quieres análisis fino del entorno. Pesado; considéralo "fase avanzada".
- Despliegue on-device: **TensorFlow Lite** (Android), **Core ML** (iOS), **ONNX Runtime** (web/desktop).

Para detección de fatiga/somnolencia puedes usar *eye aspect ratio* sobre los landmarks de MediaPipe — heurística clásica, sin entrenar nada.

### 5.5 Los modelos de ML de comportamiento (tabulares / series de tiempo)
Estos no son "preentrenados" en el sentido de visión: son ligeros y se entrenan con datos. Tu PDF ya los listó bien:
- **Clustering (K-Means):** segmentar al usuario en perfiles ("nocturno", "compulsivo matutino", "binge de fin de semana").
- **Detección de anomalías (Isolation Forest / LSTM Autoencoder):** marcar días atípicos de uso elevado, posibles correlatos de eventos vitales.
- **Series de tiempo (Prophet):** modelar patrones y anticipar riesgo de recaída de hábitos.
- **Scoring de señales (Gradient Boosting / XGBoost):** estimar la confianza de cada señal del árbol de triaje a partir de las *features* de comportamiento.
- **Correlación (Pearson/Spearman):** relacionar features de uso con puntajes PHQ-9/GAD-7 autorreportados.

El dataset público **StudentLife** (Dartmouth) sirve para arrancar y hacer *benchmark* antes de tener datos propios.

### 5.6 Cómo encaja todo (flujo)
```
Señales (uso, cámara, salud, EMA)
        │
        ▼
[Modelos ML]  ← feature extraction, clustering, anomalías, CV on-device
        │  (resultados numéricos: scores, clusters, flags)
        ▼
[Agente LLM]  ← decide herramientas, recupera playbooks (RAG),
        │       razona y narra
        ▼
[Árbol de triaje]  → enruta a playbook → recomienda hábitos / interviene
        │
        ▼
Web/App: métricas · insights narrados · rachas · intervención
        │
        └──► (si hay señal de crisis) → derivación a ayuda profesional
```

---

## 6. Hábitos, rachas y métricas de desempeño

El sistema de hábitos es lo que retiene usuarios. Diseño:

- **Sugerencia de hábitos personalizada:** el agente propone hábitos del playbook activo, ordenados por impacto/esfuerzo (ej. "sin teléfono la primera hora", "límite de 30 min en Instagram", "modo gris nocturno").
- **Rachas (streaks):** una racha por hábito. Cuidado de diseño — las rachas motivan pero también generan culpa; incluye "días de gracia" y un tono compasivo cuando se rompe una racha (esto importa: estás construyendo una herramienta de bienestar, no un látigo).
- **Métricas de desempeño:** tiempo de foco, ratio de uso nocturno, número de sesiones por app, *bounce rate* (sesiones < 30s), puntaje de Focus Session, adherencia a hábitos. Siempre comparadas **contra el propio histórico de la persona**, nunca contra otros.
- **Reportes semanales narrados:** el LLM convierte los números en una historia útil ("esta semana redujiste el uso nocturno un 20%, y tus sesiones de foco fueron más largas los días que dormiste bien").

---

## 7. Investigación de mercado y viabilidad

### 7.1 Tamaño y crecimiento del mercado
| Segmento | Tamaño (~2025-26) | Proyección | CAGR |
|---|---|---|---|
| Plataformas de digital wellbeing | ~6,4 B USD (2025) | ~15,3 B USD (2033) | ~19,6% |
| Apps de bienestar y salud mental | ~5,8 B USD (2026) | ~20,3 B USD (2035) | ~16% |
| Software de gestión de screen time | ~3,8 B USD (2025) | ~9,7 B USD (2034) | ~10,9% |

*Fuentes: informes de HTF Market Insights, Business Research Insights, Dataintelo (2025-26). Las cifras de "tamaño de mercado" de estas consultoras varían mucho entre sí — tómalas como orden de magnitud, no como verdad exacta.*

Dato relevante para ti: **Asia-Pacífico es la región de mayor crecimiento** y Latinoamérica está poco atendida. Una plataforma con buen español y entendimiento del mercado LatAm tiene una ventaja real de distribución.

### 7.2 Competencia y dónde está tu hueco
| Producto | Qué hace | Modelo | Debilidad que puedes explotar |
|---|---|---|---|
| **One Sec** | Pausa consciente antes de abrir apps | Freemium | Una sola mecánica; sin análisis ni acompañamiento |
| **Opal** | Bloqueo de apps, Focus Score | ~60 USD/año | Bloqueo, no comprensión; sin salud mental real |
| **Clearspace** | Screen Time + journal, correlación uso-ánimo | ~12 USD/mes | iOS-only; lo más cercano a ti, pero sin ML de verdad ni CV |
| **RescueTime** | Productividad, score, API | ~12 USD/mes | Orientado a productividad laboral, no a bienestar |
| **Exist.io** | Fusiona métricas (sueño, uso, ánimo) | ~12 USD/mes | Fusiona pero no *acompaña* ni interviene |
| **Google Digital Wellbeing** | Dashboard del sistema | Gratis (OEM) | Pasivo: informa, no actúa |

**Tu hueco:** nadie combina (a) fusión multi-fuente real, (b) un agente de IA que razona sobre tus datos, (c) intervención en el momento, y (d) un sistema de hábitos con acompañamiento. Clearspace es el más cercano, pero es iOS-only y su "correlación" es básica. Tu diferenciador es **el agente + ML + visión, con acompañamiento accionable**.

Una advertencia honesta: el éxito de Opal ($10M ARR, 11 personas) demuestra que **el foco gana**. El riesgo número uno de tu idea no es técnico, es de *scope*: intentar hacer las cinco cosas a la vez te hunde. La sección 9 propone qué recortar.

### 7.3 Viabilidad técnica (matriz)
| Componente | Viabilidad | Comentario |
|---|---|---|
| App Android companion (UsageStats) | **Alta** | Patrón probado (aw-android). Empieza aquí para datos ricos |
| Extensión de navegador | **Alta** | API madura; datos automáticos de escritorio |
| Autorreporte + EMA | **Muy alta** | Funciona hoy, sin permisos. Base de la fase web |
| OCR de capturas de Screen Time (iOS) | **Media** | Buen *workaround* para iOS; requiere acción manual |
| Modelos ML de comportamiento | **Alta** | scikit-learn/Prophet; ligeros |
| Agente LLM + RAG sobre playbooks | **Alta** | Sin fine-tuning; ingeniería de prompts + retrieval |
| Visión por computadora (Focus Sessions) | **Media** | Viable con MediaPipe on-device; YOLO/SAM = fase avanzada |
| Monitoreo de cámara siempre encendido | **Baja — no lo hagas** | Batería, privacidad, rechazo del usuario |
| iOS Screen Time API (FamilyControls) | **Media-baja** | Requiere *entitlement* aprobado por Apple; sin datos crudos |

### 7.4 Viabilidad legal y regulatoria — la sección crítica
Esto puede matar el proyecto si lo ignoras, así que léelo con atención:

- **Wellness vs. dispositivo médico.** La FDA es explícita: una app que *promueve bienestar general* no es un dispositivo regulado; una app que dice *diagnosticar/tratar/prevenir* una enfermedad **sí** lo es. A noviembre de 2025 la FDA **no había autorizado ningún dispositivo de salud mental con IA generativa**, y varios estados de EE.UU. están legislando contra "terapeutas IA". **Conclusión: posiciónate como herramienta de bienestar. Nunca uses la palabra "diagnóstico" en el producto ni en el marketing.** Usa "señales", "screening", "indicadores", "triaje".
- **Datos sensibles (GDPR Art. 9 / LGPD / HIPAA).** Los datos de salud mental son categoría especial. Necesitas consentimiento explícito y granular, finalidad específica, derecho al borrado, y DPA con tus subprocesadores. Diseño *on-device-first* y sincronización opcional (opt-in).
- **Políticas de tiendas.** `AccessibilityService` exige justificación detallada en Play Console (prohibido para analytics/ads). El *entitlement* de FamilyControls requiere aprobación directa de Apple. Planéalo desde el inicio.
- **Lo que nunca debes almacenar:** URLs, contenido de notificaciones, apps de salud/finanzas del usuario, video de cámara.

El reframe a "bienestar + triaje + derivación" no es solo defensivo: es lo que te permite **lanzar rápido sin pasar años en certificación**. Si más adelante quieres entrar al terreno clínico, esa es una decisión estratégica separada que implica ensayos clínicos y la vía SaMD.

---

## 8. Qué te diferencia (resumen del posicionamiento)

1. **Multi-fuente real:** la mayoría mira una señal; tú fusionas teléfono + navegador + cámara + salud + autorreporte.
2. **Un agente que razona, no un dashboard:** el LLM interpreta tus datos y conversa contigo.
3. **Acompañamiento, no vigilancia:** intervención en el momento + hábitos + rachas con tono compasivo.
4. **Visión por computadora bien hecha:** Focus Sessions on-device, privadas, opcionales — no surveillance.
5. **Mente + cuerpo:** postura, sueño y actividad junto a lo digital. Casi nadie une las dos.
6. **Privacy-first como producto, no como letra pequeña:** en un mercado de datos sensibles, esto es marketing.

---

## 9. Sugerencias: qué construir, qué adaptar, qué recortar

**El riesgo es el scope.** Tu visión completa es un producto de varios años. Para que exista, recórtalo así:

### MVP recomendado (la idea mínima que ya es valiosa)
Una **web app + extensión de Chrome**, con:
- Autorreporte + EMA + cuestionarios validados (PHQ-9/GAD-7).
- Extensión que mide tiempo en sitios y velocidad de scroll.
- El agente LLM con RAG sobre una primera versión de los playbooks.
- Árbol de triaje básico → recomendación de hábitos.
- Sistema de hábitos, rachas y reporte semanal narrado.

Esto ya es un producto real, legalmente seguro, y demuestra el valor del agente. Sin tocar cámara ni app nativa.

### Segunda ola
- App Android companion (UsageStats) → datos automáticos ricos.
- OCR de capturas para usuarios iOS.
- Modelos ML de clustering y anomalías sobre datos reales.

### Tercera ola (el "wow", cuando ya tengas tracción)
- Focus Sessions con visión por computadora on-device.
- Integración con HealthKit/Health Connect.
- Vista de terapeuta / B2B2C (clínicas, universidades, programas de bienestar laboral).

### Adaptaciones que vale la pena considerar
- **B2B como motor de ingresos:** universidades y empresas pagan por programas de bienestar digital. Una "vista de equipo" agregada y anónima puede ser más rentable que el consumidor individual, y LatAm tiene mercado corporativo poco atendido.
- **Empezar por "foco/productividad" antes que por "salud mental":** el ángulo de productividad tiene menos peso regulatorio y es más fácil de vender. La salud mental entra como beneficio, no como claim central.
- **Construir los playbooks con un profesional de salud mental desde el día uno.** No es opcional: es tu control de calidad y tu defensa legal.

---

## 10. Riesgos principales y mitigación

| Riesgo | Mitigación |
|---|---|
| Scope demasiado grande | MVP estricto (sección 9); recortar sin culpa |
| Cruzar la línea regulatoria | Posicionamiento "bienestar", lenguaje de "señales", revisión legal |
| Daño a un usuario en crisis | Rama de escalamiento diseñada con un clínico; derivación inmediata |
| Rechazo por privacidad (cámara) | On-device, opt-in, por sesión, nunca video al servidor |
| El LLM "inventa" consejo clínico | RAG estricto sobre playbooks aprobados; sin generación libre en temas sensibles |
| Rachas que generan culpa | Días de gracia, tono compasivo, nunca comparación social |
| Datos pobres en iOS | OCR + Shortcuts + Health + autorreporte; no depender de Screen Time API |

---

## 11. Decisiones abiertas que tienes que tomar

Para pasar de "idea" a "plan", necesitas decidir:

1. **¿Ángulo principal: productividad/foco o salud mental?** Define el marketing, el riesgo legal y el público.
2. **¿Consumidor (B2C) o empresas/universidades (B2B2C)?** Define el modelo de negocio y la primera versión.
3. **¿Plataforma de arranque: web+extensión, o ir directo a Android?** El PDF y yo recomendamos web+extensión.
4. **¿Tienes acceso a un profesional de salud mental** que valide los playbooks y la rama de crisis? Es un requisito, no un lujo.
5. **Nombre.** "Kairós" es de trabajo. Alternativas: *Foco*, *Nimbo*, *Pausa*, *Aurea*, *Tángere*, *Brújula*.

Cuando tengas respuestas a estas cinco, el siguiente documento es el **plan** (roadmap, stack definitivo, fases con tiempos).
