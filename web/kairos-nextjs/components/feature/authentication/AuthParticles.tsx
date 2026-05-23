"use client";

import { useMemo } from "react";

/**
 * Fondo decorativo de partículas + halos para la pantalla de login.
 * Se aísla aquí para no contaminar el formulario y porque `useMemo` requiere
 * que sea un Client Component.
 */
export function AuthParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 24 }).map(() => ({
        left: Math.random() * 100,
        delay: Math.random() * 12,
        duration: 12 + Math.random() * 10,
        size: 2 + Math.random() * 4,
      })),
    []
  );

  return (
    <>
      <div className="particles" aria-hidden="true">
        {particles.map((p, i) => (
          <span
            key={i}
            style={{
              left: `${p.left}%`,
              bottom: "-20px",
              width: p.size,
              height: p.size,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      <div
        className="pointer-events-none absolute -left-32 top-1/4 h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #4FFFB0, transparent)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-32 bottom-1/4 h-80 w-80 rounded-full opacity-15 blur-3xl"
        style={{ background: "radial-gradient(circle, #7B6FF0, transparent)" }}
        aria-hidden="true"
      />
    </>
  );
}
