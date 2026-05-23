import { getDashboard } from "@/lib/api"
import { Nav } from "@/components/nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function DashboardPage() {
  let data
  try {
    data = await getDashboard()
  } catch {
    data = null
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Nav />
        <div className="p-8 text-center text-gray-500">
          No se pudo cargar el dashboard. Verifica tu conexión.
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">Tu dashboard</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-blue-700">{data.today_usage_min}</div>
              <div className="text-sm text-gray-500">minutos en pantalla hoy</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-green-600">{data.active_habits}</div>
              <div className="text-sm text-gray-500">hábitos activos</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-purple-600">
                {data.last_phq9_score ?? "—"}
              </div>
              <div className="text-sm text-gray-500">score PHQ-9</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-orange-500">
                {data.last_gad7_score ?? "—"}
              </div>
              <div className="text-sm text-gray-500">score GAD-7</div>
            </CardContent>
          </Card>
        </div>

        {data.top_domains.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sitios más visitados hoy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.top_domains.map((d: { domain: string; minutes: number }) => (
                  <div key={d.domain} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{d.domain}</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 bg-blue-200 rounded"
                        style={{ width: `${Math.min(d.minutes * 2, 120)}px` }}
                      />
                      <span className="text-xs text-gray-500 w-16 text-right">
                        {d.minutes} min
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {!data.onboarding_completed && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-4">
              <p className="text-amber-800">
                Completa el onboarding para activar los insights personalizados.{" "}
                <a href="/onboarding/phq9" className="font-medium underline">
                  Completar ahora →
                </a>
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
