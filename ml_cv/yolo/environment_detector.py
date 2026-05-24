"""
Object & Environment Detector  (Fase 3, on-device)

Detecta objetos con vocabulario abierto usando YOLO-World v2 cuando está
disponible, con fallback a YOLOv8n (80 clases COCO).

YOLO-World permite detectar cualquier tipo de objeto — no solo las 80 clases
COCO — y detecta celulares/smartphones con múltiples aliases.

Model priority:
  1. yolov8s-worldv2.pt — open-vocabulary, ~52 FPS T4, usa set_classes()
  2. yolov8n.pt          — fallback, 80 COCO classes, 8ms T4

Pesos descargados automáticamente desde Ultralytics CDN en primer uso.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

logger = logging.getLogger(__name__)

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    logger.warning("ultralytics not installed — EnvironmentDetector usará fallback sin modelo")

MODELS_DIR = Path(__file__).parent.parent / "models"

# ── Vocabulario personalizado para YOLO-World ────────────────────────────────
# Incluye múltiples aliases de celular para máxima cobertura de detección.
# Orden importa: YOLO-World asigna class IDs por índice en esta lista.
CUSTOM_VOCABULARY: list[str] = [
    # Celulares / smartphones (múltiples aliases)
    "cell phone", "mobile phone", "smartphone", "phone",
    # Herramientas de trabajo
    "laptop", "keyboard", "mouse", "monitor", "desktop computer",
    "tablet", "calculator", "printer", "projector", "webcam",
    # Estudio
    "book", "notebook", "pen", "pencil", "scissors",
    "whiteboard", "sticky notes", "folder", "binder",
    # Muebles / entorno
    "chair", "desk", "couch", "sofa", "bed", "pillow", "blanket",
    "table", "shelf", "lamp", "floor lamp", "desk lamp",
    # Entretenimiento / distracción
    "television", "tv", "remote control", "game controller",
    "video game console", "headphones", "earphones",
    # Comida / bienestar
    "cup", "mug", "bottle", "water bottle", "food", "snack",
    "plate", "microwave", "refrigerator",
    # Objetos personales
    "glasses", "sunglasses", "watch", "backpack", "bag",
    # Transporte / exterior
    "car", "bus", "bicycle", "motorcycle",
    # Naturaleza
    "tree", "plant", "sky",
    # Personas
    "person",
    # Misceláneos comunes
    "clock", "window", "door", "painting", "poster", "toy",
]

# ── Mapa contexto → objetos indicadores ─────────────────────────────────────
CONTEXT_COCO_MAP: dict[str, list[str]] = {
    "workspace": [
        "laptop", "keyboard", "mouse", "monitor", "book", "chair",
        "desk", "tablet", "webcam", "desktop computer",
    ],
    "bedroom": ["bed", "pillow", "blanket", "lamp"],
    "couch": ["couch", "sofa", "remote control", "television", "tv"],
    "outdoor": ["tree", "sky", "bicycle", "car", "person", "plant"],
    "transport": ["car", "bus", "motorcycle", "bicycle"],
    "kitchen": ["cup", "mug", "bottle", "microwave", "refrigerator", "food", "plate"],
}

CONTEXT_PRIORITY = ["workspace", "bedroom", "couch", "kitchen", "transport", "outdoor"]

# ── Categorización de objetos ────────────────────────────────────────────────
OBJECT_TYPE_MAP: dict[str, str] = {
    # Distracción digital
    "cell phone": "distraction",   "mobile phone": "distraction",
    "smartphone": "distraction",   "phone": "distraction",
    "television": "distraction",   "tv": "distraction",
    "remote control": "leisure",   "game controller": "leisure",
    "video game console": "leisure",
    # Herramientas de trabajo
    "laptop": "work_tool",         "keyboard": "work_tool",
    "mouse": "work_tool",          "monitor": "work_tool",
    "desktop computer": "work_tool", "tablet": "work_tool",
    "calculator": "work_tool",     "printer": "work_tool",
    "projector": "work_tool",      "webcam": "work_tool",
    # Estudio
    "book": "study_tool",          "notebook": "study_tool",
    "whiteboard": "study_tool",
    # Papelería
    "pen": "stationery",           "pencil": "stationery",
    "scissors": "stationery",      "sticky notes": "stationery",
    # Bienestar
    "cup": "wellness",             "mug": "wellness",
    "bottle": "wellness",          "water bottle": "wellness",
    "food": "wellness",            "snack": "wellness",
    # Entretenimiento
    "headphones": "entertainment", "earphones": "entertainment",
    # Entorno
    "chair": "environment",        "desk": "environment",
    "table": "environment",        "lamp": "environment",
    "desk lamp": "environment",    "plant": "environment",
    "couch": "leisure",            "sofa": "leisure",
    "bed": "leisure",
    # Personas
    "person": "person",
}


@dataclass
class DetectedBox:
    label: str
    confidence: float
    object_type: str   # distraction | work_tool | leisure | study_tool | wellness | person | unknown
    x1: float  # normalized 0-1
    y1: float
    x2: float
    y2: float


@dataclass
class EnvironmentResult:
    context: str = "unknown"
    confidence: float = 0.0
    detected_objects: list[str] = field(default_factory=list)
    all_scores: dict[str, float] = field(default_factory=dict)
    boxes: list[DetectedBox] = field(default_factory=list)
    using_open_vocabulary: bool = False  # True si YOLO-World está activo


class EnvironmentDetector:
    """Detecta entorno y clasifica todos los objetos visibles.

    Intenta YOLO-World v2 (open-vocabulary) primero; fallback a YOLOv8n.
    Detecta celulares en ambos modos (COCO class 67 en fallback).
    """

    WORLD_MODEL = "yolov8s-worldv2.pt"
    FALLBACK_MODEL = "yolov8n.pt"

    def __init__(self) -> None:
        self._model = None
        self._open_vocab = False
        if YOLO_AVAILABLE:
            self._load_model()

    def _load_model(self) -> None:
        # Intentar YOLO-World primero
        try:
            world_path = MODELS_DIR / self.WORLD_MODEL
            self._model = YOLO(str(world_path) if world_path.exists() else self.WORLD_MODEL)
            self._model.set_classes(CUSTOM_VOCABULARY)
            self._open_vocab = True
            logger.info(
                "YOLO-World v2 cargado — modo vocabulario abierto (%d clases)",
                len(CUSTOM_VOCABULARY),
            )
            return
        except Exception as e:
            logger.warning("YOLO-World v2 no disponible (%s) — usando YOLOv8n fallback", e)

        # Fallback: YOLOv8n (80 COCO)
        try:
            fallback_path = MODELS_DIR / self.FALLBACK_MODEL
            self._model = YOLO(str(fallback_path) if fallback_path.exists() else self.FALLBACK_MODEL)
            self._open_vocab = False
            logger.info("YOLOv8n cargado (80 clases COCO, clase 67 = cell phone)")
        except Exception as e:
            logger.error("YOLOv8n también falló: %s", e)

    def detect(self, frame_rgb: np.ndarray, conf_threshold: float = 0.30) -> EnvironmentResult:
        """Detecta objetos en un frame RGB (H×W×3 uint8).

        Retorna EnvironmentResult con contexto inferido y objetos tipados.
        Umbral bajado a 0.30 (vs 0.35 anterior) para mejorar detección de celulares.
        """
        if not YOLO_AVAILABLE or self._model is None:
            return EnvironmentResult(context="unknown", confidence=0.0)

        try:
            results = self._model(frame_rgb, conf=conf_threshold, verbose=False)
            boxes = results[0].boxes
            if boxes is None or len(boxes) == 0:
                return EnvironmentResult(
                    context="unknown",
                    confidence=0.0,
                    using_open_vocabulary=self._open_vocab,
                )

            names = results[0].names
            detected = [names[int(cls)] for cls in boxes.cls.tolist()]
            detected_set = set(detected)

            # Puntuar contextos por objetos presentes
            scores: dict[str, float] = {}
            for ctx, obj_list in CONTEXT_COCO_MAP.items():
                matches = detected_set & set(obj_list)
                scores[ctx] = len(matches) / len(obj_list) if obj_list else 0.0

            best_ctx = "unknown"
            best_score = 0.0
            for ctx in CONTEXT_PRIORITY:
                if scores.get(ctx, 0) > best_score:
                    best_score = scores[ctx]
                    best_ctx = ctx

            # Bounding boxes normalizadas con tipo de objeto
            h, w = frame_rgb.shape[:2]
            box_list: list[DetectedBox] = []
            for i, cls in enumerate(boxes.cls.tolist()):
                label = names[int(cls)]
                conf = float(boxes.conf[i])
                xyxy = boxes.xyxy[i].tolist()
                obj_type = OBJECT_TYPE_MAP.get(label.lower(), "unknown")
                box_list.append(DetectedBox(
                    label=label,
                    confidence=round(conf, 3),
                    object_type=obj_type,
                    x1=round(xyxy[0] / w, 4),
                    y1=round(xyxy[1] / h, 4),
                    x2=round(xyxy[2] / w, 4),
                    y2=round(xyxy[3] / h, 4),
                ))

            return EnvironmentResult(
                context=best_ctx,
                confidence=round(best_score, 4),
                detected_objects=sorted(detected_set),
                all_scores={k: round(v, 4) for k, v in scores.items()},
                boxes=box_list,
                using_open_vocabulary=self._open_vocab,
            )

        except Exception as e:
            logger.error("Inferencia YOLO falló: %s", e)
            return EnvironmentResult(context="unknown", confidence=0.0)

    def download_weights(self) -> bool:
        """Descarga pesos de YOLO-World v2 al directorio models/."""
        if not YOLO_AVAILABLE:
            return False
        try:
            model = YOLO(self.WORLD_MODEL)
            model.set_classes(CUSTOM_VOCABULARY)
            MODELS_DIR.mkdir(exist_ok=True)
            logger.info("YOLO-World v2 disponible en %s", MODELS_DIR)
            return True
        except Exception as e:
            logger.error("Descarga de pesos falló: %s", e)
            return False
