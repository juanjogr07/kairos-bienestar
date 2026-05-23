# api-service

REST API principal de Kairós. Gestiona eventos de uso digital, encuestas PHQ-9/GAD-7, dashboard y hábitos. Conecta directamente con Supabase.

## Stack

- **FastAPI** (Python 3.12)
- **Supabase** (PostgreSQL + Auth via JWT)
- **pydantic-settings** para configuración

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/api/v1/events/batch` | Ingestar eventos de uso (extension → backend) |
| `POST` | `/api/v1/surveys` | Guardar respuesta PHQ-9 o GAD-7 |
| `GET` | `/api/v1/dashboard` | Resumen del día: uso, hábitos, scores |
| `GET` | `/api/v1/habits` | Listar hábitos activos del usuario |
| `POST` | `/api/v1/habits` | Crear hábito |
| `POST` | `/api/v1/habits/{id}/complete` | Marcar hábito como completado hoy |

Todos los endpoints requieren `Authorization: Bearer <supabase_jwt>`.

## Estructura

```
api-service/
├── main.py           # FastAPI app + CORS
├── auth.py           # Dependencia get_current_user (verifica JWT Supabase)
├── config.py         # Settings con pydantic-settings (lee ../.env)
├── database.py       # LazySupabase proxy
├── models/           # Pydantic schemas
└── routers/
    ├── events.py     # POST /events/batch
    ├── surveys.py    # POST /surveys
    ├── dashboard.py  # GET /dashboard
    └── habits.py     # CRUD hábitos + completions
```

## Ejecutar

```bash
# Instalar dependencias
pip install -r requirements.txt

# Asegurarse de tener ../.env con las variables correctas
# (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY)

uvicorn main:app --port 8000 --reload
```

Docs interactivas: `http://localhost:8000/docs`

## Tests

```bash
pytest tests/ -v
```

## Variables de entorno requeridas

Lee `../.env` automáticamente:

```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY
```
