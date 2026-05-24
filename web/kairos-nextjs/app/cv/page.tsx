"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { useRequireAuth } from "@/hooks/useRequireAuth";

// ── Types ────────────────────────────────────────────────────────────────────
interface Box { label: string; confidence: number; x1: number; y1: number; x2: number; y2: number; }
interface PoseLandmark { x: number; y: number; z: number; visibility: number; }
interface AnxietyData {
  anxiety_score: number; stress_level: string;
  face_touch_rate: number; head_movement_rate: number;
  postural_sway: number; shoulder_tension: number;
  fidget_score: number; indicators: string[];
}
interface ObjectScore {
  label: string; category: string;
  productivity_score: number; distraction_score: number; count: number;
}
interface CVResult {
  cv_available: boolean;
  physical_wellness_score: number;
  digital_context_score: number;
  distraction_risk_score: number;
  posture: { posture_score: number; eye_strain_score: number; blink_rate_rpm: number; head_tilt_deg: number; landmarks_detected: boolean; shoulder_tension: number; };
  environment: { context: string; confidence: number; detected_objects: string[]; boxes: Box[]; };
  anxiety: AnxietyData;
  object_scores: ObjectScore[];
  pose_landmarks: PoseLandmark[];
}
interface SessionSnapshot {
  timestamp_s: number; posture_score: number; eye_strain_score: number;
  anxiety_score: number; stress_level: string; shoulder_tension: number;
  face_touch_rate: number; distraction_risk: number; environment_context: string;
  blink_rate_rpm: number;
}
interface SessionReport {
  summary: Record<string, unknown>;
  llm_payload: string;
  recommendations: string[];
  risk_flags: string[];
}

// ── Constants ────────────────────────────────────────────────────────────────
const CTX_LABEL: Record<string, string> = {
  workspace: "Espacio de trabajo", bedroom: "Dormitorio", couch: "Sofá",
  kitchen: "Cocina", outdoor: "Exterior", transport: "Transporte", unknown: "Detectando…",
};
const CTX_ICON: Record<string, string> = {
  workspace: "💻", bedroom: "🛏️", couch: "🛋️", kitchen: "🍳",
  outdoor: "🌳", transport: "🚌", unknown: "🔍",
};
const STRESS_COLOR: Record<string, string> = { low: "#10b981", medium: "#f59e0b", high: "#ef4444" };
const STRESS_LABEL: Record<string, string> = { low: "Bajo", medium: "Moderado", high: "Alto" };
const BOX_COLORS = ["#10b981","#06b6d4","#a78bfa","#f59e0b","#ef4444","#ec4899","#84cc16","#f97316"];
const labelColor = (lbl: string) => BOX_COLORS[Math.abs([...lbl].reduce((a,c)=>a+c.charCodeAt(0),0)) % BOX_COLORS.length];

// MediaPipe Pose connections (upper body focus)
const POSE_CONNECTIONS: [number,number][] = [
  [11,12],[11,13],[13,15],[12,14],[14,16],   // shoulders + arms
  [11,23],[12,24],[23,24],                    // torso
  [23,25],[24,26],                            // upper legs (if visible)
  [0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6], // face outline
  [9,10],                                     // mouth
];

// ── Canvas drawing ───────────────────────────────────────────────────────────
function drawFrame(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  result: CVResult | null,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width  = video.videoWidth  || 640;
  canvas.height = video.videoHeight || 480;
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  if (!result) return;

  const postureScore  = result.posture.posture_score;
  const shoulderTense = result.posture.shoulder_tension ?? 0;

  // ── Exoskeleton ──────────────────────────────────────────────────────────
  const lms = result.pose_landmarks;
  if (lms.length >= 17) {
    // Bones (connections)
    POSE_CONNECTIONS.forEach(([a, b]) => {
      const lmA = lms[a], lmB = lms[b];
      if (!lmA || !lmB) return;
      if (lmA.visibility < 0.4 || lmB.visibility < 0.4) return;
      const isShoulder = (a === 11 && b === 12);
      // Color por salud: verde = bueno, amarillo = alerta, rojo = mal
      let col: string;
      if (isShoulder) {
        col = shoulderTense > 0.55 ? "#ef4444" : shoulderTense > 0.3 ? "#f59e0b" : "#10b981";
      } else {
        col = postureScore > 0.70 ? "#10b981" : postureScore > 0.45 ? "#f59e0b" : "#ef4444";
      }
      ctx.save();
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 6;
      ctx.shadowColor = col;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(lmA.x * W, lmA.y * H);
      ctx.lineTo(lmB.x * W, lmB.y * H);
      ctx.stroke();
      ctx.restore();
    });
    // Joints
    lms.forEach((lm, i) => {
      if (lm.visibility < 0.4) return;
      if (i > 28) return; // skip feet
      const isKeyJoint = [11,12,13,14,15,16,23,24].includes(i);
      ctx.save();
      ctx.fillStyle = isKeyJoint ? "#fff" : "rgba(255,255,255,0.6)";
      ctx.shadowBlur = isKeyJoint ? 8 : 3;
      ctx.shadowColor = "#10b981";
      ctx.beginPath();
      ctx.arc(lm.x * W, lm.y * H, isKeyJoint ? 5 : 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // ── YOLO bounding boxes ──────────────────────────────────────────────────
  result.environment.boxes.forEach(b => {
    const col = labelColor(b.label);
    const x = b.x1 * W, y = b.y1 * H, w = (b.x2 - b.x1) * W, h = (b.y2 - b.y1) * H;
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, w, h);
    // Corner accents
    const cs = 10;
    ctx.lineWidth = 4;
    [[[x,y],[x+cs,y],[x,y+cs]],[[x+w,y],[x+w-cs,y],[x+w,y+cs]],
     [[x,y+h],[x+cs,y+h],[x,y+h-cs]],[[x+w,y+h],[x+w-cs,y+h],[x+w,y+h-cs]]].forEach(pts => {
      ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]);
      ctx.lineTo(pts[1][0],pts[1][1]); ctx.moveTo(pts[0][0],pts[0][1]);
      ctx.lineTo(pts[2][0],pts[2][1]); ctx.stroke();
    });
    // Label pill
    const text = `${b.label} ${Math.round(b.confidence*100)}%`;
    ctx.font = "bold 12px Inter, sans-serif";
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.roundRect(x, y - 22, tw + 14, 20, 5); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(text, x + 7, y - 7);
  });

  // ── Head tilt indicator ──────────────────────────────────────────────────
  if (result.posture.landmarks_detected && lms[0]) {
    const cx = lms[0].x * W || W / 2, cy = lms[0].y * H || H * 0.12;
    const tilt = result.posture.head_tilt_deg;
    const ok   = Math.abs(tilt) < 12;
    ctx.save();
    ctx.translate(cx, cy - 30);
    ctx.rotate((tilt * Math.PI) / 180);
    ctx.shadowBlur = 8; ctx.shadowColor = ok ? "#10b981" : "#f59e0b";
    ctx.strokeStyle = ok ? "#10b981" : "#f59e0b";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(24, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2);
    ctx.fillStyle = ok ? "#10b981" : "#f59e0b"; ctx.fill();
    ctx.restore();
  }

  // ── Anxiety stress overlay ───────────────────────────────────────────────
  const anxiety = result.anxiety;
  if (anxiety?.stress_level === "high") {
    ctx.fillStyle = "rgba(239,68,68,0.18)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(239,68,68,0.90)";
    ctx.beginPath(); ctx.roundRect(12, 44, 230, 28, 7); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 13px Inter";
    ctx.fillText("⚠️ Estrés elevado detectado", 22, 63);
  } else if (anxiety?.stress_level === "medium") {
    ctx.fillStyle = "rgba(245,158,11,0.88)";
    ctx.beginPath(); ctx.roundRect(12, 44, 240, 28, 7); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 13px Inter";
    ctx.fillText("⚡ Signos de tensión moderada", 22, 63);
  }

  // ── Eye strain overlay ───────────────────────────────────────────────────
  if (result.posture.eye_strain_score > 0.60) {
    ctx.fillStyle = "rgba(245,158,11,0.88)";
    ctx.beginPath(); ctx.roundRect(12, 12, 210, 28, 7); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 13px Inter";
    ctx.fillText("👁️ Fatiga visual detectada", 22, 31);
  }

  // ── Environment badge ────────────────────────────────────────────────────
  const envTxt = `${CTX_ICON[result.environment.context]??'📍'} ${CTX_LABEL[result.environment.context]}`;
  ctx.font = "13px Inter";
  const etw = ctx.measureText(envTxt).width;
  ctx.fillStyle = "rgba(11,31,28,0.80)";
  ctx.beginPath(); ctx.roundRect(12, H-44, etw+24, 30, 8); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.fillText(envTxt, 24, H-23);

  // ── Posture meter top-right ──────────────────────────────────────────────
  const ps   = Math.round(result.posture.posture_score * 100);
  const pcol = ps > 70 ? "#10b981" : ps > 45 ? "#f59e0b" : "#ef4444";
  ctx.fillStyle = "rgba(11,31,28,0.80)";
  ctx.beginPath(); ctx.roundRect(W-120, 12, 108, 28, 8); ctx.fill();
  ctx.fillStyle = pcol; ctx.font = "bold 13px Inter";
  ctx.fillText(`🦴 Postura ${ps}%`, W-112, 31);
}

// ── Component ────────────────────────────────────────────────────────────────
export default function CVPage() {
  const { checking: authLoading } = useRequireAuth();
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const animRef     = useRef<number>(0);
  const streamRef   = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStart= useRef<number>(0);

  const [active,    setActive]    = useState(false);
  const [result,    setResult]    = useState<CVResult | null>(null);
  const [frames,    setFrames]    = useState(0);
  const [error,     setError]     = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [tab,       setTab]       = useState<"posture"|"anxiety"|"objects">("posture");
  const [showReport,setShowReport]= useState(false);
  const [report,    setReport]    = useState<SessionReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Accumulate session snapshots
  const snapshotsRef = useRef<SessionSnapshot[]>([]);
  const objectMapRef = useRef<Map<string, { count: number; meta: ObjectScore }>>(new Map());

  // Render loop
  const renderLoop = useCallback(() => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (video && canvas && video.readyState >= 2) drawFrame(canvas, video, result);
    animRef.current = requestAnimationFrame(renderLoop);
  }, [result]);

  useEffect(() => {
    if (active) animRef.current = requestAnimationFrame(renderLoop);
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
      const r = await fetch("/api/cv/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webcam_frame_b64: b64 }),
      });
      if (r.ok) {
        const data: CVResult = await r.json();
        setResult(data);
        // Accumulate snapshot
        const elapsed = (Date.now() - sessionStart.current) / 1000;
        snapshotsRef.current.push({
          timestamp_s:       elapsed,
          posture_score:     data.posture.posture_score,
          eye_strain_score:  data.posture.eye_strain_score,
          anxiety_score:     data.anxiety.anxiety_score,
          stress_level:      data.anxiety.stress_level,
          shoulder_tension:  data.posture.shoulder_tension,
          face_touch_rate:   data.anxiety.face_touch_rate,
          distraction_risk:  data.distraction_risk_score,
          environment_context: data.environment.context,
          blink_rate_rpm:    data.posture.blink_rate_rpm,
        });
        // Accumulate objects
        data.object_scores.forEach(o => {
          const prev = objectMapRef.current.get(o.label);
          objectMapRef.current.set(o.label, { count: (prev?.count ?? 0) + 1, meta: o });
        });
      }
    } catch { /* keep last */ }
  }, []);

  const startCamera = useCallback(async () => {
    setError(null); setLoading(true);
    snapshotsRef.current = [];
    objectMapRef.current = new Map();
    setReport(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
      });
      streamRef.current = s;
      if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play(); }
      sessionStart.current = Date.now();
      setActive(true); setFrames(0);
      intervalRef.current = setInterval(analyze, 1500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Error de cámara: ${msg.includes("Permission") || msg.includes("denied") ? "Permiso denegado — habilítalo en el navegador." : msg}`);
    } finally { setLoading(false); }
  }, [analyze]);

  const generateReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const duration = (Date.now() - sessionStart.current) / 1000;
      const objectInteractions = Array.from(objectMapRef.current.entries()).map(([label, { count, meta }]) => ({
        label,
        category: meta.category,
        frames_detected: count,
        productivity_score: meta.productivity_score,
        distraction_score: meta.distraction_score,
      }));
      const r = await fetch("/api/cv/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration_seconds: duration,
          total_frames: snapshotsRef.current.length,
          snapshots: snapshotsRef.current.slice(-200), // max 200 snapshots
          object_interactions: objectInteractions,
        }),
      });
      if (r.ok) { setReport(await r.json()); setShowReport(true); }
    } catch { /* ignore */ } finally { setReportLoading(false); }
  }, []);

  const stopCamera = useCallback(async () => {
    cancelAnimationFrame(animRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setActive(false); setResult(null); setFrames(0);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    // Auto-generate report if we have enough data
    if (snapshotsRef.current.length >= 5) await generateReport();
  }, [generateReport]);

  useEffect(() => () => { stopCamera(); }, [stopCamera]);

  if (authLoading) return null;

  const p   = result?.posture;
  const anx = result?.anxiety;
  const env = result?.environment;
  const eyeHigh    = (p?.eye_strain_score ?? 0) > 0.65;
  const postureLow = (p?.posture_score ?? 1) < 0.45;
  const blinkLow   = active && (p?.blink_rate_rpm ?? 15) < 8;
  const stressCol  = STRESS_COLOR[anx?.stress_level ?? "low"] ?? "#10b981";

  return (
    <AppShell showRight={false}>
      <div style={{ padding: "20px 24px", maxWidth: 1280, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h1 style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontSize: 24, margin: 0 }}>
              Visión en tiempo real
            </h1>
            <p style={{ margin: "3px 0 0", fontSize: 11, color: "var(--muted)" }}>
              Pose Skeleton · MediaPipe · YOLOv8n · Anxiety Detector
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {active && (
              <span style={{ fontSize: 12, color: "#10b981", fontWeight: 700, display: "flex", gap: 5, alignItems: "center" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
                EN VIVO · {frames}
              </span>
            )}
            {!active && snapshotsRef.current.length >= 5 && (
              <button onClick={generateReport} disabled={reportLoading} style={{
                padding: "9px 18px", borderRadius: 20, border: "1px solid #10b981", cursor: "pointer",
                fontSize: 12, fontWeight: 600, background: "transparent", color: "#10b981",
              }}>{reportLoading ? "Generando…" : "📊 Ver reporte"}</button>
            )}
            <button onClick={active ? stopCamera : startCamera} disabled={loading} style={{
              padding: "10px 22px", borderRadius: 24, border: "none", cursor: loading ? "not-allowed" : "pointer",
              fontSize: 13, fontWeight: 700,
              background: active ? "#fef2f2" : "linear-gradient(135deg,#0c9a6c,#06b6d4)", color: active ? "#ef4444" : "#fff",
            }}>
              {loading ? "Iniciando…" : active ? "⏹ Detener" : "▶ Activar cámara"}
            </button>
          </div>
        </div>

        {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#dc2626" }}>{error}</div>}

        {/* Main grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>

          {/* Camera + canvas */}
          <div>
            <div style={{ position: "relative", background: "#060f0d", borderRadius: 18, overflow: "hidden", aspectRatio: "16/9" }}>
              {!active && (
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <div style={{ fontSize: 56 }}>📷</div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 500 }}>Cámara desactivada</div>
                  <div style={{ color: "rgba(255,255,255,0.28)", fontSize: 11 }}>Frames nunca almacenados · Solo se analizan scores</div>
                </div>
              )}
              <video ref={videoRef} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: active ? "block" : "none", transform: "scaleX(-1)" }} />
              <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", display: active ? "block" : "none", transform: "scaleX(-1)" }} />
              {active && (
                <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.65)", borderRadius: 7, padding: "4px 9px", display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#fff", fontWeight: 700 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} /> REC
                </div>
              )}
              {active && (
                <div style={{ position: "absolute", bottom: 12, right: 12, display: "flex", gap: 5 }}>
                  {["MediaPipe","YOLOv8n","Anxiety"].map(m => (
                    <span key={m} style={{ background: "rgba(16,185,129,0.9)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 999 }}>{m}</span>
                  ))}
                </div>
              )}
            </div>

            {/* YOLO detected objects */}
            {active && (env?.boxes?.length ?? 0) > 0 && (
              <div style={{ marginTop: 12, background: "var(--surface-1,#fff)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>
                  Objetos detectados — YOLOv8n ({env!.boxes.length})
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {env!.boxes.map((b, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, background: labelColor(b.label) + "18", border: `1px solid ${labelColor(b.label)}44`, borderRadius: 8, padding: "4px 9px" }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: labelColor(b.label) }} />
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{b.label}</span>
                      <span style={{ fontSize: 10, color: "var(--muted)" }}>{Math.round(b.confidence*100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Object scores (productivity/distraction) */}
            {active && (result?.object_scores?.length ?? 0) > 0 && (
              <div style={{ marginTop: 10, background: "var(--surface-1,#fff)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>
                  Scoring de objetos
                </div>
                {result!.object_scores.map(o => (
                  <div key={o.label} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                      <span style={{ fontWeight: 600 }}>{o.label} <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: 10 }}>({o.category})</span></span>
                      <span style={{ fontSize: 10, display: "flex", gap: 8 }}>
                        <span style={{ color: "#10b981" }}>📈 {Math.round(o.productivity_score*100)}%</span>
                        <span style={{ color: "#ef4444" }}>⚡ {Math.round(o.distraction_score*100)}%</span>
                      </span>
                    </div>
                    <div style={{ height: 4, background: "var(--line)", borderRadius: 2, overflow: "hidden", display: "flex" }}>
                      <div style={{ height: "100%", width: `${o.productivity_score*100}%`, background: "#10b981", borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            {/* IA status */}
            <div style={{ background: active && result?.cv_available ? "linear-gradient(135deg,#e6f7f3,#f0fdfa)" : "var(--surface-1,#f8fafb)", border: "1px solid var(--line)", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: active ? "linear-gradient(135deg,#0c9a6c,#06b6d4)" : "var(--line)", display: "grid", placeItems: "center", fontSize: 18, flexShrink: 0 }}>🧠</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{!active ? "IA en espera" : result?.cv_available ? "Analizando" : "Modelos no disponibles"}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  {!active ? "Activa la cámara" : `Skeleton: ${(result?.pose_landmarks?.length ?? 0) > 0 ? "✓" : "buscando…"} · Landmarks: ${p?.landmarks_detected ? "✓" : "…"}`}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, background: "var(--surface-1,#f4f4f5)", borderRadius: 10, padding: 3 }}>
              {(["posture","anxiety","objects"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  flex: 1, padding: "6px 0", borderRadius: 8, border: "none", cursor: "pointer",
                  fontSize: 11, fontWeight: tab === t ? 700 : 500,
                  background: tab === t ? "#fff" : "transparent",
                  color: tab === t ? "var(--ink)" : "var(--muted)",
                  boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                }}>
                  {t === "posture" ? "🦴 Postura" : t === "anxiety" ? "🧠 Ansiedad" : "📦 Objetos"}
                </button>
              ))}
            </div>

            {/* Tab: Postura */}
            {tab === "posture" && (
              <div style={{ background: "var(--surface-1,#fff)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>Métricas posturales</div>
                {[
                  { label: "Bienestar físico", value: result?.physical_wellness_score ?? 0.5, color: "#10b981" },
                  { label: "Postura", value: p?.posture_score ?? 0.5, color: "#6366f1" },
                  { label: "Fatiga visual", value: p?.eye_strain_score ?? 0, color: "#f59e0b" },
                  { label: "Tensión hombros", value: p?.shoulder_tension ?? 0, color: "#ef4444" },
                ].map(s => (
                  <div key={s.label} style={{ marginBottom: 11 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                      <span style={{ fontWeight: 500 }}>{s.label}</span>
                      <span style={{ fontWeight: 700, color: s.color }}>{Math.round(s.value*100)}%</span>
                    </div>
                    <div style={{ height: 5, background: "var(--line)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.round(s.value*100)}%`, background: s.color, borderRadius: 3, transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                ))}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
                  <div style={{ background: blinkLow ? "#fef2f2" : "var(--surface-1,#f8fafb)", border: `1px solid ${blinkLow ? "#fecaca" : "var(--line)"}`, borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: 4 }}>👁️ Parpadeos/min</div>
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: blinkLow ? "#ef4444" : "#10b981" }}>{(p?.blink_rate_rpm ?? 15).toFixed(0)}</div>
                    <div style={{ fontSize: 9, color: "var(--muted)" }}>Normal 12–20</div>
                  </div>
                  <div style={{ background: "var(--surface-1,#f8fafb)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: 4 }}>📐 Inclinación</div>
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: Math.abs(p?.head_tilt_deg ?? 0) > 15 ? "#f59e0b" : "#06b6d4" }}>{Math.abs(p?.head_tilt_deg ?? 0).toFixed(1)}°</div>
                    <div style={{ fontSize: 9, color: "var(--muted)" }}>Límite: 15°</div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Ansiedad */}
            {tab === "anxiety" && (
              <div style={{ background: "var(--surface-1,#fff)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>Indicadores de ansiedad/estrés</div>

                {/* Stress level badge */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "10px 12px", borderRadius: 10, background: stressCol + "15", border: `1px solid ${stressCol}40` }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: stressCol }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: stressCol }}>
                      Estrés: {STRESS_LABEL[anx?.stress_level ?? "low"]}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--muted)" }}>Score: {Math.round((anx?.anxiety_score ?? 0)*100)}%</div>
                  </div>
                </div>

                {[
                  { label: "Score ansiedad", value: anx?.anxiety_score ?? 0, color: stressCol },
                  { label: "Tensión hombros", value: anx?.shoulder_tension ?? 0, color: "#6366f1" },
                  { label: "Sway postural", value: anx?.postural_sway ?? 0, color: "#f59e0b" },
                  { label: "Fidgeting", value: anx?.fidget_score ?? 0, color: "#ec4899" },
                ].map(s => (
                  <div key={s.label} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                      <span style={{ fontWeight: 500 }}>{s.label}</span>
                      <span style={{ fontWeight: 700, color: s.color }}>{Math.round(s.value*100)}%</span>
                    </div>
                    <div style={{ height: 5, background: "var(--line)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.round(s.value*100)}%`, background: s.color, borderRadius: 3, transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                ))}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
                  <div style={{ background: "var(--surface-1,#f8fafb)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: 4 }}>🖐️ Toques cara/min</div>
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: (anx?.face_touch_rate ?? 0) > 3 ? "#ef4444" : "#06b6d4" }}>
                      {(anx?.face_touch_rate ?? 0).toFixed(1)}
                    </div>
                  </div>
                  <div style={{ background: "var(--surface-1,#f8fafb)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: 4 }}>🌀 Movimiento cabeza</div>
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: (anx?.head_movement_rate ?? 0) > 0.010 ? "#f59e0b" : "#10b981" }}>
                      {((anx?.head_movement_rate ?? 0)*1000).toFixed(1)}
                    </div>
                    <div style={{ fontSize: 9, color: "var(--muted)" }}>×10⁻³ norm.</div>
                  </div>
                </div>

                {/* Active indicators */}
                {(anx?.indicators?.length ?? 0) > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>Señales activas</div>
                    {anx!.indicators.map(ind => (
                      <div key={ind} style={{ fontSize: 11, padding: "5px 9px", borderRadius: 7, background: "#fef3c7", border: "1px solid #fde68a", color: "#92400e", marginBottom: 4, fontWeight: 500 }}>
                        ⚡ {INDICATOR_LABELS[ind] ?? ind}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Objetos */}
            {tab === "objects" && (
              <div style={{ background: "var(--surface-1,#fff)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>Entorno y objetos</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 28 }}>{CTX_ICON[env?.context ?? "unknown"]}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{CTX_LABEL[env?.context ?? "unknown"]}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>Conf. {Math.round((env?.confidence ?? 0)*100)}% · Riesgo {Math.round((result?.distraction_risk_score ?? 0)*100)}%</div>
                  </div>
                </div>
                {(result?.object_scores?.length ?? 0) > 0 ? result!.object_scores.map(o => (
                  <div key={o.label} style={{ marginBottom: 10, padding: "8px 10px", borderRadius: 8, background: "var(--surface-1,#f8fafb)", border: "1px solid var(--line)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700 }}>{o.label}</span>
                      <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 999, background: o.category === "distraction" ? "#fef2f2" : o.category === "study_tool" || o.category === "work_tool" ? "#f0fdf4" : "#f0f9ff", color: o.category === "distraction" ? "#dc2626" : o.category === "study_tool" || o.category === "work_tool" ? "#16a34a" : "#0369a1", fontWeight: 600 }}>
                        {o.category}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
                      <span style={{ color: "#10b981" }}>📈 {Math.round(o.productivity_score*100)}%</span>
                      <span style={{ color: "#ef4444" }}>⚡ {Math.round(o.distraction_score*100)}%</span>
                    </div>
                  </div>
                )) : (
                  <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 12, padding: "20px 0" }}>
                    {active ? "Apunta a objetos para detectarlos" : "Activa la cámara para detectar objetos"}
                  </div>
                )}
              </div>
            )}

            {/* Alerts */}
            {active && (eyeHigh || postureLow) && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {eyeHigh && <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 9, padding: "9px 11px", fontSize: 11, fontWeight: 600, color: "#92400e" }}>👁️ Regla 20-20-20: mira 6m por 20s</div>}
                {postureLow && <div style={{ background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 9, padding: "9px 11px", fontSize: 11, fontWeight: 600, color: "#3730a3" }}>🦴 Ajusta hombros · Levanta el monitor</div>}
              </div>
            )}

            <div style={{ fontSize: 9, color: "var(--muted)", textAlign: "center", lineHeight: 1.5 }}>
              🔒 Frames <b>nunca almacenados</b> · Solo scores numéricos
            </div>
          </div>
        </div>
      </div>

      {/* Session Report Modal */}
      {showReport && report && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setShowReport(false)}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 700, width: "100%", maxHeight: "85vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}>📊 Reporte de Sesión</h2>
              <button onClick={() => setShowReport(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--muted)" }}>✕</button>
            </div>

            {/* Risk flags */}
            {report.risk_flags.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>Señales de riesgo</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {report.risk_flags.map(f => (
                    <span key={f} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontWeight: 600 }}>{f}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Summary metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 18 }}>
              {[
                { label: "Postura prom.", value: `${Math.round(((report.summary.avg_posture_score as number)??0)*100)}%`, color: "#6366f1" },
                { label: "Ansiedad prom.", value: `${Math.round(((report.summary.avg_anxiety_score as number)??0)*100)}%`, color: STRESS_COLOR[(report.summary.dominant_stress_level as string)??'low'] },
                { label: "Pico ansiedad", value: `${Math.round(((report.summary.peak_anxiety_score as number)??0)*100)}%`, color: "#ef4444" },
                { label: "Fatiga visual", value: `${Math.round(((report.summary.avg_eye_strain as number)??0)*100)}%`, color: "#f59e0b" },
                { label: "Parpadeos/min", value: `${((report.summary.avg_blink_rate_rpm as number)??15).toFixed(1)}`, color: "#10b981" },
                { label: "Duración", value: `${report.summary.duration_minutes}min`, color: "#06b6d4" },
              ].map(m => (
                <div key={m.label} style={{ background: "var(--surface-1,#f8fafb)", borderRadius: 10, padding: "10px 12px", border: "1px solid var(--line)" }}>
                  <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: m.color, fontFamily: "'JetBrains Mono', monospace" }}>{m.value}</div>
                </div>
              ))}
            </div>

            {/* Recommendations */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>Recomendaciones</div>
              {report.recommendations.map((rec, i) => (
                <div key={i} style={{ fontSize: 13, padding: "9px 12px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", marginBottom: 6 }}>
                  ✅ {rec}
                </div>
              ))}
            </div>

            {/* LLM payload */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>Payload para LLM Doctor</div>
              <pre style={{ fontSize: 11, background: "#f8fafb", borderRadius: 10, padding: 14, border: "1px solid var(--line)", overflow: "auto", maxHeight: 260, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                {report.llm_payload}
              </pre>
              <button onClick={() => navigator.clipboard.writeText(report.llm_payload)} style={{ marginTop: 10, padding: "8px 16px", borderRadius: 8, border: "1px solid var(--line)", background: "transparent", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                📋 Copiar payload
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// Indicator label map (Spanish)
const INDICATOR_LABELS: Record<string, string> = {
  face_touching_frequent:    "Toca la cara frecuentemente",
  face_touching_occasional:  "Toca la cara ocasionalmente",
  head_restlessness_high:    "Movimiento de cabeza elevado",
  head_restlessness_moderate:"Movimiento de cabeza moderado",
  postural_instability:      "Inestabilidad postural",
  shoulder_tension_high:     "Hombros muy tensos/elevados",
  shoulder_tension_moderate: "Tensión leve en hombros",
  body_fidgeting:            "Inquietud corporal (fidgeting)",
};
