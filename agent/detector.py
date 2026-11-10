"""Phat hien phuong tien bang YOLO + kiem tra vung ROI + OCR bien so."""

from __future__ import annotations

import logging
from dataclasses import dataclass

import cv2
import numpy as np

log = logging.getLogger("agent.detector")

COCO_VEHICLE_NAMES = {2: "car", 5: "bus", 7: "truck"}


@dataclass
class Box:
    x1: int
    y1: int
    x2: int
    y2: int
    confidence: float
    class_id: int
    label: str

    @property
    def width(self) -> int:
        return max(0, self.x2 - self.x1)

    @property
    def height(self) -> int:
        return max(0, self.y2 - self.y1)

    @property
    def area(self) -> int:
        return self.width * self.height

    def center(self) -> tuple[float, float]:
        return ((self.x1 + self.x2) / 2.0, (self.y1 + self.y2) / 2.0)


class VehicleDetector:
    """Bao YOLO (ultralytics). Model duoc tai 1 lan, dung lai cho moi frame."""

    def __init__(
        self,
        model_path: str = "yolo11n.pt",
        confidence: float = 0.45,
        vehicle_classes: list[int] | None = None,
        imgsz: int = 640,
        device: str = "cpu",
    ) -> None:
        from ultralytics import YOLO  # import tre de --check khong can torch

        self.model = YOLO(model_path)
        self.confidence = confidence
        self.vehicle_classes = vehicle_classes or [2, 5, 7]
        self.imgsz = imgsz
        self.device = device
        log.info(
            "Da tai model %s (conf=%.2f, imgsz=%s, device=%s)",
            model_path,
            confidence,
            imgsz,
            device,
        )

    def detect(self, image: np.ndarray) -> list[Box]:
        results = self.model.predict(
            source=image,
            conf=self.confidence,
            classes=self.vehicle_classes,
            imgsz=self.imgsz,
            device=self.device,
            verbose=False,
        )

        boxes: list[Box] = []
        for r in results:
            if r.boxes is None:
                continue
            for b in r.boxes:
                x1, y1, x2, y2 = (int(v) for v in b.xyxy[0].tolist())
                cls_id = int(b.cls[0].item())
                boxes.append(
                    Box(
                        x1=x1,
                        y1=y1,
                        x2=x2,
                        y2=y2,
                        confidence=float(b.conf[0].item()),
                        class_id=cls_id,
                        label=COCO_VEHICLE_NAMES.get(cls_id, "vehicle"),
                    )
                )
        return boxes


# ---------- hinh hoc ROI ----------


def point_in_polygon(px: float, py: float, polygon: list[tuple[float, float]]) -> bool:
    """Ray casting — khong can shapely."""
    inside = False
    n = len(polygon)
    if n < 3:
        return True

    j = n - 1
    for i in range(n):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        if (yi > py) != (yj > py):
            x_cross = (xj - xi) * (py - yi) / (yj - yi + 1e-12) + xi
            if px < x_cross:
                inside = not inside
        j = i
    return inside


def box_in_zone(box: Box, polygon: list[tuple[float, float]], frame_w: int, frame_h: int) -> bool:
    """
    Xe duoc coi la vao vung khi tam banh xe (diem giua canh duoi bounding box)
    nam trong da giac. Dung canh duoi vi do la diem tiep xuc mat duong.
    """
    if not polygon:
        return True
    cx = (box.x1 + box.x2) / 2.0 / frame_w
    cy = box.y2 / frame_h
    return point_in_polygon(cx, cy, polygon)


def zone_polygon(zone_points: list[dict[str, float]]) -> list[tuple[float, float]]:
    return [(float(p["x"]), float(p["y"])) for p in zone_points]


def crop_box(image: np.ndarray, box: Box, padding: float = 0.06) -> np.ndarray:
    h, w = image.shape[:2]
    pad_x = int(box.width * padding)
    pad_y = int(box.height * padding)
    x1 = max(0, box.x1 - pad_x)
    y1 = max(0, box.y1 - pad_y)
    x2 = min(w, box.x2 + pad_x)
    y2 = min(h, box.y2 + pad_y)
    return image[y1:y2, x1:x2].copy()


def largest_box(boxes: list[Box]) -> Box | None:
    if not boxes:
        return None
    return max(boxes, key=lambda b: b.area)
