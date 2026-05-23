"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Nav } from "@/components/nav"
import { getDashboard } from "@/lib/api"
import { createClient } from "@/lib/supabase"

interface DashboardData {
  last_phq9_score: number | null
  last_phq9_date: string | null
  last_gad7_score: number | null
  last_gad7_date: string | null
}

function phq9Category(score: number): string {
  if (score <= 4) return "Mínimo"
  if (score <= 9) return "Leve"
  if (score <= 14) return "Moderado"
  if (score <= 19) return "Moderadamente severo"
  return "Severo"
}

function gad7Category(score: number): string {
  if (score <= 4) return "Mínimo"
  if (score <= 9) return "Leve"
  if (score <= 14) return "Moderado"
  return "Severo"
}

function formatDate(iso: string | null): string {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })
}

export default function ProfilePage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [name, setName] = useState<string | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return }
      setEmail(user.email ?? null)
      setName(user.user_metadata?.full_name ?? null)
    })
    getDashboard()
      .then((d) => setDashboard(d))
      .catch(() => setDashboard(null))
      .finally(() => setLoading(false))
  }, [router])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  const initials = name
    ? name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : (email?.[0] ?? "?").toUpperCase()

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="max-w-md mx-auto p-4 space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4 bg-white rounded-xl p-5 shadow-sm">
          <div className="h-14 w-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold">
            {initials}
          </div>
          <div>
            {name && <p className="font-semibold text-gray-900">{name}</p>}
            <p className="text-sm text-gray-500">{email ?? "—"}</p>
          </div>
        </div>

        {/* Screening scores */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Último screening</h2>
          </div>

          {loading ? (
            <div className="px-5 py-6 text-sm text-gray-400">Cargando…</div>
          ) : !dashboard?.last_phq9_score && !dashboard?.last_gad7_score ? (
            <div className="px-5 py-6 text-sm text-gray-500">
              Completa tu primer screening en{" "}
              <a href="/onboarding" className="text-blue-600 underline">Onboarding</a>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {dashboard?.last_phq9_score != null && (
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">PHQ-9</p>
                    <p className="text-xs text-gray-400">{formatDate(dashboard.last_phq9_date)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-blue-600">{dashboard.last_phq9_score}</span>
                    <p className="text-xs text-gray-500">{phq9Category(dashboard.last_phq9_score)}</p>
                  </div>
                </div>
              )}
              {dashboard?.last_gad7_score != null && (
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">GAD-7</p>
                    <p className="text-xs text-gray-400">{formatDate(dashboard.last_gad7_date)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-purple-600">{dashboard.last_gad7_score}</span>
                    <p className="text-xs text-gray-500">{gad7Category(dashboard.last_gad7_score)}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* New evaluation link */}
        <a
          href="/onboarding"
          className="block w-full text-center bg-white border border-blue-200 rounded-xl px-5 py-4 text-sm font-medium text-blue-600 shadow-sm hover:bg-blue-50 transition-colors"
        >
          Hacer nueva evaluación
        </a>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full rounded-xl bg-white border border-red-200 px-5 py-4 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50 transition-colors"
        >
          Cerrar sesión
        </button>
      </main>
    </div>
  )
}
