"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { useRequireAuth } from "@/hooks/useRequireAuth";

interface Box { label: string; confidence: number; x1: number; y1: number; x2: number; y2: number; }
interface CVResult {
  cv_available: boolean;
  physical_wellness_score: number;
  digital_context_score: number;
  distraction_risk_score: number;
  posture: { posture_score: number; eye_strain_score: number; blink_rate_rpm: number; head_tilt_deg: number; landmarks_detected: boolean; };
  environment: { context: string; confidence: number; detected_objects: string[]; boxes: Box[]; };
}

const CTX_LABEL: Record<string, string> = { workspace: "Espacio de trabajo", bedroom: "Dormitorio", couch: "Sofá", kitchen: "Cocina", outdoor: "Exterior", transport: "Transporte", unknown: "Detectando…" };
const CTX_ICON: Record<string, string> = { workspace: "💻", bedroom: "🛏️", couch: "🛋️", kitchen: "🍳", outdoor: "🌳", transport: "🚌", unknown: "🔍" };

const BOX_COLORS = ["#10b981","#06b6d4","#a78bfa","#f59e0b","#ef4444","#ec4899","#84cc16","#f97316"];
const labelColor = (label: string) => BOX_COLORS[Math.abs([...label].reduce((a, c) => a + c.charCodeAt(0), 0)) % BOX_COLORS.length];

function drawFrame(canvas: HTMLCanvasElement, video: HTMLVideoElement, result: CVResult | null) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  if (!result) return;

  // ── YOLO bounding boxes ──────────────────────────────
  result.environment.boxes.forEach(b => {
    const col = labelColor(b.label);
    const x = b.x1 * W, y = b.y1 * H, w = (b.x2 - b.x1) * W, h = (b.y2 - b.y1) * H;
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, w, h);
    // corner accents
    const cs = 10;
    ctx.lineWidth = 4;
    [[[x,y],[x+cs,y],[x,y+cs]],[[x+w,y],[x+w-cs,y],[x+w,y+cs]],[[x,y+h],[x+cs,y+h],[x,y+h-cs]],[[x+w,y+h],[x+w-cs,y+h],[x+w,y+h-cs]]].forEach(pts => {
      ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]); ctx.lineTo(pts[1][0],pts[1][1]); ctx.moveTo(pts[0][0],pts[0][1]); ctx.lineTo(pts[2][0],pts[2][1]); ctx.stroke();
    });
    // label pill
    const text = `${b.label} ${Math.round(b.confidence*100)}%`;
    ctx.font = "bold 12px Inter, sans-serif";
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.roundRect(x, y - 22, tw + 14, 20, 5); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(text, x + 7, y - 7);
  });

  // ── Head tilt indicator ──────────────────────────────
  if (result.posture.landmarks_detected) {
    const cx = W / 2, cy = H * 0.18;
    const tilt = result.posture.head_tilt_deg;
    const ok = result.posture.posture_score > 0.6;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((tilt * Math.PI) / 180);
    ctx.shadowBlur = 8; ctx.shadowColor = ok ? "#10b981" : "#f59e0b";
    ctx.strokeStyle = ok ? "#10b981" : "#f59e0b";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-28, 0); ctx.lineTo(28, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fillStyle = ok ? "#10b981" : "#f59e0b"; ctx.fill();
    ctx.restore();
  }

  // ── Eye strain overlay ───────────────────────────────
  if (result.posture.eye_strain_score > 0.6) {
    ctx.fillStyle = "rgba(245,158,11,0.88)";
    ctx.beginPath(); ctx.roundRect(12, 12, 210, 32, 8); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 13px Inter, sans-serif";
    ctx.fillText("👁️ Fatiga visual detectada", 22, 32);
  }

  // ── Environment badge bottom-left ────────────────────
  const envTxt = `${CTX_ICON[result.environment.context] ?? "📍"} ${CTX_LABEL[result.environment.context]}`;
  ctx.font = "13px Inter, sans-serif";
  const etw = ctx.measureText(envTxt).width;
  ctx.fillStyle = "rgba(11,31,28,0.80)";
  ctx.beginPath(); ctx.roundRect(12, H - 44, etw + 24, 30, 8); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.fillText(envTxt, 24, H - 23);

  // ── Posture score meter top-right ────────────────────
  const ps = Math.round(result.posture.posture_score * 100);
  const pcol = ps > 70 ? "#10b981" : ps > 45 ? "#f59e0b" : "#ef4444";
  ctx.fillStyle = "rgba(11,31,28,0.80)";
  ctx.beginPath(); ctx.roundRect(W - 110, 12, 98, 32, 8); ctx.fill();
  ctx.fillStyle = pcol; ctx.font = "bold 13px Inter, sans-serif";
  ctx.fillText(`🦴 Postura ${ps}%`, W - 102, 32);
}

export default function CVPage() {
  const { loading: authLoading } = useRequireAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [active, setActive] = useState(false);
  const [result, setResult] = useState<CVResult | null>(null);
  const [frames, setFrames] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Continuous canvas redraw at video framerate
  const renderLoop = useCallback(() => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (video && canvas && video.readyState >= 2) drawFrame(canvas, video, result);
    animRef.current = requestAnimationFrame(renderLoop);
  }, [result]);

  useEffect(() => {
    if (active) { animRef.current = requestAnimationFrame(renderLoop); }
    return () => cancelAnimationFrame(animRef.current);
  }, [active, renderLoop]);

  const analyze = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    const cap = document.createElement("canvas");
    cap.width = 416; cap.height = 416;
    cap.getContext("2d")?.drawImage(video, 0, 0, 416, 416);
    const b64 = cap.toDataURL("image/jpeg", 0.8).split(",")[1];
    setFrames(f => f + 1);
    try {
      const r = await fetch("/api/cv/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ webcam_frame_b64: b64 }) });
      if (r.ok) setResult(await r.json());
    } catch { /* keep last */ }
  }, []);

  const startCamera = useCallback(async () => {
    setError(null); setLoading(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: "user" } });
      streamRef.current = s;
      if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play(); }
      setActive(true); setFrames(0);
      intervalRef.current = setInterval(analyze, 1500);
    } catch { setError("Permiso de cámara denegado. Habilítalo en el navegador."); }
    finally { setLoading(false); }
  }, [analyze]);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setActive(false); setResult(null); setFrames(0);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  if (authLoading) return null;

  const p = result?.posture;
  const env = result?.environment;
  const eyeHigh = (p?.eye_strain_score ?? 0) > 0.65;
  const postureLow = (p?.posture_score ?? 1) < 0.45;
  const blinkLow = active && (p?.blink_rate_rpm ?? 15) < 8;

  return (
    <AppShell showRight={false}>
      <div style={{ padding: "24px 28px", maxWidth: 1200, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div>
            <h1 style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontSize: 26, margin: 0 }}>
              Visión en tiempo real
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>
              MediaPipe Pose · YOLOv8n Detection · Computer Vision
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {active && (
              <div style={{ fontSize: 12, color: "#10b981", fontWeight: 700, display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "pulse 1s infinite" }} />
                EN VIVO · {frames} análisis
              </div>
            )}
            <button onClick={active ? stopCamera : startCamera} disabled={loading} style={{
              padding: "10px 24px", borderRadius: 24, border: "none", cursor: loading ? "not-allowed" : "pointer",
              fontSize: 13, fontWeight: 700,
              background: active ? "#fef2f2" : "linear-gradient(135deg,#0c9a6c,#06b6d4)", color: active ? "#ef4444" : "#fff",
            }}>
              {loading ? "Iniciando…" : active ? "⏹ Detener" : "▶ Activar cámara"}
            </button>
          </div>
        </div>

        {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#dc2626" }}>{error}</div>}

        {/* Main grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 18 }}>

          {/* Camera + overlay */}
          <div>
            <div style={{ position: "relative", background: "#060f0d", borderRadius: 20, overflow: "hidden", aspectRatio: "16/9" }}>
              {/* Idle state */}
              {!active && (
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                  <div style={{ fontSize: 64 }}>📷</div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, fontWeight: 500 }}>Cámara desactivada</div>
                  <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>Los frames nunca se almacenan · Solo se analizan scores</div>
                </div>
              )}

              {/* Live video (mirrored) */}
              <video ref={videoRef} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: active ? "block" : "none", transform: "scaleX(-1)" }} />

              {/* Canvas overlay (also mirrored) */}
              <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", display: active ? "block" : "none", transform: "scaleX(-1)" }} />

              {/* REC badge */}
              {active && (
                <div style={{ position: "absolute", top: 14, right: 14, background: "rgba(0,0,0,0.7)", borderRadius: 8, padding: "5px 10px", display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#fff", fontWeight: 700 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} /> REC
                </div>
              )}

              {/* Model pills */}
              {active && (
                <div style={{ position: "absolute", bottom: 14, right: 14, display: "flex", gap: 6 }}>
                  {["MediaPipe","YOLOv8n"].map(m => (
                    <span key={m} style={{ background: "rgba(16,185,129,0.9)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999 }}>{m}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Detected objects list (YOLO) */}
            {active && (env?.boxes?.length ?? 0) > 0 && (
              <div style={{ marginTop: 14, background: "var(--surface-1,#fff)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>
                  Objetos detectados — YOLOv8n ({env!.boxes.length})
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {env!.boxes.map((b, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: labelColor(b.label) + "18", border: `1px solid ${labelColor(b.label)}44`, borderRadius: 10, padding: "5px 10px" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: labelColor(b.label), flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)" }}>{b.label}</span>
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>{Math.round(b.confidence * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right panel — live readings */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* IA status card */}
            <div style={{ background: active && result?.cv_available ? "linear-gradient(135deg,#e6f7f3,#f0fdfa)" : "var(--surface-1,#f8fafb)", border: "1px solid var(--line)", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: active ? "linear-gradient(135deg,#0c9a6c,#06b6d4)" : "var(--line)", display: "grid", placeItems: "center", fontSize: 20, flexShrink: 0 }}>🧠</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{!active ? "IA en espera" : result?.cv_available ? "IA analizando" : "Modelos no instalados"}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                  {!active ? "Activa la cámara para comenzar" : result?.cv_available ? `Landmarks: ${p?.landmarks_detected ? "✓ detectados" : "buscando…"}` : "pip install mediapipe ultralytics"}
                </div>
              </div>
            </div>

            {/* Scores */}
            <div style={{ background: "var(--surface-1,#fff)", border: "1px solid var(--line)", borderRadius: 16, padding: "16px 18px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 14 }}>Scores en vivo</div>
              {[
                { label: "Bienestar físico", value: result?.physical_wellness_score ?? 0.5, color: "#10b981" },
                { label: "Postura", value: p?.posture_score ?? 0.5, color: "#6366f1" },
                { label: "Fatiga visual", value: p?.eye_strain_score ?? 0, color: "#f59e0b" },
                { label: "Riesgo distracción", value: result?.distraction_risk_score ?? 0, color: "#ef4444" },
              ].map(s => (
                <div key={s.label} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>{s.label}</span>
                    <span style={{ fontWeight: 700, color: s.color }}>{Math.round(s.value * 100)}%</span>
                  </div>
                  <div style={{ height: 6, background: "var(--line)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.round(s.value * 100)}%`, background: s.color, borderRadius: 4, transition: "width 0.7s ease" }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Key numbers */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ background: blinkLow ? "#fef2f2" : "var(--surface-1,#fff)", border: `1px solid ${blinkLow ? "#fecaca" : "var(--line)"}`, borderRadius: 14, padding: "14px 14px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>👁️ Parpadeos/min</div>
                <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: blinkLow ? "#ef4444" : "#10b981", lineHeight: 1 }}>{(p?.blink_rate_rpm ?? 15).toFixed(0)}</div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>Normal 12–20{blinkLow ? " · ⚠️ bajo" : ""}</div>
              </div>
              <div style={{ background: "var(--surface-1,#fff)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 14px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>📐 Inclinación</div>
                <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: Math.abs(p?.head_tilt_deg ?? 0) > 15 ? "#f59e0b" : "#06b6d4", lineHeight: 1 }}>{Math.abs(p?.head_tilt_deg ?? 0).toFixed(1)}°</div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>Límite: 15°</div>
              </div>
            </div>

            {/* Environment */}
            <div style={{ background: "var(--surface-1,#fff)", border: "1px solid var(--line)", borderRadius: 16, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>Entorno — YOLO</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 32 }}>{CTX_ICON[env?.context ?? "unknown"]}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{CTX_LABEL[env?.context ?? "unknown"]}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>Conf. {Math.round((env?.confidence ?? 0) * 100)}%</div>
                </div>
              </div>
              {(env?.detected_objects?.length ?? 0) > 0 && (
                <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {env!.detected_objects.map(o => (
                    <span key={o} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 999, background: "var(--teal-50)", color: "var(--teal-700)", fontWeight: 600 }}>{o}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Alerts */}
            {(eyeHigh || postureLow) && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {eyeHigh && <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 12px", fontSize: 12, fontWeight: 600, color: "#92400e" }}>👁️ Regla 20-20-20: mira 6m por 20 segundos</div>}
                {postureLow && <div style={{ background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 10, padding: "10px 12px", fontSize: 12, fontWeight: 600, color: "#3730a3" }}>🦴 Ajusta los hombros · Levanta el monitor</div>}
              </div>
            )}

            {/* Privacy note */}
            <div style={{ fontSize: 10, color: "var(--muted)", textAlign: "center", lineHeight: 1.5 }}>
              🔒 Los frames <b>nunca se envían ni almacenan</b><br/>Solo los scores numéricos se persisten
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
