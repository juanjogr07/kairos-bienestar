# US-AI-015 — Cold Start Bootstrap (Global Models)

**Owner:** Juan Gomez  
**Rama:** `feat/ml/core/US-ML-003-full-ml-cv-stack`  
**Prioridad:** Alta — necesario en primer deploy  
**Estimado:** 1h

---

## Historia

Como DevOps, quiero que en el primer deploy los modelos globales se entrenen automáticamente con datos sintéticos para que el sistema tenga un baseline funcional desde el minuto 0.

---

## Criterios de Aceptación

- [ ] `python -m ml_worker.pipelines.cold_start` corre en < 5 minutos
- [ ] Genera los 3 modelos globales: `if_global.joblib`, `xgb_global.joblib`, `kmeans_global.joblib`
- [ ] Si los modelos ya existen: no reentrenar (idempotente)
- [ ] `--force` flag fuerza reentrenamiento
- [ ] Datos sintéticos modelan 3 arquetipos: healthy (60%), at_risk (25%), high_risk (15%)

## Comando de ejecución

```bash
cd ml-worker
python -m ml_worker.pipelines.cold_start
# Esperado: "All global models trained and saved"
```

## Verificación post-deploy

```bash
python -m ml_worker.utils.train_all
# Debe mostrar ✓ para IF, XGBoost, KMeans
```

## Archivos

- `ml-worker/pipelines/cold_start.py` — implementado
- `ml-worker/utils/train_all.py` — implementado
