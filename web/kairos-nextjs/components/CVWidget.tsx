"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface CVResult {
  cv_available: boolean;
  physical_wellness_score: number;
  digital_context_score: number;
  distraction_risk_score: number;
  posture: {
    posture_score: number;
    eye_strain_score: number;
    blink_rate_rpm: number;
    head_tilt_deg: number;
    landmarks_detected: boolean;
  };
  environment: {
    context: string;
    confidence: number;
    detected_objects: string[];
  };
}

const CONTEXT_LABELS: Record<string, string> = {
  workspace: "Espacio de trabajo",
  bedroom: "Dormitorio",
  couch: "Sofá",
  kitchen: "Cocina",
  outdoor: "Exterior",
  transport: "Transporte",
  unknown: "Desconocido",
};

const CONTEXT_ICONS: Record<string, string> = {
  workspace: "💻", bedroom: "🛏️", couch: "🛋️",
  kitchen: "🍳", outdoor: "🌳", transport: "🚌", unknown: "📍",
};

function ScoreBar({ label, value, color, invert = false }: {
  label: string; value: number; color: string; invert?: boolean;
}) {
  const display = invert ? 1 - value : value;
  const pct = Math.round(display * 100);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: "var(--ink-2)" }}>{label}</span>
        <span style={{ fontWeight: 600, color }}>{pct}%</span>
      </div>
      <div style={{ height: 5, background: "var(--surface-2)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

export function CVWidget() {
  const [active, setActive] = useState(false);
  const [result, setResult] = useState<CVResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, 320, 240);
    const b64 = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];

    try {
      const resp = await fetch("/api/cv/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webcam_frame_b64: b64 }),
      });
      if (resp.ok) setResult(await resp.json());
    } catch {
      // silent — keep showing last result
    }
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
      intervalRef.current = setInterval(captureAndAnalyze, 3000);
    } catch {
      setError("No se pudo acceder a la cámara.");
    } finally {
      setLoading(false);
    }
  }, [captureAndAnalyze]);

  const stopCamera = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setActive(false);
    setResult(null);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const posture = result?.posture;
  const env = result?.environment;
  const eyeStrainHigh = (posture?.eye_strain_score ?? 0) > 0.65;
  const postureLow = (posture?.posture_score ?? 1) < 0.5;

  return (
    <div style={{
      background: "var(--surface-1)",
      border: "1px solid var(--border)",
      borderRadius: 18,
      padding: "20px 22px",
      marginBottom: 18,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: active ? "linear-gradient(135deg,#0c9a6c,#06b6d4)" : "var(--surface-2)",
            display: "grid", placeItems: "center", fontSize: 16, transition: "background 0.3s",
          }}>
            📷
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Postura & Entorno</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              {active ? "Analizando en tiempo real" : "Cámara desactivada"}
            </div>
          </div>
        </div>
        <button
          onClick={active ? stopCamera : startCamera}
          disabled={loading}
          style={{
            padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: 600,
            background: active ? "var(--surface-2)" : "linear-gradient(135deg,#0c9a6c,#06b6d4)",
            color: active ? "var(--ink-2)" : "#fff",
            transition: "all 0.2s",
          }}
        >
          {loading ? "Cargando…" : active ? "Detener" : "Activar cámara"}
        </button>
      </div>

      {/* Hidden video element */}
      <video ref={videoRef} style={{ display: "none" }} muted playsInline />

      {error && (
        <div style={{ fontSize: 12, color: "#ef4444", background: "#fef2f2", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
          {error}
        </div>
      )}

      {!active && !result && (
        <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)", fontSize: 12 }}>
          Activa la cámara para detectar postura y fatiga visual en tiempo real.<br />
          <span style={{ fontSize: 11, opacity: 0.7 }}>Solo se analizan scores — los frames nunca se almacenan.</span>
        </div>
      )}

      {result && (
        <>
          {/* Alerts */}
          {(eyeStrainHigh || postureLow) && (
            <div style={{
              display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14,
            }}>
              {eyeStrainHigh && (
                <div style={{ fontSize: 11, fontWeight: 600, color: "#f59e0b", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "5px 10px" }}>
                  👁️ Fatiga visual detectada — descansa 20s
                </div>
              )}
              {postureLow && (
                <div style={{ fontSize: 11, fontWeight: 600, color: "#6366f1", background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 8, padding: "5px 10px" }}>
                  🦴 Ajusta tu postura — hombros asimétricos
                </div>
              )}
            </div>
          )}

          {/* Scores */}
          <ScoreBar label="Bienestar físico" value={result.physical_wellness_score} color="#10b981" />
          <ScoreBar label="Fatiga visual" value={posture?.eye_strain_score ?? 0} color="#f59e0b" invert />
          <ScoreBar label="Postura" value={posture?.posture_score ?? 0.5} color="#6366f1" />

          {/* Blink rate + environment */}
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <div style={{
              flex: 1, background: "var(--surface-2)", borderRadius: 12, padding: "10px 12px",
            }}>
              <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>PARPADEOS/MIN</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: (posture?.blink_rate_rpm ?? 15) < 8 ? "#ef4444" : "var(--ink-1)" }}>
                {(posture?.blink_rate_rpm ?? 15).toFixed(0)}
              </div>
              <div style={{ fontSize: 10, color: "var(--muted)" }}>Normal: 12–20</div>
            </div>
            <div style={{
              flex: 1, background: "var(--surface-2)", borderRadius: 12, padding: "10px 12px",
            }}>
              <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>ENTORNO</div>
              <div style={{ fontSize: 18, marginBottom: 2 }}>{CONTEXT_ICONS[env?.context ?? "unknown"]}</div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{CONTEXT_LABELS[env?.context ?? "unknown"]}</div>
              <div style={{ fontSize: 10, color: "var(--muted)" }}>{Math.round((env?.confidence ?? 0) * 100)}% conf.</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
