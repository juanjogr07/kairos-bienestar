"use client";

import { useState } from "react";
import { RefreshCw, Sparkles, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getWeeklyReport } from "@/lib/agent";
import { useRequireAuth } from "@/hooks/useRequireAuth";

function MarkdownRenderer({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={key++} className="mt-6 mb-2 text-base font-bold text-text-primary first:mt-0">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("- ")) {
      const content = line.slice(2).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      elements.push(
        <li
          key={key++}
          className="ml-4 text-sm leading-relaxed text-text-secondary"
          dangerouslySetInnerHTML={{ __html: "• " + content }}
        />
      );
    } else if (line.trim() === "") {
      elements.push(<div key={key++} className="h-1" />);
    } else {
      const content = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      elements.push(
        <p
          key={key++}
          className="text-sm leading-relaxed text-text-secondary"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    }
  }
  return <div>{elements}</div>;
}

export default function ReportPage() {
  const { checking } = useRequireAuth();
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      const res = await getWeeklyReport();
      setReport(res.reply);
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : "";
      setError(
        code === "SERVICE_UNAVAILABLE"
          ? "El agente está temporalmente fuera de servicio. Intenta más tarde."
          : "No se pudo generar el reporte. Verifica tu conexión."
      );
    } finally {
      setLoading(false);
    }
  }

  if (checking) return <div className="flex h-screen items-center justify-center"><span className="h-6 w-6 animate-spin rounded-full border-2 border-accent-secondary border-t-transparent" /></div>;

  return (
    <AppShell>
      <section className="animate-fade-up">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-accent-secondary" />
          <h1 className="text-xl font-bold text-text-primary md:text-2xl">
            Reporte semanal
          </h1>
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          Resumen de tus patrones digitales y bienestar de la semana.
        </p>
      </section>

      {!report && !loading && (
        <section className="mt-8 animate-fade-up" style={{ animationDelay: "100ms" }}>
          <button
            onClick={handleGenerate}
            className="group flex w-full items-center justify-between rounded-lg border border-border-active bg-bg-surface p-5 transition-all hover:border-accent-secondary hover:bg-[rgba(123,111,240,0.06)]"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(123,111,240,0.15)]">
                <RefreshCw size={20} className="text-accent-secondary" />
              </div>
              <div className="text-left">
                <p className="font-bold text-text-primary">Generar reporte</p>
                <p className="text-xs text-text-secondary">Repite PHQ-9 / GAD-7 cuando quieras</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-text-muted transition-transform group-hover:translate-x-1" />
          </button>

          {error && (
            <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}
        </section>
      )}

      {loading && (
        <section className="mt-8 space-y-4 animate-fade-up">
          <div className="flex items-center gap-3 text-sm text-text-secondary">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-secondary border-t-transparent" />
            Kairós está analizando tu semana…
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-4 animate-pulse rounded bg-bg-surface"
              style={{ width: `${60 + (i % 3) * 15}%`, animationDelay: `${i * 80}ms` }}
            />
          ))}
        </section>
      )}

      {report && (
        <section className="mt-6 animate-fade-up">
          <div className="rounded-lg border border-border-subtle bg-bg-surface p-5">
            <MarkdownRenderer text={report} />
          </div>

          <button
            onClick={() => { setReport(null); handleGenerate(); }}
            className="mt-4 flex items-center gap-2 text-xs font-medium text-text-secondary transition-colors hover:text-accent-primary"
          >
            <RefreshCw size={13} />
            Regenerar reporte
          </button>
        </section>
      )}
    </AppShell>
  );
}
