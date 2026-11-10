"""OCR bien so xe. Ho tro PaddleOCR (khuyen dung) va EasyOCR (du phong)."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass

import cv2
import numpy as np

log = logging.getLogger("agent.ocr")

# Ky tu hay bi nham khi OCR bien so
CONFUSION = {
    "O": "0",
    "Q": "0",
    "D": "0",
    "I": "1",
    "L": "1",
    "Z": "2",
    "S": "5",
    "B": "8",
    "G": "6",
    "T": "7",
    "A": "4",
}

PLATE_PATTERN = re.compile(r"[0-9]{2,3}[A-Z]{1,2}[0-9]{3,5}")


@dataclass
class PlateResult:
    text: str
    confidence: float
    raw: str


class PlateReader:
    """
    Doc bien so tu anh crop cua phuong tien.

    Chien luoc: thu doc toan bo crop (bien so thuong nam o nua duoi xe), sau do
    lam sach chuoi theo dinh dang bien so Viet Nam.
    """

    def __init__(
        self,
        engine: str = "paddleocr",
        lang: str = "en",
        min_confidence: float = 0.55,
    ) -> None:
        self.engine = engine
        self.lang = lang
        self.min_confidence = min_confidence
        self._reader = None
        self._backend = "none"

    def _ensure_reader(self) -> bool:
        if self._reader is not None:
            return True

        if self.engine == "paddleocr":
            try:
                from paddleocr import PaddleOCR

                self._reader = PaddleOCR(use_angle_cls=True, lang=self.lang, show_log=False)
                self._backend = "paddleocr"
                log.info("OCR backend: PaddleOCR (lang=%s)", self.lang)
                return True
            except Exception as e:  # noqa: BLE001
                log.warning("Khong khoi tao duoc PaddleOCR (%s), thu EasyOCR", e)

        try:
            import easyocr

            self._reader = easyocr.Reader([self.lang], gpu=False, verbose=False)
            self._backend = "easyocr"
            log.info("OCR backend: EasyOCR (lang=%s)", self.lang)
            return True
        except Exception as e:  # noqa: BLE001
            log.error("Khong co OCR engine nao dung duoc: %s", e)
            self._backend = "none"
            return False

    def read(self, vehicle_crop: np.ndarray) -> PlateResult | None:
        if vehicle_crop is None or vehicle_crop.size == 0:
            return None
        if not self._ensure_reader():
            return None

        # Bien so nam o phan duoi cua xe — cat 45% duoi de tang ty le doc duoc
        h = vehicle_crop.shape[0]
        region = vehicle_crop[int(h * 0.55) : h, :]

        candidates = self._read_region(region)
        if not candidates:
            candidates = self._read_region(vehicle_crop)

        if not candidates:
            return None

        # Uu tien chuoi khop dinh dang bien so VN, roi den tin cay
        def score(item: tuple[str, float]) -> tuple[int, float]:
            text, conf = item
            cleaned = clean_plate(text)
            return (1 if PLATE_PATTERN.search(cleaned) else 0, conf)

        best_text, best_conf = max(candidates, key=score)
        cleaned = clean_plate(best_text)

        if not cleaned or best_conf < self.min_confidence:
            return None

        return PlateResult(text=cleaned, confidence=float(best_conf), raw=best_text)

    def _read_region(self, img: np.ndarray) -> list[tuple[str, float]]:
        out: list[tuple[str, float]] = []

        try:
            if self._backend == "paddleocr":
                result = self._reader.ocr(img, cls=True)
                for page in result or []:
                    for line in page or []:
                        if len(line) < 2:
                            continue
                        text, conf = line[1][0], float(line[1][1])
                        out.append((str(text), conf))
            elif self._backend == "easyocr":
                for _bbox, text, conf in self._reader.readtext(img):
                    out.append((str(text), float(conf)))
        except Exception as e:  # noqa: BLE001
            log.debug("OCR loi tren vung anh: %s", e)

        return out


def clean_plate(raw: str) -> str:
    """Chuan hoa chuoi OCR thanh bien so: bo dau cach, sua ky tu nham."""
    s = re.sub(r"[^A-Za-z0-9]", "", raw or "").upper()
    if not s:
        return ""

    # Tim chuoi khop dinh dang bien so VN truoc khi sua ky tu
    direct = PLATE_PATTERN.search(s)
    if direct:
        return direct.group(0)

    # Sua ky tu nham: chu cai o vi tri so -> so, va nguoc lai
    chars = list(s)
    for i, ch in enumerate(chars):
        if ch in CONFUSION:
            # Chi sua khi chuoi xung quanh cho thay day la vung so
            prev_is_digit = i > 0 and chars[i - 1].isdigit()
            next_is_digit = i + 1 < len(chars) and chars[i + 1].isdigit()
            if prev_is_digit or next_is_digit:
                chars[i] = CONFUSION[ch]

    fixed = "".join(chars)
    match = PLATE_PATTERN.search(fixed)
    if match:
        return match.group(0)

    # Fallback: chuoi da loc co do dai hop ly
    if 7 <= len(fixed) <= 10:
        return fixed
    return ""
