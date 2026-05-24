"use client";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
      }}
    >
      {/* Sun icon */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        width="13"
        height="13"
        style={{ color: isDark ? "var(--muted)" : "var(--teal-600)", transition: "color 0.2s" }}
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>

      {/* Pill toggle */}
      <div
        style={{
          width: 34,
          height: 18,
          borderRadius: 9,
          background: isDark ? "var(--teal-500, #14b8a6)" : "rgba(139,92,246,.25)",
          border: "1px solid",
          borderColor: isDark ? "var(--teal-500, #14b8a6)" : "rgba(139,92,246,.4)",
          position: "relative",
          transition: "background 0.2s, border-color 0.2s",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 2,
            left: isDark ? "calc(100% - 14px - 2px)" : 2,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: isDark ? "#fff" : "#8b5cf6",
            transition: "left 0.2s, background 0.2s",
          }}
        />
      </div>

      {/* Moon icon */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        width="13"
        height="13"
        style={{ color: isDark ? "var(--ink)" : "var(--muted)", transition: "color 0.2s" }}
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}
