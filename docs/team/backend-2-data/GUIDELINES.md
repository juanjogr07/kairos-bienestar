# Lineamientos — Backend 2 (Data & Infrastructure)

## Tu dominio exclusivo

```
api-service/services/         ← lógica de negocio (habits, streaks, surveys)
api-service/models/           ← Pydantic schemas
infra/supabase/migrations/    ← todas las migraciones SQL
infra/supabase/seeds/         ← datos de prueba
```

**NUNCA toques sin coordinación:**
- `agent-service/` → AI-Engineer o API-Connections
- `web/` → Frontend
- `api-service/routers/` → API-Connections (pero sí colaboras en services/ que los routers llaman)

---

## Estrategia de ramas

```
main            ← producción
dev             ← integración
feat/data/<id>  ← features
fix/data/<id>   ← bugfixes
mig/<id>        ← migraciones SQL (rama dedicada por migración)
```

**Regla de migraciones:** Cada migración va en su propia rama `mig/<numero>-<descripcion>` y PR exclusivo. Nunca mezcles una migración con código de aplicación en el mismo PR.

```bash
# Ejemplo migración nueva
git checkout dev && git pull origin dev
git checkout -b mig/002-add-notifications-table
# Crear archivo: infra/supabase/migrations/002_notifications.sql
git add infra/supabase/migrations/002_notifications.sql
git commit -m "mig: agregar tabla notifications con RLS"
git push origin mig/002-add-notifications-table
# PR → dev, notificar al equipo en Linear ANTES de mergear
```

---

## Commits

```
mig: agregar tabla notifications con RLS policy
feat(services): calcular streak con grace_days correctamente
fix(models): corregir validación de survey_type enum
feat(seeds): agregar datos demo para usuario de presentación
```

---

## Reglas de migraciones SQL

1. **Nunca modificar migraciones ya aplicadas** — siempre crea una nueva
2. **Siempre incluir RLS** en tablas nuevas:
   ```sql
   ALTER TABLE nueva_tabla ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Users see own data" ON nueva_tabla
     FOR ALL USING (auth.uid() = user_id);
   ```
3. **Notifica al equipo** en el canal de Linear antes de aplicar una migración nueva — puede afectar a todos
4. **Rollback incluido**: si la migración puede romperse, incluye el SQL de rollback en comentarios al final del archivo

---

## Contrato de schemas

Cuando cambias un modelo Pydantic en `api-service/models/`, notifica a:
- API-Connections si afecta un router
- Frontend si afecta una respuesta de API

Regla: **campos opcionales con default**, nunca eliminar campos requeridos en un PR sin coordinar.

---

## Cómo evitar conflictos

1. **Índices nuevos**: siempre en migración separada, nunca inline con `CREATE TABLE`
2. **Seeds**: los archivos en `infra/supabase/seeds/` son acumulativos — no reescribas `001_seed_playbooks.sql`, crea `003_seed_nuevo.sql`
3. **Si Backend-1-ML necesita columnas nuevas**: recibe el issue, crea la migración y notifica cuando esté en `dev`

---

## Tests

```bash
cd api-service
pytest tests/ -v

# Verificar que la lógica de streaks es correcta
pytest tests/test_habits.py -v
```

Toda función en `services/` debe tener test unitario. Usa mocks de Supabase para no depender de la DB real en tests.
