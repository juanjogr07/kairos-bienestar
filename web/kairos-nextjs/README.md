# Kairós — Prototipo Visual (Next.js)

Prototipo visual interactivo basado en `docs/UI-DESIGN-SPEC.md`.
Identidad: **Bioluminiscencia Digital** (oscuro, profundo, con puntos de luz vivos).

## Stack

- Next.js 14 (App Router)
- React 18 + TypeScript
- Tailwind CSS (con tokens de diseño exactos del spec)
- Lucide Icons
- Tipografías Google Fonts: `Inter` + `JetBrains Mono`

## Pantallas implementadas

| Ruta | Pantalla |
|---|---|
| `/` | Login / Registro (con partículas flotantes) |
| `/onboarding` | Onboarding PHQ-9 + GAD-7 (wizard de 16 preguntas) |
| `/dashboard` | Dashboard con métricas, insight, top sitios y hábitos |
| `/chat` | Chat con Kairós (incluye modo crisis full-screen) |
| `/habits` | Lista de hábitos con animación de confetti al completar |
| `/profile` | Perfil + gráfico SVG de PHQ-9/GAD-7 |
| `/extension` | Vista previa del popup de extensión Chrome (360×480) |

## Cómo correrlo

```bash
cd kairos-nextjs
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Tokens del diseño

Todos los colores, radios, sombras, tipografía y animaciones siguen estrictamente
`UI-DESIGN-SPEC.md`:

- Paleta: solo los hex del documento (`#070B14`, `#4FFFB0`, `#7B6FF0`, etc.)
- Gradientes: `--gradient-brand`, `--gradient-cta`, `--gradient-card-alive`,
  `--gradient-crisis`, `--gradient-streak`
- Animaciones: `pulse-glow`, `bounce-dot`, `skeleton-shine`, `bar-grow`,
  partículas confetti al completar hábitos
- Insight cards con borde izquierdo violeta `#7B6FF0` con glow

## Notas del prototipo

- Todos los datos son ficticios/locales (no hay backend).
- En `/chat`, los `…` del header simulan una alerta de crisis para demo.
- `prefers-reduced-motion` deshabilita las animaciones automáticamente.
- Touch targets ≥ 44×44 y focus visible con `--accent-primary`.
