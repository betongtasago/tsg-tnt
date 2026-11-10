"""Gui su kien len WebApp qua HTTPS API co token."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Any

import requests

log = logging.getLogger("agent.api")


@dataclass
class SendResult:
    ok: bool
    status: int
    body: dict[str, Any]
    error: str | None = None
    deduplicated: bool = False


class WebAppClient:
    def __init__(
        self,
        events_url: str,
        api_token: str,
        timeout: int = 20,
        retry: int = 3,
        backoff: int = 5,
    ) -> None:
        self.events_url = events_url
        self._token = api_token
        self.timeout = timeout
        self.retry = max(1, retry)
        self.backoff = backoff
        self._session = requests.Session()
        self._session.headers.update(
            {
                "Authorization": f"Bearer {api_token}",
                "Content-Type": "application/json",
                "User-Agent": "TSG-TNT-Agent/1.0",
            }
        )

    # ---------- su kien ----------

    def send_event(self, payload: dict[str, Any]) -> SendResult:
        return self._post(payload)

    # ---------- heartbeat ----------

    def send_heartbeat(self, cameras: list[dict[str, str]]) -> SendResult:
        return self._post({"heartbeat": True, "cameras": cameras})

    # ---------- kiem tra ket noi ----------

    def health(self) -> SendResult:
        try:
            res = self._session.get(self.events_url, timeout=self.timeout)
            body = res.json() if res.content else {}
            return SendResult(ok=res.ok, status=res.status_code, body=body)
        except Exception as e:  # noqa: BLE001
            return SendResult(ok=False, status=0, body={}, error=str(e))

    # ---------- noi bo ----------

    def _post(self, payload: dict[str, Any]) -> SendResult:
        last_error: str | None = None

        for attempt in range(1, self.retry + 1):
            try:
                res = self._session.post(
                    self.events_url,
                    json=payload,
                    timeout=self.timeout,
                )
                body: dict[str, Any] = {}
                try:
                    body = res.json()
                except ValueError:
                    body = {"raw": res.text[:300]}

                if res.ok:
                    dedup = bool(body.get("deduplicated"))
                    if dedup:
                        log.info("WebApp bo qua su kien trung: %s", body.get("message", ""))
                    return SendResult(
                        ok=True,
                        status=res.status_code,
                        body=body,
                        deduplicated=dedup,
                    )

                # 4xx (tru 429) la loi vinh vien — khong thu lai
                if 400 <= res.status_code < 500 and res.status_code != 429:
                    err = body.get("error") or f"HTTP {res.status_code}"
                    log.error("WebApp tu choi su kien: %s", err)
                    return SendResult(ok=False, status=res.status_code, body=body, error=str(err))

                last_error = body.get("error") or f"HTTP {res.status_code}"

            except requests.exceptions.RequestException as e:
                last_error = str(e)

            if attempt < self.retry:
                wait = self.backoff * attempt
                log.warning(
                    "Gui that bai (lan %s/%s): %s — thu lai sau %ss",
                    attempt,
                    self.retry,
                    last_error,
                    wait,
                )
                time.sleep(wait)

        log.error("Gui su kien that bai sau %s lan: %s", self.retry, last_error)
        return SendResult(ok=False, status=0, body={}, error=last_error)

    def close(self) -> None:
        self._session.close()
