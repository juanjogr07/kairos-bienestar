import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── Design System v3 (purple/violet) ── */
        bg: "#f7f6ff",
        "bg-tint": "#efeeff",
        surface: "#ffffff",
        ink: "#1a0f3d",
        "ink-2": "#3b2e6e",
        muted: "#7a6c9e",

        "teal-50": "#f5f3ff",
        "teal-100": "#ddd6fe",
        "teal-300": "#b5b5ff",
        "teal-500": "#8b5cf6",
        "teal-600": "#7c3aed",
        "teal-700": "#6d28d9",

        "aqua-300": "#a5b4fc",
        "aqua-500": "#6366f1",
        "aqua-600": "#4f46e5",

        "blue-300": "#7dc3ff",
        "blue-500": "#6366f1",
        "blue-600": "#4f46e5",
        "blue-700": "#4338ca",

        "lime-500": "#84cc16",
        "amber-500": "#f59e0b",
        "rose-500": "#f43f5e",

        /* ── Legacy v1 (dark theme pages not yet redesigned) ── */
        "bg-deep": "#070B14",
        "bg-surface": "#0D1424",
        "bg-elevated": "#141D35",
        "bg-input": "#1A2440",
        "border-subtle": "#1E2D52",
        "border-active": "#2D4A8A",
        "accent-primary": "#4FFFB0",
        "accent-secondary": "#7B6FF0",
        "accent-warm": "#FF9F5A",
        "accent-warm-2": "#FFD166",
        "accent-danger": "#FF4D6A",
        "accent-info": "#5AC8FF",
        "text-primary": "#E8EDF5",
        "text-secondary": "#8A96B0",
        "text-muted": "#4A5570",
        "text-accent": "#4FFFB0",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Outfit", "Inter", "sans-serif"],
        display: ["Outfit", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        DEFAULT: "18px",
        sm: "12px",
        lg: "24px",
        xl: "28px",
        full: "999px",
      },
      boxShadow: {
        sm: "0 2px 8px rgba(0,0,0,0.15)",
        md: "0 4px 20px rgba(0,0,0,0.12)",
        "glow-green": "0 0 20px rgba(79,255,176,0.3)",
        "glow-purple": "0 0 20px rgba(123,111,240,0.3)",
        "glow-purple-left": "-4px 0 12px rgba(123,111,240,0.25)",
        "glow-teal": "0 10px 24px -10px rgba(16,185,129,.55)",
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #070B14 0%, #0D1A3E 50%, #0A1628 100%)",
        "gradient-cta": "linear-gradient(135deg, #4FFFB0 0%, #00D4FF 100%)",
        "gradient-card-alive": "linear-gradient(135deg, #141D35 0%, #1A2B4A 100%)",
        "gradient-kairos": "linear-gradient(135deg, #8b5cf6 0%, #6366f1 60%, #3b82f6 100%)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "none" },
        },
        "skeleton-shine": {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        orbPulse: {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.12)", opacity: "0.85" },
        },
        spin: { to: { transform: "rotate(360deg)" } },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "bar-grow": {
          "0%": { width: "0%" },
          "100%": { width: "var(--bar-w)" },
        },
        "pulse-glow": {
          "0%": { boxShadow: "0 0 0 0 rgba(79,255,176,0.4)" },
          "70%": { boxShadow: "0 0 0 8px rgba(79,255,176,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(79,255,176,0)" },
        },
        "bounce-dot": {
          "0%, 80%, 100%": { transform: "translateY(0)" },
          "40%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.55s ease forwards",
        "skeleton-shine": "skeleton-shine 1.5s linear infinite",
        orbPulse: "orbPulse 4.5s ease-in-out infinite",
        spin: "spin 0.8s linear infinite",
        "fade-up": "fade-up 500ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "bar-grow": "bar-grow 800ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "pulse-glow": "pulse-glow 2s infinite",
        "bounce-dot": "bounce-dot 1.4s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
