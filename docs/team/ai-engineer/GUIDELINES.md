# Lineamientos — AI Engineer

## Tu dominio exclusivo

Solo tú modificas estos directorios:

```
agent-service/agent/          ← orquestador, memory, tools
agent-service/triage/         ← árbol de decisión
agent-service/rag/            ← embedder, retriever
playbooks/processed/          ← playbooks .md
playbooks/scripts/            ← embed_playbooks.py
```

**NUNCA toques sin coordinación previa:**
- `agent-service/routers/` → lo comparte con API-Connections
- `agent-service/config.py`, `database.py`, `auth.py` → infraestructura compartida
- `infra/supabase/` → solo Backend-2-Data

---

## Estrategia de ramas

```
main          ← producción, solo via PR aprobado
dev           ← integración, base de todas las ramas
feat/ai/<id>  ← tus features
fix/ai/<id>   ← tus bugfixes
```

**Ejemplo:**
```bash
git checkout dev
git pull origin dev
git checkout -b feat/ai/US-AI-001-mejora-triage
# ... trabajas ...
git push origin feat/ai/US-AI-001-mejora-triage
# PR → dev (no a main)
```

---

## Commits

Formato: `type(scope): descripción corta`

| type | cuándo |
|---|---|
| `feat` | nueva funcionalidad |
| `fix` | bugfix |
| `test` | tests |
| `refactor` | sin cambio de comportamiento |
| `docs` | solo documentación |

Ejemplos:
```
feat(triage): agregar nivel digital para nocturnal_pattern > 0.65
fix(rag): corregir threshold de similitud coseno en retriever
test(triage): cubrir edge case PHQ-9 = 15 (boundary crisis)
```

---

## Contratos de API que debes respetar

El `ChatResponse` que retorna `agent/orchestrator.py::chat()` **debe siempre** tener estas keys:

```python
{
    "reply": str,              # texto de respuesta del agente
    "playbook_activated": str | None,
    "suggested_habit": str | None,
}
```

El Frontend y API-Connections consumen este contrato. Si necesitas añadir campos, **añade, nunca elimines ni renombres**.

---

## Cómo evitar conflictos

1. **Antes de empezar**: `git pull origin dev` y verifica que no haya conflictos
2. **Un archivo a la vez**: no modifiques más de 3 archivos por commit
3. **Si necesitas cambiar `routers/chat.py`**: abre un issue en Linear y coordina con API-Connections
4. **Variables de entorno nuevas**: agrégalas al `.env.example` en el mismo PR, documenta en tu historia de usuario

---

## Tests obligatorios

Cada historia debe incluir al menos un test en `agent-service/tests/`:

```bash
# Ejecutar antes de cada PR
cd agent-service
pytest tests/ -v
# Todos deben pasar: no se mergea si hay rojos
```

El `conftest.py` ya stubbea supabase, openai y sentence_transformers — no necesitas credenciales reales.

---

## Dependencias con otros miembros

| Necesitas de... | Qué | Cuándo |
|---|---|---|
| Backend-2-Data | nuevas tablas en Supabase | antes de implementar herramientas que lean esas tablas |
| API-Connections | cambios en `routers/chat.py` | si el endpoint necesita nuevos parámetros |
| Frontend | nada directo | el Frontend consume tu API |
