"""Vong lap chinh cua AI Camera Agent."""

from __future__ import annotations

import argparse
import logging
import signal
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path

import cv2
import numpy as np

from api_client import WebAppClient
from config import CameraConfig, Config, load_config
from detector import (
    Box,
    VehicleDetector,
    box_in_zone,
    crop_box,
    largest_box,
    zone_polygon,
)
from ocr import PlateReader
from rtsp_reader import RtspReader

log = logging.getLogger("agent")


# ---------- tien ich ----------


def setup_logging(level: str, log_file: Path | None, console: bool) -> None:
    root = logging.getLogger()
    root.setLevel(getattr(logging, level, logging.INFO))
    root.handlers.clear()

    fmt = logging.Formatter("%(asctime)s | %(levelname)-7s | %(name)-16s | %(message)s")

    if console:
        sh = logging.StreamHandler(sys.stdout)
        sh.setFormatter(fmt)
        root.addHandler(sh)

    if log_file:
        log_file.parent.mkdir(parents=True, exist_ok=True)
        fh = TimedRotatingFileHandler(
            log_file, when="midnight", backupCount=14, encoding="utf-8"
        )
        fh.setFormatter(fmt)
        root.addHandler(fh)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def save_snapshot(
    image: np.ndarray,
    directory: Path,
    camera_code: str,
    quality: int,
    max_width: int,
    suffix: str = "",
) -> Path | None:
    try:
        directory.mkdir(parents=True, exist_ok=True)

        h, w = image.shape[:2]
        if w > max_width:
            scale = max_width / float(w)
            image = cv2.resize(image, (max_width, int(h * scale)), interpolation=cv2.INTER_AREA)

        stamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]
        name = f"{camera_code}_{stamp}{suffix}.jpg"
        path = directory / name

        ok = cv2.imwrite(str(path), image, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
        return path if ok else None
    except Exception as e:  # noqa: BLE001
        log.warning("Khong luu duoc snapshot: %s", e)
        return None


def cleanup_old_snapshots(directory: Path, retention_days: int) -> None:
    if retention_days <= 0 or not directory.exists():
        return

    cutoff = time.time() - retention_days * 86400
    removed = 0

    for f in directory.glob("*.jpg"):
        try:
            if f.stat().st_mtime < cutoff:
                f.unlink()
                removed += 1
        except OSError:
            continue

    if removed:
        log.info("Da xoa %s anh snapshot qua han", removed)


# ---------- trang thai chong trung ----------


@dataclass
class CameraState:
    """Ghi nho lan cuoi thay xe trong vung de khong ban trung."""

    last_seen: dict[str, float] = field(default_factory=dict)
    last_any_vehicle: float = 0.0


# ---------- agent ----------


class CameraAgent:
    def __init__(self, cfg: Config) -> None:
        self.cfg = cfg
        self.client = WebAppClient(
            events_url=cfg.events_url,
            api_token=cfg.api_token,
            timeout=cfg.timeout_seconds,
            retry=cfg.retry,
            backoff=cfg.retry_backoff_seconds,
        )
        self.detector = VehicleDetector(
            model_path=cfg.model,
            confidence=cfg.confidence,
            vehicle_classes=cfg.vehicle_classes,
            imgsz=cfg.imgsz,
            device=cfg.device,
        )
        self.reader = PlateReader(
            engine=cfg.ocr_engine,
            lang=cfg.ocr_lang,
            min_confidence=cfg.ocr_min_confidence,
        ) if cfg.ocr_enabled else None

        self.readers: dict[str, RtspReader] = {}
        self.states: dict[str, CameraState] = {}
        self._running = True
        self._last_heartbeat = 0.0
        self._last_cleanup = 0.0
        self._frame_counters: dict[str, int] = {}

        for cam in cfg.cameras:
            if not cam.enabled:
                log.info("Camera %s dang tat trong cau hinh, bo qua", cam.code)
                continue
            self.readers[cam.code] = RtspReader(
                code=cam.code,
                url=cam.rtsp_url,
                reconnect_delay=cfg.reconnect_delay,
                offline_after=cfg.offline_after,
            )
            self.states[cam.code] = CameraState()
            self._frame_counters[cam.code] = 0

    # ---------- vong doi ----------

    def start(self) -> None:
        log.info("=" * 68)
        log.info("TSG-TNT AI CAMERA AGENT")
        log.info("WebApp      : %s", self.cfg.base_url)
        log.info("Token       : %s", self.cfg.masked_token())
        log.info("Model       : %s (%s)", self.cfg.model, self.cfg.device)
        log.info("OCR         : %s", "bat" if self.reader else "tat")
        log.info("Camera      : %s", ", ".join(self.readers.keys()) or "khong co")
        log.info("=" * 68)

        health = self.client.health()
        if health.ok:
            log.info("Ket noi WebApp thanh cong")
        else:
            log.warning("Khong kiem tra duoc WebApp: %s", health.error or health.status)

        for r in self.readers.values():
            r.start()

    def stop(self) -> None:
        self._running = False
        log.info("Dang dung agent…")
        for r in self.readers.values():
            r.stop()
        self.client.close()
        log.info("Agent da dung")

    # ---------- vong lap ----------

    def run(self) -> None:
        self.start()

        while self._running:
            loop_start = time.time()

            for cam in self.cfg.cameras:
                if not cam.enabled or cam.code not in self.readers:
                    continue
                try:
                    self._process_camera(cam)
                except Exception as e:  # noqa: BLE001
                    log.exception("Loi xu ly camera %s: %s", cam.code, e)

            self._maybe_heartbeat()
            self._maybe_cleanup()

            elapsed = time.time() - loop_start
            time.sleep(max(0.05, 0.2 - elapsed))

    def _process_camera(self, cam: CameraConfig) -> None:
        reader = self.readers[cam.code]
        frame = reader.latest()

        if frame is None:
            return

        # Bo qua frame cu (camera tre hoac mat ket noi)
        if (time.time() - frame.captured_at) > self.cfg.offline_after:
            return

        # Giam tai CPU: chi xu ly 1/N frame
        self._frame_counters[cam.code] += 1
        if self._frame_counters[cam.code] % self.cfg.frame_skip != 0:
            return

        image = frame.image
        h, w = image.shape[:2]

        boxes = self.detector.detect(image)
        if not boxes:
            return

        # Loc box qua nho (nhieu, vat the xa)
        min_area = self.cfg.min_box_area_ratio * w * h
        boxes = [b for b in boxes if b.area >= min_area]
        if not boxes:
            return

        state = self.states[cam.code]

        # Xac dinh vung nao dang co xe
        matched_zone = None
        matched_box: Box | None = None

        if cam.zones:
            for zone in cam.zones:
                poly = zone_polygon(zone.points)
                in_zone = [b for b in boxes if box_in_zone(b, poly, w, h)]
                if in_zone:
                    matched_zone = zone
                    matched_box = largest_box(in_zone)
                    break
        else:
            matched_box = largest_box(boxes)

        if matched_box is None:
            return

        direction = matched_zone.direction if matched_zone else "IN"
        zone_name = matched_zone.name if matched_zone else "toan khung hinh"

        # OCR bien so
        plate_text = None
        plate_conf = None

        if self.reader:
            crop = crop_box(image, matched_box)
            result = self.reader.read(crop)
            if result:
                plate_text = result.text
                plate_conf = result.confidence

        # Khoa chong trung: bien so (neu doc duoc) hoac "khong ro"
        dedupe_key = plate_text or "__unknown__"
        last = state.last_seen.get(dedupe_key, 0.0)
        now = time.time()

        if (now - last) < self.cfg.min_event_interval_seconds:
            return

        state.last_seen[dedupe_key] = now
        state.last_any_vehicle = now

        # Luu anh
        snap_path = save_snapshot(
            image,
            self.cfg.snapshot_dir,
            cam.code,
            self.cfg.jpeg_quality,
            self.cfg.upload_max_width,
        )

        if snap_path:
            log.info("[%s] %s | vung=%s | anh=%s", cam.code, plate_text or "chua xac dinh", zone_name, snap_path.name)
        else:
            log.info("[%s] %s | vung=%s", cam.code, plate_text or "chua xac dinh", zone_name)

        # Gui len WebApp
        payload = {
            "cameraCode": cam.code,
            "detectedAt": now_iso(),
            "plate": plate_text,
            "plateConfidence": plate_conf,
            "vehicleType": matched_box.label,
            "direction": direction if direction in ("IN", "OUT") else "UNKNOWN",
            "note": f"Vung: {zone_name}; box={matched_box.width}x{matched_box.height}",
        }

        # Gui kem anh JPEG (base64) de Telegram co anh that va luu lich su
        if snap_path and snap_path.exists():
            try:
                import base64

                raw = snap_path.read_bytes()
                if len(raw) <= self.cfg.upload_max_bytes:
                    payload["imageBase64"] = base64.b64encode(raw).decode("ascii")
                else:
                    log.warning("Anh qua lon (%s bytes), bo qua: %s", len(raw), snap_path.name)
            except Exception as exc:  # noqa: BLE001
                log.warning("Khong doc duoc anh de gui: %s", exc)

        result = self.client.send_event(payload)

        if result.ok:
            match = result.body.get("matchStatus")
            log.info(
                "[%s] da gui su kien (doi chieu=%s, telegram=%s)",
                cam.code,
                match,
                (result.body.get("telegram") or {}).get("sent"),
            )
        else:
            log.error("[%s] gui su kien that bai: %s", cam.code, result.error)

    def _maybe_heartbeat(self) -> None:
        now = time.time()
        if (now - self._last_heartbeat) < self.cfg.heartbeat_interval:
            return

        self._last_heartbeat = now

        statuses = [
            {
                "code": code,
                "status": "ONLINE" if reader.online else "OFFLINE",
            }
            for code, reader in self.readers.items()
        ]

        if not statuses:
            return

        result = self.client.send_heartbeat(statuses)

        summary = ", ".join(f"{s['code']}={s['status']}" for s in statuses)
        if result.ok:
            log.info("Heartbeat: %s", summary)
        else:
            log.warning("Heartbeat that bai (%s): %s", summary, result.error)

    def _maybe_cleanup(self) -> None:
        now = time.time()
        if (now - self._last_cleanup) < 3600:
            return
        self._last_cleanup = now
        cleanup_old_snapshots(self.cfg.snapshot_dir, self.cfg.retention_days)


# ---------- CLI ----------


def cmd_check(cfg: Config) -> int:
    """Kiem tra ket noi: WebApp, tung camera, model, OCR."""
    print("\n=== KIEM TRA KET NOI ===")
    ok_all = True

    client = WebAppClient(
        events_url=cfg.events_url,
        api_token=cfg.api_token,
        timeout=cfg.timeout_seconds,
        retry=1,
        backoff=1,
    )
    health = client.health()
    if health.ok:
        print(f"[OK]   WebApp: {cfg.base_url}")
    else:
        print(f"[LOI]  WebApp: {health.error or health.status}")
        ok_all = False

    from rtsp_reader import grab_snapshot

    for cam in cfg.cameras:
        if not cam.enabled:
            print(f"[BO]   Camera {cam.code}: dang tat")
            continue
        img = grab_snapshot(cam.rtsp_url, timeout_seconds=8)
        if img is None:
            print(f"[LOI]  Camera {cam.code}: khong doc duoc frame")
            ok_all = False
        else:
            h, w = img.shape[:2]
            print(f"[OK]   Camera {cam.code}: {w}x{h}")

    try:
        VehicleDetector(
            model_path=cfg.model,
            confidence=cfg.confidence,
            vehicle_classes=cfg.vehicle_classes,
            imgsz=cfg.imgsz,
            device=cfg.device,
        )
        print(f"[OK]   Model: {cfg.model}")
    except Exception as e:  # noqa: BLE001
        print(f"[LOI]  Model: {e}")
        ok_all = False

    if cfg.ocr_enabled:
        r = PlateReader(cfg.ocr_engine, cfg.ocr_lang, cfg.ocr_min_confidence)
        if r._ensure_reader():  # noqa: SLF001
            print(f"[OK]   OCR: {r._backend}")  # noqa: SLF001
        else:
            print("[LOI]  OCR: khong khoi tao duoc engine")
            ok_all = False

    client.close()
    print("\nKet qua:", "SAN SANG" if ok_all else "CO LOI — xem chi tiet o tren")
    return 0 if ok_all else 1


def cmd_snapshot(cfg: Config, camera_code: str) -> int:
    """Chup 1 anh tu camera de kiem tra goc nhin va ve ROI."""
    from rtsp_reader import grab_snapshot

    cam = next((c for c in cfg.cameras if c.code == camera_code), None)
    if cam is None:
        print(f"Khong tim thay camera {camera_code}")
        return 1

    img = grab_snapshot(cam.rtsp_url, timeout_seconds=10)
    if img is None:
        print("Khong doc duoc frame tu camera")
        return 1

    path = save_snapshot(
        img,
        cfg.snapshot_dir,
        cam.code,
        cfg.jpeg_quality,
        cfg.upload_max_width,
        suffix="_test",
    )
    print(f"Da luu anh: {path}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="TSG-TNT AI Camera Agent")
    parser.add_argument("-c", "--config", default="config.yaml", help="Duong dan file cau hinh")
    parser.add_argument("--check", action="store_true", help="Kiem tra ket noi roi thoat")
    parser.add_argument("--snapshot", metavar="CAMERA_CODE", help="Chup 1 anh tu camera")
    args = parser.parse_args()

    try:
        cfg = load_config(args.config)
    except (FileNotFoundError, ValueError) as e:
        print(f"Loi cau hinh: {e}", file=sys.stderr)
        return 2

    setup_logging(cfg.log_level, cfg.log_file, cfg.log_console)

    if args.check:
        return cmd_check(cfg)

    if args.snapshot:
        return cmd_snapshot(cfg, args.snapshot)

    agent = CameraAgent(cfg)

    def handle_signal(signum, _frame):  # noqa: ANN001
        log.info("Nhan tin hieu %s, dung agent", signum)
        agent.stop()

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    try:
        agent.run()
    except KeyboardInterrupt:
        agent.stop()

    return 0


if __name__ == "__main__":
    sys.exit(main())
