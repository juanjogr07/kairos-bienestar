import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
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
  plugins: [],
};

export default config;
