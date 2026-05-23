import type { Config } from "tailwindcss";
// `@heroui/react` re-exporta `heroui` (un plugin Tailwind) cuyos tipos
// internos provienen de su propia copia de tailwindcss y son ligeramente
// distintos a los del Tailwind del proyecto. Casteamos el plugin para
// evitar el clash de tipos (la implementación es 100% compatible en runtime).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { heroui } from "@heroui/react";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Backgrounds
        "bg-deep": "#070B14",
        "bg-surface": "#0D1424",
        "bg-elevated": "#141D35",
        "bg-input": "#1A2440",
        // Borders
        "border-subtle": "#1E2D52",
        "border-active": "#2D4A8A",
        // Accents
        "accent-primary": "#4FFFB0",
        "accent-secondary": "#7B6FF0",
        "accent-warm": "#FF9F5A",
        "accent-warm-2": "#FFD166",
        "accent-danger": "#FF4D6A",
        "accent-info": "#5AC8FF",
        "accent-moderate": "#FFB347",
        // Text
        "text-primary": "#E8EDF5",
        "text-secondary": "#8A96B0",
        "text-muted": "#4A5570",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        xs: "11px",
        sm: "13px",
        base: "15px",
        md: "17px",
        lg: "20px",
        xl: "24px",
        "2xl": "32px",
        "3xl": "48px",
      },
      borderRadius: {
        sm: "6px",
        md: "12px",
        lg: "20px",
        xl: "28px",
      },
      boxShadow: {
        sm: "0 2px 8px rgba(0,0,0,0.4)",
        md: "0 4px 20px rgba(0,0,0,0.6)",
        lg: "0 8px 40px rgba(0,0,0,0.8)",
        "glow-green": "0 0 20px rgba(79,255,176,0.3)",
        "glow-purple": "0 0 20px rgba(123,111,240,0.3)",
        "glow-purple-left": "-4px 0 12px rgba(123,111,240,0.25)",
      },
      backgroundImage: {
        "gradient-brand":
          "linear-gradient(135deg, #070B14 0%, #0D1A3E 50%, #0A1628 100%)",
        "gradient-cta":
          "linear-gradient(135deg, #4FFFB0 0%, #00D4FF 100%)",
        "gradient-card-alive":
          "linear-gradient(135deg, #141D35 0%, #1A2B4A 100%)",
        "gradient-crisis":
          "linear-gradient(135deg, #2A0A14 0%, #1A0820 100%)",
        "gradient-streak":
          "linear-gradient(135deg, #FF9F5A 0%, #FFD166 100%)",
        "gradient-bar":
          "linear-gradient(90deg, #4FFFB0 0%, #7B6FF0 100%)",
      },
      keyframes: {
        "pulse-glow": {
          "0%": { boxShadow: "0 0 0 0 rgba(79,255,176,0.4)" },
          "70%": { boxShadow: "0 0 0 8px rgba(79,255,176,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(79,255,176,0)" },
        },
        "bounce-dot": {
          "0%, 80%, 100%": { transform: "translateY(0)" },
          "40%": { transform: "translateY(-6px)" },
        },
        "skeleton-shine": {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "bar-grow": {
          "0%": { width: "0%" },
          "100%": { width: "var(--bar-w)" },
        },
        "bounce-soft": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.15)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2s infinite",
        "bounce-dot": "bounce-dot 1.4s infinite",
        "skeleton-shine": "skeleton-shine 1.5s linear infinite",
        "fade-up": "fade-up 500ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 300ms ease-out both",
        "slide-up": "slide-up 350ms cubic-bezier(0.16, 1, 0.3, 1)",
        "bar-grow": "bar-grow 800ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "bounce-soft": "bounce-soft 250ms ease-out",
        float: "float 6s ease-in-out infinite",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "spring-soft": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (heroui as any)({
      themes: {
        kairos: {
          extend: "dark",
          colors: {
            background: "#070B14",
            foreground: "#E8EDF5",
            divider: "#1E2D52",
            focus: "#4FFFB0",
            content1: "#0D1424",
            content2: "#141D35",
            content3: "#1A2440",
            content4: "#1E2D52",
            default: {
              50: "#1A2440",
              100: "#1E2D52",
              200: "#2D4A8A",
              300: "#4A5570",
              400: "#8A96B0",
              500: "#E8EDF5",
              600: "#E8EDF5",
              700: "#E8EDF5",
              800: "#E8EDF5",
              900: "#E8EDF5",
              foreground: "#E8EDF5",
              DEFAULT: "#1E2D52",
            },
            primary: {
              50: "rgba(79,255,176,0.05)",
              100: "rgba(79,255,176,0.1)",
              200: "rgba(79,255,176,0.2)",
              300: "rgba(79,255,176,0.35)",
              400: "rgba(79,255,176,0.55)",
              500: "#4FFFB0",
              600: "#3FE89A",
              700: "#2FD088",
              800: "#1FB876",
              900: "#0FA064",
              foreground: "#070B14",
              DEFAULT: "#4FFFB0",
            },
            secondary: {
              50: "rgba(123,111,240,0.05)",
              100: "rgba(123,111,240,0.12)",
              200: "rgba(123,111,240,0.2)",
              300: "rgba(123,111,240,0.35)",
              400: "rgba(123,111,240,0.55)",
              500: "#7B6FF0",
              600: "#6A5EE0",
              700: "#594DD0",
              800: "#483CC0",
              900: "#372BA8",
              foreground: "#E8EDF5",
              DEFAULT: "#7B6FF0",
            },
            success: {
              500: "#4FFFB0",
              foreground: "#070B14",
              DEFAULT: "#4FFFB0",
            },
            warning: {
              500: "#FF9F5A",
              foreground: "#070B14",
              DEFAULT: "#FF9F5A",
            },
            danger: {
              500: "#FF4D6A",
              foreground: "#E8EDF5",
              DEFAULT: "#FF4D6A",
            },
          },
          layout: {
            radius: {
              small: "6px",
              medium: "12px",
              large: "20px",
            },
            fontSize: {
              tiny: "11px",
              small: "13px",
              medium: "15px",
              large: "20px",
            },
          },
        },
      },
    }),
  ],
};

export default config;
