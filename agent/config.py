"""Cau hinh Agent — doc YAML, kiem tra hop le, khong bao gio log secret."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml


@dataclass
class Zone:
    name: str
    direction: str
    points: list[dict[str, float]]


@dataclass
class CameraConfig:
    code: str
    name: str
    rtsp_url: str
    enabled: bool = True
    zones: list[Zone] = field(default_factory=list)


@dataclass
class Config:
    base_url: str
    api_token: str
    events_path: str
    timeout_seconds: int
    retry: int
    retry_backoff_seconds: int

    cameras: list[CameraConfig]

    model: str
    confidence: float
    vehicle_classes: list[int]
    imgsz: int
    device: str
    frame_skip: int
    min_event_interval_seconds: int
    min_box_area_ratio: float

    ocr_enabled: bool
    ocr_lang: str
    ocr_engine: str
    ocr_min_confidence: float
    save_plate_crop: bool

    snapshot_dir: Path
    retention_days: int
    jpeg_quality: int
    upload_max_width: int

    upload_enabled: bool
    image_endpoint: str

    heartbeat_interval: int
    offline_after: int

    reconnect_delay: int
    reconnect_max_attempts: int

    log_level: str
    log_file: Path | None
    log_console: bool

    @property
    def events_url(self) -> str:
        return self.base_url.rstrip("/") + self.events_path

    def masked_token(self) -> str:
        t = self.api_token or ""
        return "••••" + t[-4:] if len(t) > 8 else "••••"


def _get(d: dict[str, Any], path: str, default: Any = None) -> Any:
    cur: Any = d
    for part in path.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return default
        cur = cur[part]
    return cur


def load_config(path: str | Path) -> Config:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(
            f"Khong tim thay file cau hinh: {p}\n"
            "Hay sao chep config.example.yaml thanh config.yaml roi dien thong tin that."
        )

    with p.open("r", encoding="utf-8") as f:
        raw = yaml.safe_load(f) or {}

    webapp = raw.get("webapp") or {}
    base_url = str(webapp.get("base_url") or "").strip()
    api_token = str(webapp.get("api_token") or "").strip()

    # Cho phep override bang bien moi truong (uu tien hon file)
    base_url = os.environ.get("TSG_BASE_URL", base_url)
    api_token = os.environ.get("TSG_AGENT_TOKEN", api_token)

    if not base_url:
        raise ValueError("webapp.base_url chua duoc cau hinh")
    if not api_token or api_token.startswith("THAY_"):
        raise ValueError(
            "webapp.api_token chua duoc cau hinh. "
            "Lay gia tri AGENT_API_TOKEN trong file .env cua WebApp."
        )

    cameras: list[CameraConfig] = []
    for c in raw.get("cameras") or []:
        code = str(c.get("code") or "").strip()
        rtsp = str(c.get("rtsp_url") or "").strip()
        if not code:
            raise ValueError("Moi camera phai co 'code'")
        if not rtsp.startswith("rtsp://"):
            raise ValueError(f"Camera {code}: rtsp_url phai bat dau bang rtsp://")
        zones = [
            Zone(
                name=str(z.get("name") or "Vung"),
                direction=str(z.get("direction") or "IN").upper(),
                points=[
                    {"x": float(pt["x"]), "y": float(pt["y"])}
                    for pt in (z.get("points") or [])
                ],
            )
            for z in (c.get("zones") or [])
        ]
        cameras.append(
            CameraConfig(
                code=code,
                name=str(c.get("name") or code),
                rtsp_url=rtsp,
                enabled=bool(c.get("enabled", True)),
                zones=zones,
            )
        )

    if not cameras:
        raise ValueError("Chua khai bao camera nao trong config.yaml")

    det = raw.get("detection") or {}
    ocr = raw.get("ocr") or {}
    sto = raw.get("storage") or {}
    upl = raw.get("upload") or {}
    hb = raw.get("heartbeat") or {}
    rc = raw.get("reconnect") or {}
    lg = raw.get("logging") or {}

    log_file_raw = lg.get("file")
    log_file = Path(log_file_raw) if log_file_raw else None

    return Config(
        base_url=base_url,
        api_token=api_token,
        events_path=str(webapp.get("events_path") or "/api/agent/events"),
        timeout_seconds=int(webapp.get("timeout_seconds") or 20),
        retry=int(webapp.get("retry") or 3),
        retry_backoff_seconds=int(webapp.get("retry_backoff_seconds") or 5),
        cameras=cameras,
        model=str(det.get("model") or "yolo11n.pt"),
        confidence=float(det.get("confidence") or 0.45),
        vehicle_classes=[int(x) for x in (det.get("vehicle_classes") or [2, 5, 7])],
        imgsz=int(det.get("imgsz") or 640),
        device=str(det.get("device") or "cpu"),
        frame_skip=max(1, int(det.get("frame_skip") or 5)),
        min_event_interval_seconds=int(det.get("min_event_interval_seconds") or 60),
        min_box_area_ratio=float(det.get("min_box_area_ratio") or 0.01),
        ocr_enabled=bool(ocr.get("enabled", True)),
        ocr_lang=str(ocr.get("lang") or "en"),
        ocr_engine=str(ocr.get("engine") or "paddleocr"),
        ocr_min_confidence=float(ocr.get("min_confidence") or 0.55),
        save_plate_crop=bool(ocr.get("save_plate_crop", True)),
        snapshot_dir=Path(sto.get("snapshot_dir") or "./snapshots"),
        retention_days=int(sto.get("retention_days") or 30),
        jpeg_quality=int(sto.get("jpeg_quality") or 85),
        upload_max_width=int(sto.get("upload_max_width") or 1280),
        upload_enabled=bool(upl.get("enabled", False)),
        image_endpoint=str(upl.get("image_endpoint") or ""),
        heartbeat_interval=int(hb.get("interval_seconds") or 60),
        offline_after=int(hb.get("offline_after_seconds") or 30),
        reconnect_delay=int(rc.get("delay_seconds") or 10),
        reconnect_max_attempts=int(rc.get("max_attempts") or 0),
        log_level=str(lg.get("level") or "INFO").upper(),
        log_file=log_file,
        log_console=bool(lg.get("console", True)),
    )
