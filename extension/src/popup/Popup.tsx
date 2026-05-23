import React, { useEffect, useState } from "react"

interface Stats {
  [domain: string]: number
}

export function Popup() {
  const [stats, setStats] = useState<Stats>({})
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [hasToken, setHasToken] = useState(false)

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "GET_STATS" }, (response: Stats) => {
      if (response) setStats(response)
    })

    chrome.storage.local.get("kairos_auth_token", (result) => {
      setHasToken(!!result["kairos_auth_token"])
    })

    chrome.storage.local.get("kairos_last_sync", (result) => {
      const val = result["kairos_last_sync"] as string | undefined
      if (val) {
        const d = new Date(val)
        setLastSync(d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }))
      }
    })
  }, [])

  function handleSyncNow() {
    setSyncing(true)
    chrome.runtime.sendMessage({ type: "SYNC_NOW" }, () => {
      chrome.storage.local.set({ kairos_last_sync: new Date().toISOString() })
      setLastSync(new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }))
      setSyncing(false)
    })
  }

  const totalMinutes = Math.round(Object.values(stats).reduce((a, b) => a + b, 0) / 60)
  const topDomains = Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([domain, seconds]) => ({ domain, minutes: Math.round(seconds / 60) }))
    .filter((d) => d.minutes > 0)

  return (
    <div style={{ padding: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h2 style={{ margin: 0, fontSize: "16px", color: "#2563eb" }}>Kairós</h2>
        {!hasToken && (
          <a href="http://localhost:3001" target="_blank" style={{ fontSize: "11px", color: "#f59e0b" }}>
            ⚠ Inicia sesión
          </a>
        )}
      </div>

      <div style={{ background: "#eff6ff", borderRadius: "8px", padding: "12px", marginBottom: "12px", textAlign: "center" }}>
        <div style={{ fontSize: "28px", fontWeight: "bold", color: "#1d4ed8" }}>{totalMinutes}</div>
        <div style={{ fontSize: "12px", color: "#6b7280" }}>minutos en pantalla hoy</div>
      </div>

      {topDomains.length > 0 ? (
        <div>
          <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Top sitios
          </div>
          {topDomains.map(({ domain, minutes }) => (
            <div key={domain} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "3px 0" }}>
              <span style={{ color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }}>
                {domain}
              </span>
              <span style={{ color: "#6b7280", flexShrink: 0 }}>{minutes} min</span>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: "13px", color: "#9ca3af", textAlign: "center" }}>
          Navega un poco para ver tus estadísticas.
        </p>
      )}

      <div style={{ marginTop: "12px", borderTop: "1px solid #e5e7eb", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "11px", color: "#9ca3af" }}>
          {lastSync ? `Sync: ${lastSync}` : "Sin sync aún"}
        </span>
        <button
          onClick={handleSyncNow}
          disabled={syncing || !hasToken}
          style={{
            fontSize: "12px",
            background: syncing || !hasToken ? "#e5e7eb" : "#2563eb",
            color: syncing || !hasToken ? "#9ca3af" : "white",
            border: "none",
            borderRadius: "4px",
            padding: "4px 10px",
            cursor: syncing || !hasToken ? "not-allowed" : "pointer",
          }}
        >
          {syncing ? "Sincronizando..." : "Sync ahora"}
        </button>
      </div>

      <div style={{ marginTop: "8px", textAlign: "center" }}>
        <a href="http://localhost:3001/dashboard" target="_blank" style={{ fontSize: "12px", color: "#2563eb" }}>
          Ver dashboard completo →
        </a>
      </div>
    </div>
  )
}
