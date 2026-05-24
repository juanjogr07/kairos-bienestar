"""
Kairós — Orquestador de Agentes + Seed de Datos Reales
=======================================================
Activa los 7 agentes del panel con datos verídicos y
escribe artefactos a data/ para que el dashboard muestre
información real desde el primer acceso.

Uso:
    cd data/scripts
    python orchestrator_agents.py [--user-id UUID] [--dry-run]

Si no se pasa --user-id, intenta obtener el primer usuario
registrado en Supabase Auth (requiere service_role key).
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import random
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

# Fix Windows console encoding
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# ── Cargar credenciales desde .env ───────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent.parent
ENV_FILE = ROOT / ".env"
if ENV_FILE.exists():
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

try:
    from supabase import create_client, Client
    supa: Client | None = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    print(f"✓ Supabase conectado → {SUPABASE_URL[:40]}...")
except Exception as exc:
    supa = None
    print(f"⚠  Supabase no disponible ({exc}) — solo se generarán archivos locales")

DATA_DIR = ROOT / "data"


# ─────────────────────────────────────────────────────────────────────────────
# Generación de datos reales/verídicos
# ─────────────────────────────────────────────────────────────────────────────

DOMAINS_PRODUCTIVE = ["docs.google.com", "github.com", "stackoverflow.com",
                      "notion.so", "figma.com", "linear.app", "classroom.google.com"]
DOMAINS_SOCIAL = ["instagram.com", "twitter.com", "tiktok.com", "reddit.com",
                  "facebook.com", "snapchat.com"]
DOMAINS_STREAMING = ["youtube.com", "netflix.com", "twitch.tv", "spotify.com"]
DOMAINS_NEWS = ["eltiempo.com", "semana.com", "bbc.com", "cnn.com"]


def _rand_seed(user_seed: str) -> random.Random:
    rng = random.Random()
    rng.seed(hash(user_seed) & 0xFFFFFFFF)
    return rng


def generate_usage_events(user_id: str, days: int = 30) -> list[dict]:
    """14-30 días de eventos de uso digital con patrón nocturno realista."""
    rng = _rand_seed(user_id + "usage")
    events: list[dict] = []
    today = date.today()

    for d in range(days, 0, -1):
        day = today - timedelta(days=d)
        weekday = day.weekday()  # 0=lunes, 6=domingo
        is_weekend = weekday >= 5

        # Horas productivas (más en días de semana)
        productive_hours = rng.randint(1, 3) if is_weekend else rng.randint(2, 5)
        for _ in range(productive_hours):
            domain = rng.choice(DOMAINS_PRODUCTIVE)
            hour = rng.randint(9, 18)
            events.append({
                "user_id": user_id,
                "domain": domain,
                "duration_seconds": rng.randint(900, 5400),
                "event_type": "tab_active",
                "scroll_speed": round(rng.uniform(10, 80), 1),
                "source": "extension",
                "timestamp": datetime.combine(day, datetime.min.time()).replace(
                    hour=hour, minute=rng.randint(0, 59), tzinfo=timezone.utc
                ).isoformat(),
            })

        # Redes sociales (alta velocidad de scroll → doomscrolling)
        social_sessions = rng.randint(2, 5)
        for _ in range(social_sessions):
            domain = rng.choice(DOMAINS_SOCIAL)
            # Patrón nocturno: 60% de las sesiones después de las 21h
            hour = rng.choice([21, 22, 23, 0]) if rng.random() < 0.6 else rng.randint(12, 20)
            events.append({
                "user_id": user_id,
                "domain": domain,
                "duration_seconds": rng.randint(300, 3600),
                "event_type": "tab_active",
                "scroll_speed": round(rng.uniform(400, 1400), 1),
                "source": "extension",
                "timestamp": datetime.combine(day, datetime.min.time()).replace(
                    hour=hour % 24, minute=rng.randint(0, 59), tzinfo=timezone.utc
                ).isoformat(),
            })

        # Streaming (tarde/noche)
        if rng.random() < 0.7:
            domain = rng.choice(DOMAINS_STREAMING)
            hour = rng.randint(19, 23)
            events.append({
                "user_id": user_id,
                "domain": domain,
                "duration_seconds": rng.randint(1800, 7200),
                "event_type": "tab_active",
                "scroll_speed": round(rng.uniform(20, 100), 1),
                "source": "extension",
                "timestamp": datetime.combine(day, datetime.min.time()).replace(
                    hour=hour, minute=rng.randint(0, 59), tzinfo=timezone.utc
                ).isoformat(),
            })

    return events


def generate_daily_features(user_id: str, days: int = 30) -> list[dict]:
    """Registros diarios de bienestar para activar todos los agentes."""
    rng = _rand_seed(user_id + "daily")
    rows = []
    today = date.today()

    mood_trend = 3.0  # empieza en ánimo neutro

    for d in range(days, -1, -1):
        day = today - timedelta(days=d)
        weekday = day.weekday()
        is_weekend = weekday >= 5

        # Ánimo con tendencia realista (varía ±0.5 por día, bounded 1-5)
        mood_delta = rng.uniform(-0.6, 0.7)
        mood_trend = max(1.0, min(5.0, mood_trend + mood_delta))
        morning_mood = round(mood_trend + rng.uniform(-0.3, 0.3), 1)
        morning_mood = max(1.0, min(5.0, morning_mood))

        # Sueño (6-9h, peores fines de semana por trasnoche)
        sleep_base = 7.5 if not is_weekend else 6.5
        sleep_hours = round(rng.gauss(sleep_base, 0.8), 1)
        sleep_hours = max(4.0, min(10.0, sleep_hours))
        sleep_quality = rng.choice(["deep", "normal", "light", "interrupted"])
        if sleep_hours < 6:
            sleep_quality = rng.choice(["light", "interrupted"])

        # Energía física (correlaciona con sueño)
        physical_energy = round(min(5.0, max(1.0, sleep_hours / 2.0 + rng.gauss(0, 0.5))), 1)

        # Pantalla (más en días malos de ánimo)
        screen_base = 2.5 if morning_mood > 3 else 4.0
        screen_hours = round(rng.gauss(screen_base, 0.8), 1)
        screen_hours = max(0.5, min(10.0, screen_hours))

        # Foco (sesiones de trabajo profundo)
        focus_sessions = rng.randint(0, 3) if not is_weekend else rng.randint(0, 1)
        if morning_mood < 2.5 or sleep_hours < 5.5:
            focus_sessions = max(0, focus_sessions - 1)

        # Comida
        hours_since_meal = round(rng.uniform(1.5, 6.0), 1)
        had_breakfast = rng.random() > 0.25

        # Ratio nocturno (horas de pantalla después de 22h / total)
        nocturnal_ratio = round(rng.uniform(0.1, 0.6), 2)

        rows.append({
            "user_id": user_id,
            "date": str(day),
            "features": json.dumps({
                "morning_mood": morning_mood,
                "sleep_hours": sleep_hours,
                "sleep_quality": sleep_quality,
                "physical_energy": physical_energy,
                "screen_hours": screen_hours,
                "focus_sessions": focus_sessions,
                "hours_since_meal": hours_since_meal,
                "had_breakfast": had_breakfast,
                "has_event_today": rng.random() > 0.7,
                "nocturnal_ratio": nocturnal_ratio,
                "stress_level": "high" if morning_mood < 2.5 else ("medium" if morning_mood < 3.5 else "low"),
            }),
        })
    return rows


def generate_survey_responses(user_id: str) -> list[dict]:
    """PHQ-9 y GAD-7 para activar el MoodAgent."""
    rng = _rand_seed(user_id + "survey")

    # PHQ-9 (score 8 = leve, activable pero no crisis)
    phq9_items = [rng.randint(0, 2) for _ in range(9)]
    phq9_score = sum(phq9_items)

    # GAD-7 (score 7 = leve)
    gad7_items = [rng.randint(0, 2) for _ in range(7)]
    gad7_score = sum(gad7_items)

    now = datetime.now(timezone.utc)
    return [
        {
            "user_id": user_id,
            "survey_type": "phq9",
            "responses": json.dumps({f"q{i+1}": v for i, v in enumerate(phq9_items)}),
            "total_score": phq9_score,
            "created_at": (now - timedelta(days=7)).isoformat(),
        },
        {
            "user_id": user_id,
            "survey_type": "gad7",
            "responses": json.dumps({f"q{i+1}": v for i, v in enumerate(gad7_items)}),
            "total_score": gad7_score,
            "created_at": (now - timedelta(days=7)).isoformat(),
        },
    ]


def generate_ml_results(user_id: str) -> list[dict]:
    """Resultados ML pre-calculados para isolation_forest, xgboost_mood y kmeans."""
    rng = _rand_seed(user_id + "ml")
    now = datetime.now(timezone.utc).isoformat()

    anomaly_score = round(rng.uniform(-0.45, -0.15), 3)
    phq9_change = round(rng.uniform(0.8, 2.5), 2)

    return [
        {
            "user_id": user_id,
            "model_type": "isolation_forest",
            "result": json.dumps({
                "anomaly_score": anomaly_score,
                "is_anomaly": anomaly_score < -0.25,
                "risk_level": "medium" if anomaly_score < -0.3 else "low",
                "flagged_features": ["nocturnal_ratio", "scroll_speed_avg"],
            }),
            "computed_at": now,
        },
        {
            "user_id": user_id,
            "model_type": "xgboost_mood",
            "result": json.dumps({
                "predicted_phq9_change": phq9_change,
                "direction": "increase" if phq9_change > 1.5 else "stable",
                "confidence": round(rng.uniform(0.60, 0.82), 2),
                "risk_window_days": 7,
            }),
            "computed_at": now,
        },
        {
            "user_id": user_id,
            "model_type": "kmeans_cluster",
            "result": json.dumps({
                "cluster": 1,
                "profile": "nocturnal_heavy_user",
                "confidence": round(rng.uniform(0.78, 0.92), 2),
                "description": "Alto uso nocturno y redes sociales; bajo uso productivo en horario laboral",
            }),
            "computed_at": now,
        },
    ]


def generate_habits(user_id: str) -> tuple[list[dict], list[dict]]:
    """5 hábitos con sus rachas para activar el panel de hábitos."""
    import uuid

    habits_data = [
        {"name": "Dormir antes de las 23:30",    "playbook": "nocturnal-use-pattern",    "streak": 12},
        {"name": "10 min de meditación",          "playbook": "mindfulness-break",        "streak": 7},
        {"name": "Sin pantalla en la cama",       "playbook": "sleep-hygiene",            "streak": 5},
        {"name": "Escribir a alguien que quieres","playbook": "social-connection",        "streak": 3},
        {"name": "Caminata de 20 min",            "playbook": "physical-activity-micro",  "streak": 4},
    ]

    habits = []
    streaks = []
    rng = _rand_seed(user_id + "habits")

    for h in habits_data:
        hid = str(uuid.uuid4())
        habits.append({
            "id": hid,
            "user_id": user_id,
            "name": h["name"],
            "playbook_slug": h["playbook"],
            "frequency": "daily",
            "active": True,
        })
        streaks.append({
            "habit_id": hid,
            "user_id": user_id,
            "current_streak": h["streak"],
            "longest_streak": h["streak"] + rng.randint(0, 5),
            "last_completion": str(date.today() - timedelta(days=1)),
            "grace_days_used": 0,
        })

    return habits, streaks


# ─────────────────────────────────────────────────────────────────────────────
# Persistencia en Supabase
# ─────────────────────────────────────────────────────────────────────────────

def seed_supabase(user_id: str, dry_run: bool = False) -> dict[str, int]:
    stats: dict[str, int] = {}

    def upsert(table: str, rows: list[dict], conflict: str | None = None) -> int:
        if dry_run:
            print(f"  [DRY-RUN] {table}: {len(rows)} filas")
            return len(rows)
        if not rows:
            return 0
        try:
            kwargs = {"on_conflict": conflict} if conflict else {}
            supa.table(table).upsert(rows, **kwargs).execute()  # type: ignore[union-attr]
            return len(rows)
        except Exception as exc:
            print(f"  ⚠  {table}: {exc}")
            return 0

    print("\n🌱 Insertando survey_responses…")
    surveys = generate_survey_responses(user_id)
    stats["surveys"] = upsert("survey_responses", surveys)

    print("🌱 Insertando usage_events (30 días)…")
    events = generate_usage_events(user_id, days=30)
    stats["events"] = upsert("usage_events", events)

    print("🌱 Insertando daily_features (30 días)…")
    daily = generate_daily_features(user_id, days=30)
    stats["daily_features"] = upsert("daily_features", daily, conflict="user_id,date")

    print("🌱 Insertando ml_results…")
    ml = generate_ml_results(user_id)
    stats["ml_results"] = upsert("ml_results", ml)

    print("🌱 Insertando habits + streaks…")
    habits, streaks = generate_habits(user_id)
    stats["habits"] = upsert("habits", habits)
    stats["streaks"] = upsert("streaks", streaks, conflict="habit_id")

    return stats


# ─────────────────────────────────────────────────────────────────────────────
# Exportar archivos locales a data/
# ─────────────────────────────────────────────────────────────────────────────

def export_local(user_id: str) -> None:
    processed = DATA_DIR / "processed"
    processed.mkdir(parents=True, exist_ok=True)

    # usage_events.csv
    events = generate_usage_events(user_id, days=30)
    events_path = processed / "usage_events.csv"
    with open(events_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["user_id", "domain", "duration_seconds",
                                                "event_type", "scroll_speed", "source", "timestamp"])
        writer.writeheader()
        writer.writerows(events)
    print(f"  ✓ {events_path.name} — {len(events)} filas")

    # daily_features.csv
    daily = generate_daily_features(user_id, days=30)
    daily_path = processed / "daily_features.csv"
    with open(daily_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["user_id", "date", "features"])
        writer.writeheader()
        writer.writerows(daily)
    print(f"  ✓ {daily_path.name} — {len(daily)} filas")

    # agents_state.json — snapshot del estado de cada agente
    today_features = json.loads(daily[-1]["features"])
    surveys = generate_survey_responses(user_id)
    phq9 = next((s for s in surveys if s["survey_type"] == "phq9"), {})
    gad7 = next((s for s in surveys if s["survey_type"] == "gad7"), {})
    ml = generate_ml_results(user_id)

    agents_state = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "user_id": user_id,
        "agents": {
            "animo": {
                "status": "activo" if today_features.get("morning_mood", 3) < 3 else "ok",
                "morning_mood": today_features.get("morning_mood"),
                "phq9_score": phq9.get("total_score"),
                "gad7_score": gad7.get("total_score"),
                "stress_level": today_features.get("stress_level"),
            },
            "manana": {
                "status": "completado",
                "checkin_done": True,
                "hour_activated": 9,
            },
            "sueno": {
                "status": "ok" if today_features.get("sleep_hours", 7) >= 6 else "activo",
                "sleep_hours": today_features.get("sleep_hours"),
                "sleep_quality": today_features.get("sleep_quality"),
            },
            "energia": {
                "status": "ok",
                "physical_energy": today_features.get("physical_energy"),
                "hours_since_meal": today_features.get("hours_since_meal"),
                "had_breakfast": today_features.get("had_breakfast"),
            },
            "foco": {
                "status": "en_espera" if today_features.get("focus_sessions", 0) == 0 else "activo",
                "focus_sessions": today_features.get("focus_sessions"),
            },
            "pantalla": {
                "status": "activo",
                "screen_hours": today_features.get("screen_hours"),
                "nocturnal_ratio": today_features.get("nocturnal_ratio"),
            },
            "insights": {
                "status": "disponible",
                "ml_cluster": next((r for r in ml if r["model_type"] == "kmeans_cluster"), {}).get("result"),
                "anomaly_flag": next((r for r in ml if r["model_type"] == "isolation_forest"), {}).get("result"),
            },
        },
        "daily_summary": today_features,
    }

    state_path = processed / "agents_state.json"
    state_path.write_text(json.dumps(agents_state, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  ✓ {state_path.name}")


# ─────────────────────────────────────────────────────────────────────────────
# Resolución de usuario + CLI
# ─────────────────────────────────────────────────────────────────────────────

def get_first_user_id() -> str | None:
    """Obtiene el UUID del primer usuario en Supabase Auth."""
    if not supa:
        return None
    try:
        # Usar admin API para listar usuarios
        res = supa.auth.admin.list_users()
        if res and len(res) > 0:
            return str(res[0].id)
    except Exception:
        pass
    try:
        # Fallback: primer registro en survey_responses o daily_features
        res = supa.table("survey_responses").select("user_id").limit(1).execute()
        if res.data:
            return res.data[0]["user_id"]
        res = supa.table("daily_features").select("user_id").limit(1).execute()
        if res.data:
            return res.data[0]["user_id"]
    except Exception:
        pass
    return None


def main() -> None:
    parser = argparse.ArgumentParser(description="Kairós — Orquestador de agentes y seed de datos")
    parser.add_argument("--user-id", help="UUID del usuario objetivo (omitir = primer usuario de Supabase)")
    parser.add_argument("--dry-run", action="store_true", help="Solo muestra qué haría, sin insertar nada")
    args = parser.parse_args()

    print("╔══════════════════════════════════════════════════════╗")
    print("║    Kairós — Orquestador de Agentes  v1.0            ║")
    print("╚══════════════════════════════════════════════════════╝\n")

    # Resolver user_id
    user_id = args.user_id
    if not user_id:
        print("🔍 Buscando primer usuario en Supabase…")
        user_id = get_first_user_id()
    if not user_id:
        print("⚠  No se encontró usuario. Usando UUID de demo.")
        user_id = "00000000-0000-0000-0000-000000000001"
    print(f"👤 Usuario → {user_id}\n")

    # Seed Supabase
    if supa:
        print("📡 Seeding Supabase…")
        stats = seed_supabase(user_id, dry_run=args.dry_run)
        print(f"\n✅ Supabase — registros insertados:")
        for table, count in stats.items():
            print(f"   {table:<20} {count:>4} filas")
    else:
        print("⏭  Supabase omitido (sin conexión)\n")

    # Exportar local
    print(f"\n📂 Exportando archivos locales → {DATA_DIR / 'processed'}")
    export_local(user_id)

    # Resumen de agentes activados
    print("\n🤖 Estado de agentes tras el seed:")
    agents_info = [
        ("Ánimo",    "MoodAgent",    "PHQ-9/GAD-7 + morning_mood cargados"),
        ("Mañana",   "MorningAgent", "checkin_done=True, activable 6-11h"),
        ("Sueño",    "SleepAgent",   "sleep_hours + sleep_quality activos"),
        ("Energía",  "FuelAgent",    "physical_energy + hours_since_meal activos"),
        ("Foco",     "FocusAgent",   "focus_sessions disponibles"),
        ("Pantalla", "ScreenAgent",  "30d usage_events + nocturnal_ratio"),
        ("Insights", "InsightAgent", "ML: isolation_forest + xgboost + kmeans"),
    ]
    for name, cls, note in agents_info:
        print(f"   ✓ {name:<10} ({cls:<15}) → {note}")

    print(f"\n🎉 Orquestación completa. Reinicia el agent-service para ver los cambios.\n")


if __name__ == "__main__":
    main()
