# US-AI-012 — K-Means Usage Profiler

**Owner:** Juan Gomez  
**Rama:** `feat/ml/core/US-ML-003-full-ml-cv-stack`  
**Prioridad:** Media  
**Estimado:** 2h

---

## Historia

Como sistema, quiero clasificar cada día de uso en un perfil (`minimal`, `moderate`, `intensive`, `nocturnal`) para que el agente pueda adaptar el tono de sus mensajes al patrón del usuario.

---

## Criterios de Aceptación

- [ ] `predict_cluster(row)` devuelve `{cluster_label, cluster_name, profile_features}`
- [ ] Los 4 perfiles se asignan semánticamente basados en los centroides (no hardcoded)
- [ ] Sin modelo global: fallback a `_rule_based_cluster`
- [ ] El cluster se incluye en `ml_results.result.cluster`

## Definition of Done

- `predict_cluster({"total_usage_min": 50, "nocturnal_ratio": 0.1})` → `"minimal"`
- `predict_cluster({"total_usage_min": 400, "nocturnal_ratio": 0.5})` → `"nocturnal"`
- `python -m ml_worker.utils.train_all` entrena KMeans sin errores

## Archivos

- `ml-worker/models/clustering.py` — implementado
