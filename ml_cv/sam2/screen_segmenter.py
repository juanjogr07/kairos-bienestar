"""
SAM2 (Segment Anything Model 2) — Screen Content Segmenter  (Fase 3)

Segmenta el contenido de la pantalla para identificar:
  - Área de texto vs. imagen vs. video
  - Presencia de contenido de noticias / redes sociales
  - Proporción de contenido potencialmente distractor

SAM2 es extremadamente pesado (600MB+) — en Fase 3 se usa solo en backend
con prompts de bounding boxes para segmentar regiones de interés.

Para Phase 3 MVP, usamos el checkpoint sam2-hiera-tiny (38.9M params).
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

logger = logging.getLogger(__name__)

SAM2_CHECKPOINT_TINY = "sam2_hiera_tiny.pt"
SAM2_CONFIG_TINY = "sam2_hiera_t.yaml"
MODELS_DIR = Path(__file__).parent.parent / "models"

try:
    # SAM2 from Meta: pip install git+https://github.com/facebookresearch/segment-anything-2.git
    from sam2.build_sam import build_sam2
    from sam2.sam2_image_predictor import SAM2ImagePredictor
    SAM2_AVAILABLE = True
except ImportError:
    SAM2_AVAILABLE = False
    logger.warning("SAM2 not installed — ScreenSegmenter will use placeholder output")


@dataclass
class SegmentationResult:
    text_ratio: float = 0.0
    image_ratio: float = 0.0
    video_ratio: float = 0.0
    distractor_ratio: float = 0.0
    segments_count: int = 0
    masks: list = field(default_factory=list)  # list of np.ndarray masks


class ScreenSegmenter:
    """Segments screenshot regions to classify content type.

    Phase 3 only — requires GPU for reasonable inference speed.
    """

    def __init__(self, device: str = "cpu") -> None:
        self._predictor = None
        self._device = device
        if SAM2_AVAILABLE:
            self._load_model()

    def _load_model(self) -> None:
        ckpt = MODELS_DIR / SAM2_CHECKPOINT_TINY
        cfg = SAM2_CONFIG_TINY
        if not ckpt.exists():
            logger.warning(
                "SAM2 checkpoint not found at %s. Run download_weights() first.", ckpt
            )
            return
        try:
            sam2 = build_sam2(cfg, str(ckpt), device=self._device)
            self._predictor = SAM2ImagePredictor(sam2)
            logger.info("SAM2 tiny loaded on %s", self._device)
        except Exception as e:
            logger.error("SAM2 load failed: %s", e)

    def segment_screen(self, screenshot_rgb: np.ndarray, point_grid_n: int = 4) -> SegmentationResult:
        """Segment a screenshot into content-type regions.

        Uses automatic point-grid prompting across the image.
        screenshot_rgb: H×W×3 uint8 RGB numpy array.
        """
        if not SAM2_AVAILABLE or self._predictor is None:
            return self._heuristic_segment(screenshot_rgb)

        h, w = screenshot_rgb.shape[:2]
        try:
            self._predictor.set_image(screenshot_rgb)

            # Grid of input points
            xs = np.linspace(0, w - 1, point_grid_n, dtype=int)
            ys = np.linspace(0, h - 1, point_grid_n, dtype=int)
            points = np.array([[x, y] for y in ys for x in xs])
            labels = np.ones(len(points), dtype=int)

            masks, scores, _ = self._predictor.predict(
                point_coords=points,
                point_labels=labels,
                multimask_output=True,
            )

            # Classify each mask region by brightness/texture heuristic
            result = self._classify_masks(masks, screenshot_rgb)
            result.segments_count = len(masks)
            result.masks = [m for m in masks]
            return result

        except Exception as e:
            logger.error("SAM2 inference failed: %s", e)
            return SegmentationResult()

    def _classify_masks(self, masks: np.ndarray, img: np.ndarray) -> SegmentationResult:
        """Classify each mask into text/image/video/distractor by pixel statistics."""
        total_px = img.shape[0] * img.shape[1]
        text_px = image_px = video_px = 0

        for mask in masks:
            region = img[mask]
            if len(region) == 0:
                continue
            # Text: low variance, bimodal (black on white or vice versa)
            variance = float(np.var(region))
            mean_brightness = float(np.mean(region))
            if variance < 500 and (mean_brightness > 200 or mean_brightness < 50):
                text_px += len(region)
            elif variance < 2000:
                image_px += len(region)
            else:
                video_px += len(region)

        text_r = text_px / (total_px + 1)
        image_r = image_px / (total_px + 1)
        video_r = video_px / (total_px + 1)
        distractor_r = float(np.clip(image_r + video_r * 1.5, 0, 1))

        return SegmentationResult(
            text_ratio=round(text_r, 4),
            image_ratio=round(image_r, 4),
            video_ratio=round(video_r, 4),
            distractor_ratio=round(distractor_r, 4),
        )

    def _heuristic_segment(self, img: np.ndarray) -> SegmentationResult:
        """Simple pixel-stat fallback when SAM2 unavailable."""
        variance = float(np.var(img))
        brightness = float(np.mean(img))
        text_r = 1.0 if variance < 1000 else 0.3
        image_r = 0.5 if 1000 < variance < 5000 else 0.1
        video_r = 0.4 if variance > 5000 else 0.0
        return SegmentationResult(
            text_ratio=round(text_r, 4),
            image_ratio=round(image_r, 4),
            video_ratio=round(video_r, 4),
            distractor_ratio=round(image_r + video_r, 4),
        )

    @staticmethod
    def download_weights() -> None:
        """Download SAM2 tiny checkpoint from Meta's HuggingFace repo."""
        import urllib.request
        MODELS_DIR.mkdir(exist_ok=True)
        url = "https://huggingface.co/facebook/sam2-hiera-tiny/resolve/main/sam2_hiera_tiny.pt"
        dest = MODELS_DIR / SAM2_CHECKPOINT_TINY
        if dest.exists():
            logger.info("SAM2 checkpoint already exists at %s", dest)
            return
        logger.info("Downloading SAM2 tiny from %s ...", url)
        urllib.request.urlretrieve(url, dest)
        logger.info("SAM2 downloaded → %s", dest)
