"use client";

import { useEffect, useRef } from "react";

export function CursorAurora() {
  const haloRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const layers = [
      { ref: haloRef,  x: mouse.x, y: mouse.y, f: 0.12 },
      { ref: coreRef,  x: mouse.x, y: mouse.y, f: 0.26 },
      { ref: trailRef, x: mouse.x, y: mouse.y, f: 0.06 },
    ];

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener("mousemove", onMove);

    let raf: number;
    const tick = () => {
      for (const l of layers) {
        l.x += (mouse.x - l.x) * l.f;
        l.y += (mouse.y - l.y) * l.f;
        if (l.ref.current) {
          l.ref.current.style.transform = `translate(${l.x}px, ${l.y}px)`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="cursor-aurora" aria-hidden="true">
      <div ref={haloRef}  className="au au-halo"  />
      <div ref={coreRef}  className="au au-core"  />
      <div ref={trailRef} className="au au-trail" />
    </div>
  );
}
