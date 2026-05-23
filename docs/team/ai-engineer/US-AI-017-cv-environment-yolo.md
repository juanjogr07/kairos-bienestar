# US-AI-017 — YOLOv8n Environment Context Detector (Fase 3)

**Owner:** Juan Gomez  
**Rama:** `feat/ml/core/US-ML-003-full-ml-cv-stack`  
**Prioridad:** Baja (Fase 3)  
**Estimado:** 3h

---

## Historia

Como agente, quiero saber en qué contexto físico está el usuario (workspace, bedroom, couch) para correlacionar entorno con hábitos y enviar intervenciones más contextualizadas.

---

## Criterios de Aceptación

- [ ] `EnvironmentDetector.detect(frame_rgb)` devuelve `{context, confidence, detected_objects}`
- [ ] Modelo YOLOv8n se descarga automáticamente si no está en caché (~6MB)
- [ ] Sin ultralytics: devuelve `EnvironmentResult(context="unknown")`
- [ ] Contextos detectados: `workspace`, `bedroom`, `couch`, `outdoor`, `transport`, `kitchen`
- [ ] `confidence` = proporción de objetos del contexto detectados (no confidence del detector)
- [ ] `download_weights()` guarda `yolov8n.pt` en `ml-cv/models/`

## Activación

Foto opcional del escritorio/entorno tomada con permiso explícito del usuario.
Procesada localmente (TFLite en extension) o en backend. Nunca almacenada.

## Archivos

- `ml-cv/yolo/environment_detector.py` — implementado

## Descarga de pesos

```bash
# Automático en primer uso:
from ml_cv.yolo.environment_detector import EnvironmentDetector
det = EnvironmentDetector()
det.download_weights()  # → ml-cv/models/yolov8n.pt (~6MB)
```
