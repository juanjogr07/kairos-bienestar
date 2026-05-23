import React, { useCallback, useEffect, useState } from "react"
import type { SyncResult, SyncStatus } from "../shared/types"

type Stats = Record<string, number>

const WEB_URL = "http://localhost:3000"

function formatTime(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })
}

function formatRelative(iso: string | null): string {
  if (!iso) return "Sin sync aún"
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return "hace unos segundos"
  if (diff < 3_600_000) return `hace ${Math.round(diff / 60_000)} min`
  const hours = Math.round(diff / 3_600_000)
  if (hours < 24) return `hace ${hours} h`
  return formatTime(iso)
}

export function Popup() {
  const [stats, setStats] = useState<Stats>({})
  const [status, setStatus] = useState<SyncStatus>({
    last_sync_at: null,
    last_sync_count: 0,
    last_error: null,
    pending: 0,
  })
  const [hasToken, setHasToken] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const refresh = useCallback(() => {
    chrome.runtime.sendMessage({ type: "GET_STATS" }, (response: Stats) => {
      if (response && typeof response === "object") setStats(response)
    })
    chrome.runtime.sendMessage(
      { type: "GET_STATUS" },
      (response: SyncStatus) => {
        if (response && typeof response === "object") setStatus(response)
      }
    )
    chrome.storage.local.get("kairos_auth_token", (result) => {
      setHasToken(typeof result["kairos_auth_token"] === "string")
    })
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 10_000)
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (
        "kairos_event_buffer" in changes ||
        "kairos_last_sync_at" in changes ||
        "kairos_auth_token" in changes
      ) {
        refresh()
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => {
      clearInterval(interval)
      chrome.storage.onChanged.removeListener(listener)
    }
  }, [refresh])

  function handleSyncNow() {
    setSyncing(true)
    setSyncMsg(null)
    chrome.runtime.sendMessage(
      { type: "SYNC_NOW" },
      (result: SyncResult | undefined) => {
        setSyncing(false)
        if (!result) {
          setSyncMsg("Sin respuesta del background")
        } else if (result.success) {
          setSyncMsg(`✓ ${result.sent} eventos enviados`)
        } else {
          setSyncMsg(`✕ ${result.error ?? "Error de sincronización"}`)
        }
        refresh()
      }
    )
  }

  function handleClearToken() {
    chrome.runtime.sendMessage({ type: "CLEAR_AUTH_TOKEN" }, () => refresh())
  }

  const totalSeconds = Object.values(stats).reduce((a, b) => a + b, 0)
  const totalMinutes = Math.round(totalSeconds / 60)
  const topDomains = Object.entries(stats)
    .map(([domain, seconds]) => ({ domain, minutes: Math.round(seconds / 60) }))
    .filter((d) => d.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 5)
  const maxMinutes = topDomains[0]?.minutes ?? 0

  return (
    <div style={S.wrap}>
      <header style={S.header}>
        <div style={S.brand}>
          <span style={S.logo}>K</span>
          <span style={S.brandText}>Kairós</span>
        </div>
        <span
          style={{
            ...S.statusDot,
            background: hasToken ? "#16a34a" : "#f59e0b",
          }}
          title={hasToken ? "Conectado" : "Sin sesión"}
        />
      </header>

      {!hasToken && (
        <a href={WEB_URL} target="_blank" rel="noreferrer" style={S.warnLink}>
          ⚠ Inicia sesión en kairos para sincronizar
        </a>
      )}

      <section style={S.hero}>
        <div style={S.heroNumber}>{totalMinutes}</div>
        <div style={S.heroLabel}>minutos en pantalla hoy</div>
        <div style={S.pendingPill}>
          {status.pending} eventos en buffer
        </div>
      </section>

      {topDomains.length > 0 ? (
        <section style={S.section}>
          <div style={S.sectionTitle}>Top sitios</div>
          {topDomains.map(({ domain, minutes }) => (
            <div key={domain} style={S.row}>
              <div style={S.rowText}>
                <span style={S.domain}>{domain}</span>
                <span style={S.minutes}>{minutes} min</span>
              </div>
              <div style={S.barTrack}>
                <div
                  style={{
                    ...S.barFill,
                    width: `${maxMinutes > 0 ? (minutes / maxMinutes) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </section>
      ) : (
        <p style={S.empty}>Navega un poco para ver tus estadísticas.</p>
      )}

      {status.last_error && (
        <div style={S.errorBox} role="alert">
          Último error: {status.last_error}
        </div>
      )}

      <footer style={S.footer}>
        <span style={S.footerMeta}>
          Sync: {formatRelative(status.last_sync_at)}
          {status.last_sync_count > 0 && ` · ${status.last_sync_count} envíos`}
        </span>
        <button
          onClick={handleSyncNow}
          disabled={syncing || !hasToken}
          style={{
            ...S.button,
            background: syncing || !hasToken ? "#e2e8f0" : "#2563eb",
            color: syncing || !hasToken ? "#94a3b8" : "white",
            cursor: syncing || !hasToken ? "not-allowed" : "pointer",
          }}
        >
          {syncing ? "Sincronizando…" : "Sync ahora"}
        </button>
      </footer>

      {syncMsg && <div style={S.syncMsg}>{syncMsg}</div>}

      <div style={S.links}>
        <a
          href={`${WEB_URL}/dashboard`}
          target="_blank"
          rel="noreferrer"
          style={S.link}
        >
          Dashboard →
        </a>
        {hasToken && (
          <button onClick={handleClearToken} style={S.linkButton}>
            Cerrar sesión
          </button>
        )}
      </div>
    </div>
  )
}

const S = {
  wrap: {
    padding: "14px 16px 12px",
    fontSize: "13px",
    color: "#0f172a",
  } as React.CSSProperties,
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  } as React.CSSProperties,
  brand: { display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties,
  logo: {
    display: "inline-flex",
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
    color: "white",
    borderRadius: 6,
    fontSize: 12,
  } as React.CSSProperties,
  brandText: {
    fontWeight: 700,
    fontSize: 14,
    color: "#1e293b",
  } as React.CSSProperties,
  statusDot: {
    display: "inline-block",
    width: 8,
    height: 8,
    borderRadius: 4,
  } as React.CSSProperties,
  warnLink: {
    display: "block",
    background: "#fffbeb",
    border: "1px solid #fde68a",
    color: "#92400e",
    fontSize: 12,
    padding: "6px 10px",
    borderRadius: 6,
    textDecoration: "none",
    marginBottom: 10,
  } as React.CSSProperties,
  hero: {
    background: "linear-gradient(135deg, #eff6ff, #ede9fe)",
    borderRadius: 10,
    padding: "14px 12px",
    marginBottom: 12,
    textAlign: "center",
  } as React.CSSProperties,
  heroNumber: {
    fontSize: 30,
    fontWeight: 800,
    color: "#1d4ed8",
    lineHeight: 1,
  } as React.CSSProperties,
  heroLabel: {
    marginTop: 2,
    fontSize: 11,
    color: "#475569",
  } as React.CSSProperties,
  pendingPill: {
    marginTop: 6,
    display: "inline-block",
    fontSize: 10,
    background: "rgba(37, 99, 235, 0.12)",
    color: "#1d4ed8",
    padding: "2px 8px",
    borderRadius: 999,
  } as React.CSSProperties,
  section: { marginBottom: 12 } as React.CSSProperties,
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 6,
  } as React.CSSProperties,
  row: { marginBottom: 6 } as React.CSSProperties,
  rowText: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    marginBottom: 2,
  } as React.CSSProperties,
  domain: {
    color: "#1e293b",
    fontWeight: 500,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: 200,
  } as React.CSSProperties,
  minutes: { color: "#64748b" } as React.CSSProperties,
  barTrack: {
    height: 4,
    background: "#e2e8f0",
    borderRadius: 2,
    overflow: "hidden",
  } as React.CSSProperties,
  barFill: {
    height: "100%",
    background: "linear-gradient(90deg, #2563eb, #7c3aed)",
    borderRadius: 2,
    transition: "width 0.3s ease",
  } as React.CSSProperties,
  empty: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    margin: "12px 0",
  } as React.CSSProperties,
  errorBox: {
    background: "#fee2e2",
    border: "1px solid #fecaca",
    color: "#991b1b",
    fontSize: 11,
    padding: "6px 8px",
    borderRadius: 6,
    marginBottom: 10,
  } as React.CSSProperties,
  footer: {
    borderTop: "1px solid #e2e8f0",
    paddingTop: 10,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  } as React.CSSProperties,
  footerMeta: { fontSize: 10, color: "#64748b" } as React.CSSProperties,
  button: {
    fontSize: 12,
    fontWeight: 600,
    border: "none",
    borderRadius: 6,
    padding: "5px 12px",
  } as React.CSSProperties,
  syncMsg: {
    marginTop: 8,
    fontSize: 11,
    color: "#475569",
    textAlign: "center",
  } as React.CSSProperties,
  links: {
    marginTop: 8,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  } as React.CSSProperties,
  link: {
    fontSize: 11,
    color: "#2563eb",
    textDecoration: "none",
  } as React.CSSProperties,
  linkButton: {
    fontSize: 11,
    color: "#dc2626",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
  } as React.CSSProperties,
}
