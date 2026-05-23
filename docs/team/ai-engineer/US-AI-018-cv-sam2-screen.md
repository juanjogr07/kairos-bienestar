# US-AI-018 — SAM2 Screen Content Segmenter (Fase 3)

**Owner:** Juan Gomez  
**Rama:** `feat/ml/core/US-ML-003-full-ml-cv-stack`  
**Prioridad:** Baja (Fase 3, experimental)  
**Estimado:** 4h

---

## Historia

Como sistema, quiero analizar el contenido de la pantalla para determinar la proporción texto/imagen/video y el índice de distracción potencial, sin almacenar el contenido real.

---

## Criterios de Aceptación

- [ ] `ScreenSegmenter.segment_screen(screenshot_rgb)` devuelve `{text_ratio, image_ratio, video_ratio, distractor_ratio}`
- [ ] Sin SAM2 instalado: fallback a `_heuristic_segment` basado en varianza de pixels
- [ ] `download_weights()` descarga `sam2_hiera_tiny.pt` desde HuggingFace (~155MB)
- [ ] `distractor_ratio` = imagen*1 + video*1.5, clipped a [0,1]
- [ ] Se integra en `CVPipeline.process()` cuando `screenshot` es provisto

## Nota de privacidad

Solo se procesa `distractor_ratio` y `text_ratio`. El screenshot NO se guarda.
Los masks de SAM2 se descartan después del scoring. Nunca hay almacenamiento de contenido.

## Archivos

- `ml-cv/sam2/screen_segmenter.py` — implementado

## Descarga de pesos (fase 3)

```bash
from ml_cv.sam2.screen_segmenter import ScreenSegmenter
ScreenSegmenter.download_weights()
# → ml-cv/models/sam2_hiera_tiny.pt (~155MB)
```
