import { createClient } from "@/lib/supabase";

/**
 * Cliente HTTP hacia `api-service` (FastAPI).
 *
 * Mantén toda la lógica de red aquí: los componentes NUNCA deben llamar a
 * `fetch` directamente. Cada función tiene rama de mock para poder trabajar
 * sin backend con `NEXT_PUBLIC_USE_MOCK=true`.
 *
 * Contratos: `docs/superpowers/plans/2026-05-23-mvp-24h-master.md`.
 */

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getAuthHeader(): Promise<Record<string, string>> {
  if (USE_MOCK) return {};
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("No autenticado");
  }
  return { Authorization: `Bearer ${session.access_token}` };
}

export type SurveyType = "phq9" | "gad7" | "habits" | "screen";

export interface SurveySubmissionResponse {
  id: string;
  created_at: string;
}

/**
 * Envía las respuestas de un bloque del onboarding al endpoint
 * `POST /api/v1/surveys/{type}`. El payload sigue el contrato fijado por
 * API & Connections: `{ responses: Record<string, unknown>, total_score?: number }`.
 *
 * Para los bloques clínicos (`phq9`, `gad7`) se incluye `total_score`. Para
 * bloques no clínicos (`habits`, `screen`) `total_score` queda `null`.
 */
export async function submitSurvey(
  type: SurveyType,
  responses: Record<string, string | number | string[]>,
  totalScore: number | null = null
): Promise<SurveySubmissionResponse> {
  if (USE_MOCK) {
    return {
      id: `mock-${type}-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
  }

  const headers = {
    ...(await getAuthHeader()),
    "Content-Type": "application/json",
  };

  const res = await fetch(`${API_URL}/api/v1/surveys/${type}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ responses, total_score: totalScore }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Error ${res.status} al guardar la encuesta ${type}: ${text}`
    );
  }

  return res.json();
}

/**
 * Sube una captura de pantalla de "tiempo en pantalla" como
 * multipart/form-data al endpoint `POST /api/v1/surveys/screen` con
 * `type=screen_capture` para que el backend lo procese aparte de las
 * respuestas estructuradas.
 *
 * Máximo 10 MB. Acepta PNG/JPG (validado en el componente que llama).
 */
export async function submitScreenCapture(
  file: File
): Promise<SurveySubmissionResponse> {
  if (USE_MOCK) {
    return {
      id: `mock-screen-capture-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
  }

  const authHeader = await getAuthHeader();
  const form = new FormData();
  form.append("file", file);
  form.append("type", "screen_capture");

  const res = await fetch(`${API_URL}/api/v1/surveys/screen`, {
    method: "POST",
    headers: authHeader,
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Error ${res.status} al subir la captura de pantalla: ${text}`
    );
  }

  return res.json();
}
