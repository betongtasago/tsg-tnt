"""Doc luong RTSP tu camera IP (Hikvision va tuong thich), co tu ket noi lai."""

from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass

import cv2
import numpy as np

log = logging.getLogger("agent.rtsp")


@dataclass
class Frame:
    image: np.ndarray
    captured_at: float


class RtspReader:
    """
    Doc frame tu RTSP trong thread rieng, giu frame moi nhat.

    Ly do tach thread: cv2.VideoCapture.read() co the block nhieu giay khi camera
    mat ket noi. Neu doc truc tiep trong vong lap nhan dien, toan bo agent dung.
    """

    def __init__(
        self,
        code: str,
        url: str,
        reconnect_delay: int = 10,
        offline_after: int = 30,
    ) -> None:
        self.code = code
        self._url = url
        self._reconnect_delay = reconnect_delay
        self._offline_after = offline_after

        self._lock = threading.Lock()
        self._frame: Frame | None = None
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._online = False
        self._last_frame_at = 0.0
        self._reconnects = 0

    # ---------- vong doi ----------

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, name=f"rtsp-{self.code}", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=5)

    # ---------- doc frame ----------

    def latest(self) -> Frame | None:
        with self._lock:
            return self._frame

    @property
    def online(self) -> bool:
        if not self._online:
            return False
        return (time.time() - self._last_frame_at) <= self._offline_after

    @property
    def reconnects(self) -> int:
        return self._reconnects

    # ---------- noi bo ----------

    def _open(self) -> cv2.VideoCapture | None:
        # Hikvision: uu tien TCP de on dinh hon UDP tren LAN
        cap = cv2.VideoCapture(self._url, cv2.CAP_FFMPEG)
        if not cap.isOpened():
            cap.release()
            return None

        # Giam buffer de frame khong bi tre
        try:
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        except Exception:  # noqa: BLE001 - khong phai backend nao cung ho tro
            pass

        return cap

    def _run(self) -> None:
        attempts = 0

        while not self._stop.is_set():
            cap = self._open()

            if cap is None:
                attempts += 1
                self._online = False
                log.warning(
                    "[%s] khong ket noi duoc RTSP (lan thu %s), thu lai sau %ss",
                    self.code,
                    attempts,
                    self._reconnect_delay,
                )
                self._stop.wait(self._reconnect_delay)
                continue

            attempts = 0
            self._reconnects += 1
            log.info("[%s] da ket noi camera", self.code)

            fail_streak = 0

            while not self._stop.is_set():
                ok, img = cap.read()

                if not ok or img is None:
                    fail_streak += 1
                    if fail_streak >= 10:
                        log.warning("[%s] mat tin hieu, ket noi lai", self.code)
                        break
                    time.sleep(0.2)
                    continue

                fail_streak = 0
                now = time.time()

                with self._lock:
                    self._frame = Frame(image=img, captured_at=now)

                self._last_frame_at = now
                self._online = True

            cap.release()
            self._online = False

            if not self._stop.is_set():
                self._stop.wait(self._reconnect_delay)

        log.info("[%s] dung doc camera", self.code)


def grab_snapshot(url: str, timeout_seconds: int = 8) -> np.ndarray | None:
    """Chup 1 khung hinh duy nhat — dung cho nut kiem tra ket noi."""
    cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
    if not cap.isOpened():
        cap.release()
        return None

    deadline = time.time() + timeout_seconds
    img = None
    while time.time() < deadline:
        ok, frame = cap.read()
        if ok and frame is not None:
            img = frame
            break
        time.sleep(0.15)

    cap.release()
    return img
