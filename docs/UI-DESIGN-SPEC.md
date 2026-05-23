# Kairós — Especificación de Diseño UI/UX

> Documento para diseñadores en Stitch / Claude Design / Figma.  
> Cubre: paleta, tipografía, componentes, navegación, animaciones, pantallas completas.

---

## 1. Concepto Visual

**Nombre de la identidad:** *Bioluminiscencia Digital*

La interfaz de Kairós evoca la tranquilidad de la naturaleza nocturna con tecnología avanzada: como ver el fondo del océano desde arriba — oscuro, profundo, pero con puntos de luz vivos y orgánicos. No es minimalismo frío. Es calidez en la oscuridad.

**Keywords de diseño:**
- Orgánico pero preciso
- Futurista pero humano
- Oscuro pero acogedor
- Datos vivos, no tableros fríos

**Anti-keywords (lo que NO es Kairós):**
- No es un dashboard de empresa
- No es una app de fitness agresiva
- No es neon cyberpunk
- No es clínico ni estéril

---

## 2. Paleta de Colores

### 2.1 Colores base (Dark Mode — modo principal)

| Token | Hex | Uso |
|---|---|---|
| `--bg-deep` | `#070B14` | Fondo profundo principal — pantalla base |
| `--bg-surface` | `#0D1424` | Cards, paneles, sidebars |
| `--bg-elevated` | `#141D35` | Cards elevadas, modales, tooltips |
| `--bg-input` | `#1A2440` | Inputs, fields, dropdowns |
| `--border-subtle` | `#1E2D52` | Bordes sutiles, separadores |
| `--border-active` | `#2D4A8A` | Bordes de elementos activos/hover |

### 2.2 Colores de acento (el "alma" de la marca)

| Token | Hex | Uso |
|---|---|---|
| `--accent-primary` | `#4FFFB0` | CTA principal, selección activa, éxito |
| `--accent-glow` | `#4FFFB030` | Glow de fondo del accent (30% opacidad) |
| `--accent-secondary` | `#7B6FF0` | Accent secundario — chat, insight, activación |
| `--accent-secondary-glow` | `#7B6FF025` | Glow del secundario |
| `--accent-warm` | `#FF9F5A` | Alertas leves, hábitos, rachas |
| `--accent-danger` | `#FF4D6A` | Crisis, errores críticos, eliminar |
| `--accent-info` | `#5AC8FF` | Información neutral, ayuda, tooltips |

### 2.3 Tipografía / texto

| Token | Hex | Uso |
|---|---|---|
| `--text-primary` | `#E8EDF5` | Texto principal — headings, body |
| `--text-secondary` | `#8A96B0` | Texto secundario — labels, metadata |
| `--text-muted` | `#4A5570` | Texto deshabilitado, placeholders |
| `--text-accent` | `#4FFFB0` | Texto en accent — links, valores positivos |
| `--text-danger` | `#FF4D6A` | Texto de error, crisis |

### 2.4 Gradientes de marca

```css
/* Gradiente principal — fondos de hero y onboarding */
--gradient-brand: linear-gradient(135deg, #070B14 0%, #0D1A3E 50%, #0A1628 100%);

/* Gradiente de accent — botones CTA */
--gradient-cta: linear-gradient(135deg, #4FFFB0 0%, #00D4FF 100%);

/* Gradiente de card viva */
--gradient-card-alive: linear-gradient(135deg, #141D35 0%, #1A2B4A 100%);

/* Gradiente de crisis */
--gradient-crisis: linear-gradient(135deg, #2A0A14 0%, #1A0820 100%);

/* Gradiente de racha (hábitos) */
--gradient-streak: linear-gradient(135deg, #FF9F5A 0%, #FFD166 100%);
```

---

## 3. Tipografía

### 3.1 Fuentes

| Rol | Fuente | Peso | Tamaño base |
|---|---|---|---|
| **Headings** | `Inter` (variable) | 600–800 | 24–48px |
| **Body** | `Inter` | 400–500 | 14–16px |
| **Datos / métricas** | `JetBrains Mono` | 500–700 | 20–48px |
| **Labels / captions** | `Inter` | 400 | 11–12px |
| **Chat / narraciones** | `Inter` | 400 | 15px, line-height 1.7 |

**Google Fonts CDN:**
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
```

### 3.2 Escala tipográfica

```css
--text-xs:   11px;  /* labels, timestamps */
--text-sm:   13px;  /* metadata, secondary */
--text-base: 15px;  /* body, chat */
--text-md:   17px;  /* subtítulos */
--text-lg:   20px;  /* títulos de sección */
--text-xl:   24px;  /* headings de página */
--text-2xl:  32px;  /* métricas grandes */
--text-3xl:  48px;  /* hero numbers */
```

---

## 4. Espaciado y Bordes

```css
/* Espaciado (múltiplos de 4) */
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-6:  24px;
--space-8:  32px;
--space-12: 48px;
--space-16: 64px;

/* Radios */
--radius-sm:  6px;   /* badges, inputs pequeños */
--radius-md:  12px;  /* cards, buttons */
--radius-lg:  20px;  /* cards grandes, panels */
--radius-xl:  28px;  /* cards héroe, modales */
--radius-full: 999px; /* pills, avatares */

/* Sombras */
--shadow-sm:  0 2px 8px rgba(0,0,0,0.4);
--shadow-md:  0 4px 20px rgba(0,0,0,0.6);
--shadow-lg:  0 8px 40px rgba(0,0,0,0.8);
--shadow-glow-green: 0 0 20px rgba(79,255,176,0.3);
--shadow-glow-purple: 0 0 20px rgba(123,111,240,0.3);
```

---

## 5. Estructura de Navegación

### 5.1 Flujo completo de pantallas

```
[Landing / Login]
       │
       ▼
[Onboarding Step 1 — PHQ-9]  (9 preguntas, una por slide)
       │
       ▼
[Onboarding Step 2 — GAD-7]  (7 preguntas)
       │
       ▼
[Onboarding Complete — Bienvenida personalizada]
       │
       ▼
╔══════════════════════════════╗
║  APP PRINCIPAL (tab bar)     ║
║                              ║
║  [Dashboard] ← tab activo   ║
║  [Chat]                      ║
║  [Hábitos]                   ║
║  [Perfil]                    ║
╚══════════════════════════════╝
```

### 5.2 Tab Bar (bottom nav en mobile / left sidebar en desktop)

| Tab | Ícono | Ruta | Descripción |
|---|---|---|---|
| **Dashboard** | `BarChart3` (Lucide) | `/dashboard` | Métricas del día + insights narrados |
| **Chat** | `MessageCircle` | `/chat` | Conversación con el agente Kairós |
| **Hábitos** | `Zap` | `/habits` | Lista de hábitos + rachas |
| **Perfil** | `User` | `/profile` | Configuración + historial de evaluaciones |

### 5.3 Conexiones entre pantallas (flujo de datos)

```
Dashboard
  ├── Toca "Ver análisis completo" → Chat (con contexto pre-cargado)
  ├── Toca hábito del día → Habits
  ├── Toca "Completar hábito" → Habits (acción directa)
  └── Toca score PHQ-9/GAD-7 → Profile → historial de evaluaciones

Chat
  ├── El agente sugiere hábito → botón "Agregar hábito" → Habits
  ├── El agente menciona playbook → card expandible inline
  └── Respuesta de crisis → modal full-screen no dismissable

Habits
  ├── Toca "Completar" → animación de racha en lugar
  ├── Toca "+" → modal de creación de hábito
  └── Toca nombre del hábito → detail con historial de completaciones

Profile
  ├── Toca "Nueva evaluación" → Onboarding (reutilizable solo para surveys)
  └── Toca "Ver historial" → gráfico de tendencia PHQ-9 / GAD-7
```

---

## 6. Pantallas — Especificación Detallada

### 6.1 Login / Registro

**Layout:** full screen, centrado verticalmente  
**Fondo:** `--gradient-brand` con partículas flotantes (pequeños puntos verdes `#4FFFB0` a 15% opacidad)

**Elementos:**
- Logo Kairós (arriba, centrado) — símbolo + wordmark
- Tagline: *"Tu copiloto de bienestar digital"* — `--text-secondary`, `--text-md`
- Card central (`--bg-surface`, `--radius-xl`, `--shadow-lg`):
  - Toggle "Iniciar sesión / Registrarse" — pill selector
  - Email input + Password input
  - Botón CTA: `--gradient-cta`, texto oscuro `#070B14`, bold
  - "O continuar con Google" — botón outline
- Footer: "Privacidad · Términos" — `--text-muted`, `--text-xs`

---

### 6.2 Onboarding — Encuestas PHQ-9 / GAD-7

**Layout:** pantalla completa, una pregunta por vez (wizard con slides)  
**Fondo:** `--bg-deep` con gradiente sutil en la parte superior

**Estructura por pregunta:**
```
┌─────────────────────────────────────────────────┐
│  [●●●○○○○○○]  Pregunta 3 de 9                  │  ← progress bar verde
│                                                 │
│  "En las últimas 2 semanas, ¿con qué           │  ← pregunta, --text-xl
│   frecuencia te has sentido decaído/a?"         │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 0  Para nada                            │   │  ← opciones como cards
│  │ 1  Varios días                          │   │    seleccionables
│  │ 2  Más de la mitad de los días     [✓]  │   │
│  │ 3  Casi todos los días                  │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│              [Siguiente →]                      │  ← botón CTA
└─────────────────────────────────────────────────┘
```

**Interacción:**
- Tap en opción → selección con borde `--accent-primary` + fondo `--accent-glow`
- Seleccionada → botón "Siguiente" se activa (de `--text-muted` a `--gradient-cta`)
- Transición entre preguntas: slide horizontal suave (300ms ease-out)
- Progress bar: se llena progresivamente con `--accent-primary`, tiene glow

---

### 6.3 Dashboard

**Layout:** scroll vertical, sin tab bar visible hasta bajar  
**Fondo:** `--bg-deep`

**Sección 1 — Saludo + resumen del día (hero)**
```
┌─────────────────────────────────────────────────┐
│  Buenos días, Alejandro ☀                       │
│  Hoy llevo 1h 42min en pantalla                 │
│                                                 │
│  ┌──────────────┐  ┌──────────────┐            │
│  │  📊  142     │  │  ⚡  2       │            │
│  │  min hoy     │  │  hábitos     │            │
│  └──────────────┘  └──────────────┘            │
└─────────────────────────────────────────────────┘
```
- Número "142" en `JetBrains Mono`, `--text-3xl`, `--accent-primary`
- Cards de métricas: `--bg-surface`, `--radius-lg`, sin sombra marcada
- Saludo: `--text-xl`, `--text-primary`

**Sección 2 — Insight del agente (card viva)**
```
┌─────────────────────────────────────────────────┐
│  ✦ Insight de hoy                               │  ← tag con ✦ en --accent-secondary
│                                                 │
│  "Los últimos 3 días usaste el teléfono         │
│   después de las 23:00 por más de 45 min.       │
│   Esto puede estar afectando tu sueño."         │
│                                                 │
│  Playbook activado: Uso nocturno                │
│                                                 │
│       [Habla con Kairós →]                      │
└─────────────────────────────────────────────────┘
```
- Card: `--gradient-card-alive`, borde izquierdo 3px `--accent-secondary`
- Borde izquierdo tiene glow: `box-shadow: -4px 0 12px --accent-secondary-glow`
- Texto de insight: `--text-base`, `--text-primary`, line-height 1.7

**Sección 3 — Top sitios visitados (gráfico de barras)**
- Barras horizontales, estilo "retro-futurista"
- Barra llena: `--accent-primary` con gradiente hacia `--accent-secondary`
- Labels a la izquierda: `--text-secondary`
- Valores en `JetBrains Mono`

**Sección 4 — Hábitos del día**
- Lista de 2–3 hábitos con checkbox circular
- Completado: `--accent-primary` con checkmark + animación de racha
- Pendiente: borde `--border-subtle`
- Racha: badge en `--accent-warm` con número + 🔥

---

### 6.4 Chat con Kairós

**Layout:** pantalla de chat clásica pero con personalidad  
**Fondo:** `--bg-deep`

**Header:**
```
┌─────────────────────────────────────────────────┐
│  ←  Kairós  ✦                    [⋯]           │
│     Copiloto de bienestar                        │
│     ● Activo ahora                              │  ← dot verde pulsante
└─────────────────────────────────────────────────┘
```

**Mensajes del usuario:**
- Burbuja derecha: `--bg-input`, `--radius-lg` (sin esquina inferior derecha)
- Texto: `--text-primary`

**Mensajes de Kairós:**
- Burbuja izquierda: `--bg-elevated`, `--radius-lg` (sin esquina inferior izquierda)
- Borde izquierdo 2px `--accent-secondary`
- Nombre "Kairós" arriba en `--accent-secondary`, `--text-xs`

**Mensaje de crisis (override de pantalla completa):**
```
┌─────────────────────────────────────────────────┐
│                   ⚠                             │  ← icono grande
│                                                 │
│  "He notado señales que merecen atención..."    │
│                                                 │
│  📞  Línea 106 — Colombia                       │
│      Gratuita · 24h · Confidencial              │
│                                                 │
│  [Tengo apoyo]    [Llamar ahora]                │
└─────────────────────────────────────────────────┘
```
- Fondo: `--gradient-crisis`
- Ícono ⚠: `--accent-danger`, 48px, con glow rojo
- Botón "Llamar ahora": `--accent-danger`, bold

**Chips de respuesta rápida (sugerencias):**
- Pills horizontales: `--bg-elevated`, borde `--border-active`
- Al tocar: borde cambia a `--accent-primary`
- Aparecen con animación fade-up (200ms)

**Input del chat:**
- Fondo `--bg-input`, borde `--border-subtle`
- Al enfocar: borde `--accent-secondary` + glow sutil
- Botón enviar: círculo con `--gradient-cta`, ícono flecha

**Indicador de "Kairós escribiendo":**
- Tres puntos que pulsan secuencialmente, color `--accent-secondary`

---

### 6.5 Hábitos

**Layout:** lista vertical con acciones en cada card  
**Fondo:** `--bg-deep`

**Header de la pantalla:**
```
Mis hábitos                    [+ Nuevo]
3 activos · 2 completados hoy
```

**Card de hábito activo:**
```
┌─────────────────────────────────────────────────┐
│  Sin teléfono la primera hora del día           │
│  🔥 3 días de racha · Récord: 5 días            │
│                                                 │
│                        [✓ Completar hoy]        │
└─────────────────────────────────────────────────┘
```
- Racha: badge naranja `--accent-warm` con 🔥 + número en `JetBrains Mono`
- Botón "Completar": outline de `--accent-primary`, al tocar → filled

**Animación al completar un hábito:**
1. Botón cambia a filled `--accent-primary` (100ms)
2. Número de racha incrementa con flip animation (300ms)
3. Partículas verdes explotan del botón (500ms) — efecto confetti circular
4. Badge de racha hace "bounce" (200ms)
5. Mensaje compasivo aparece debajo (fade-in, 400ms): *"¡4 días seguidos! Sigue así 💪"*

**Modal de nuevo hábito:**
- Bottom sheet que sube desde abajo
- Fondo `--bg-elevated`, `--radius-xl` (solo arriba)
- Input de nombre del hábito
- Selector de frecuencia: Daily / Semanal (pills)
- Si viene de sugerencia del agente: muestra badge "Recomendado por Kairós ✦"

---

### 6.6 Perfil

**Layout:** scroll vertical  
**Fondo:** `--bg-deep`

**Secciones:**
1. **Avatar + nombre** — circle avatar placeholder con iniciales, nombre, email
2. **Historial de bienestar** — gráfico de línea PHQ-9 + GAD-7 en el tiempo
3. **Nueva evaluación** — botón para repetir PHQ-9/GAD-7
4. **Estadísticas personales** — hábitos totales, racha más larga, días de uso
5. **Configuración** — notificaciones, zona horaria, Dark/Light mode
6. **Cerrar sesión** — botón outline rojo

**Gráfico de bienestar:**
- Línea PHQ-9: `--accent-secondary` (violeta)
- Línea GAD-7: `--accent-info` (azul)
- Grid: `--border-subtle`
- Área bajo la curva: gradiente 10% de opacidad
- Punto de crisis (si existió): dot `--accent-danger` con tooltip

---

## 7. Componentes Reutilizables

### Badge de racha
```
┌────────────┐
│ 🔥  5 días │  ← --accent-warm bg, texto oscuro, --radius-full
└────────────┘
```

### Insight chip (del agente)
```
┌────────────────────────────────┐
│  ✦  Uso nocturno detectado     │  ← borde izquierdo --accent-secondary
└────────────────────────────────┘
```

### Score badge (PHQ-9 / GAD-7)
```
┌──────────┐
│  PHQ-9   │
│    9     │  ← JetBrains Mono, grande
│  Leve    │  ← --text-secondary, pequeño
└──────────┘
```
- Colores por severidad:
  - Mínimo (0–4): `--accent-primary`
  - Leve (5–9): `--accent-warm`
  - Moderado (10–14): `#FFB347`
  - Severo (≥15): `--accent-danger`

### Metric number (para el dashboard)
```
142           ← JetBrains Mono, --text-3xl, --accent-primary
min hoy       ← Inter, --text-sm, --text-secondary
```

---

## 8. Animaciones y Motion Design

### 8.1 Principios de animación

- **Duración base:** 200ms para micro-interacciones, 350ms para transiciones de pantalla
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` para entradas (spring-like), `ease-out` para salidas
- **Nunca animar simultáneamente más de 2 propiedades** — evita carga cognitiva

### 8.2 Transiciones de pantalla

| Transición | Tipo | Duración |
|---|---|---|
| Cambio de tab | Fade cruzado + slide sutil | 250ms |
| Onboarding siguiente pregunta | Slide horizontal izquierda | 300ms |
| Modal / bottom sheet | Slide desde abajo + fade overlay | 350ms |
| Modal cerrar | Slide hacia abajo + fade | 250ms |
| Mensaje de chat nuevo | Fade-in desde abajo | 200ms |

### 8.3 Animaciones específicas

**Carga del dashboard (staggered):**
```
1. Header fade-in    0ms
2. Card métricas    100ms delay
3. Insight card     200ms delay
4. Gráfico barras   300ms delay (barras crecen de izquierda a derecha)
5. Hábitos          400ms delay
```

**Número de métrica que incrementa:**
- Al cargar el dashboard, el número cuenta desde 0 hasta el valor real
- Duración: 800ms, easing exponencial
- Solo si el usuario ve la pantalla por primera vez en la sesión

**Glow pulsante en el dot "activo" del chat:**
```css
@keyframes pulse-glow {
  0%   { box-shadow: 0 0 0 0 rgba(79,255,176,0.4); }
  70%  { box-shadow: 0 0 0 8px rgba(79,255,176,0); }
  100% { box-shadow: 0 0 0 0 rgba(79,255,176,0); }
}
animation: pulse-glow 2s infinite;
```

**Progress bar de onboarding:**
- La barra usa `transition: width 400ms cubic-bezier(0.34, 1.56, 0.64, 1)` (efecto spring)
- Color: `--accent-primary`, con glow al final de la barra activa

**Partículas al completar hábito:**
```
20-30 partículas pequeñas (4px)
Colores: --accent-primary y --accent-secondary
Dirección: explotan radialmente desde el botón
Física: gravedad simulada (caen con aceleración)
Duración: 800ms
```

**Typing indicator del agente:**
```css
@keyframes bounce-dot {
  0%, 80%, 100% { transform: translateY(0); }
  40%           { transform: translateY(-6px); }
}
/* dot 1: delay 0ms, dot 2: delay 160ms, dot 3: delay 320ms */
```

**Insight card al entrar:**
- Entra con `transform: translateY(12px)` → `translateY(0)` + `opacity: 0` → `1`
- El borde izquierdo violet crece de altura (clip-path animation)
- Duración: 500ms, staggered 150ms después del primer render

---

## 9. Extensión Chrome — Popup UI

**Tamaño fijo:** 360px × 480px  
**Tema:** igual que la app (dark mode, misma paleta)

### Layout del popup

```
┌─────────────────────────────────────────────────┐
│  ✦ Kairós                        [⚙]           │
├─────────────────────────────────────────────────┤
│                                                 │
│  Hoy: 1h 24min                                  │
│  ████████░░░░░░░  Meta: 3h                      │
│                                                 │
├─────────────────────────────────────────────────┤
│  Top sitios de hoy                              │
│  ● YouTube     45 min  ████████                 │
│  ● Instagram   32 min  ██████                   │
│  ● Twitter     18 min  ███                      │
├─────────────────────────────────────────────────┤
│  ✦ Kairós dice:                                 │
│  "Llevas 30 min en Instagram. ¿Pausa?"          │
│                                                 │
│  [Tomar pausa]     [Seguir]                     │
├─────────────────────────────────────────────────┤
│  [Abrir app completa]                           │
└─────────────────────────────────────────────────┘
```

**Animación de apertura del popup:**
- Fade-in + scale de 0.95 → 1 en 150ms
- Las barras de los top sitios crecen de 0 → ancho real en 400ms con stagger

---

## 10. Estados especiales

### Estado de carga (loading)

- Skeleton screens con gradiente que "viaja" de izquierda a derecha
- Color: `--bg-elevated` con highlight `--border-subtle`
- Sin spinners — solo skeletons

```css
@keyframes skeleton-shine {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
background: linear-gradient(90deg, #141D35 25%, #1E2D52 50%, #141D35 75%);
background-size: 200% auto;
animation: skeleton-shine 1.5s linear infinite;
```

### Estado vacío (sin datos aún)

**Dashboard día 1:**
- Ilustración pequeña: constelación de puntos conectados (estilo minimalista)
- Texto: *"Tu historia digital empieza hoy. Instala la extensión para ver tus datos."*
- Botón: `[Cómo instalar la extensión]`

### Estado offline

- Banner sutil en la parte superior: barra de 32px, `--accent-warm` bg oscuro
- Texto: "Sin conexión — mostrando datos locales"
- Se desvanece cuando vuelve la conexión

---

## 11. Accesibilidad

- **Contraste mínimo:** 4.5:1 para texto base (verificar `--text-secondary` sobre `--bg-surface`)
- **Contraste en acciones:** 7:1 para `--text-primary` sobre `--bg-deep`
- **Touch targets:** mínimo 44×44px para todos los elementos interactivos
- **Focus visible:** todos los elementos focusables tienen `outline: 2px solid --accent-primary`
- **Reduced motion:** si `prefers-reduced-motion: reduce` → eliminar todas las animaciones no esenciales, mantener solo fade-in básico
- **Texto y no solo color:** los estados de error nunca usan solo color — siempre acompañan con ícono o texto

---

## 12. Assets que necesita el diseñador

| Asset | Formato | Tamaño | Descripción |
|---|---|---|---|
| Logo símbolo | SVG | 32×32, 64×64 | Ícono standalone (sin texto) |
| Logo wordmark | SVG | ~120×32 | Símbolo + "Kairós" |
| Icono ✦ (estrella Kairós) | SVG | 16×16 | El símbolo de marca para insights del agente |
| Ilustración empty state | SVG | 200×160 | Constelación de puntos conectados |
| Ícono crisis | SVG | 48×48 | Triángulo de advertencia estilo outline |
| Iconos tab bar | SVG | 24×24 cada uno | Dashboard, Chat, Hábitos, Perfil |
| Favicon web | ICO + PNG | 16, 32, 192, 512 | Para Next.js |
| Iconos extensión | PNG | 16, 32, 48, 128 | Para manifest.json |

**Estilo de iconos recomendado:** Lucide Icons (MIT license)
**URL:** `https://lucide.dev/`

---

## 13. Referentes visuales

Para el diseñador, inspiraciones de estilo (sin copiar):

- **Paleta oscura + verde bioluminiscente:** Vercel dashboard, Linear app
- **Tipografía de datos:** Monospace metrics como en monitoring tools (Datadog, Grafana dark)
- **Cards con borde izquierdo colorido:** Notion callouts, Stripe dashboard alerts
- **Animaciones orgánicas:** Lottie animations en apps de bienestar (Calm, Headspace)
- **Popup de extensión compacta:** 1Password popup, Dashlane popup

---

## 14. Notas para Stitch / Claude Design

Cuando generes los componentes, tener en cuenta:

1. **El modo oscuro es el modo principal** — no el secundario. No generar en light mode por default.
2. **Los números de métricas van en `JetBrains Mono`** — esto da el look de "datos reales".
3. **El `--accent-primary` (#4FFFB0) es el verde menta-neón** — no verde puro, no verde lima. Es el "alma" de la marca.
4. **Los borders son muy sutiles** — `--border-subtle` apenas se nota. Evitar borders gruesos.
5. **El insight del agente siempre tiene el borde izquierdo violeta** — es la firma visual del LLM.
6. **Crisis es siempre rojo** — `--accent-danger` — y ocupa pantalla completa. No es un toast.
7. **Las rachas van siempre en naranja** — `--accent-warm` — con 🔥. Es el elemento más "gamificado".
