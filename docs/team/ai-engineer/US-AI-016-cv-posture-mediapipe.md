# US-AI-016 — MediaPipe Posture & Eye Strain Analyzer (Fase 3)

**Owner:** Juan Gomez  
**Rama:** `feat/ml/core/US-ML-003-full-ml-cv-stack`  
**Prioridad:** Baja (Fase 3)  
**Estimado:** 4h

---

## Historia

Como usuario, quiero que Kairós detecte si estoy en mala postura o con señales de fatiga visual durante mis sesiones de trabajo, para recibir recordatorios de descanso en el momento correcto.

---

## Criterios de Aceptación

- [ ] `PostureAnalyzer.analyze_frame(frame_rgb)` devuelve `{posture_score, eye_strain_score, blink_rate_rpm, head_tilt_deg}`
- [ ] Sin MediaPipe instalado: devuelve `PostureResult()` con valores neutros (no crash)
- [ ] EAR (Eye Aspect Ratio) calculado correctamente para detectar ojos cerrados
- [ ] `blink_rate_rpm` normal: 12-20; alerta si < 8 (fatiga) o > 30 (irritación)
- [ ] `posture_score` basado en simetría de hombros (MediaPipe Pose)
- [ ] `release()` cierra todos los recursos de MediaPipe correctamente

## Activación

Solo se activa cuando el usuario habilita explícitamente la cámara en ajustes.
Jamás se almacenan frames. Solo se persisten los scores derivados.

## Archivos

- `ml-cv/mediapipe/posture_analyzer.py` — implementado
- `ml-cv/cv_pipeline.py` — integración con YOLOv8 + SAM2

## Dependencias

```
pip install mediapipe==0.10.14 opencv-python-headless==4.10.0.82
```
