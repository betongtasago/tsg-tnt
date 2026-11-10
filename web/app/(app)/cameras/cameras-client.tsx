"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  Camera as CameraIcon,
  Copy,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR, EmptyRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select } from "@/components/ui/input";
import { SearchBox, useFilter, useToast } from "@/components/ui/search-box";
import { ZoneEditor } from "./zone-editor";
import {
  DIRECTION_LABEL,
  MATCH_LABEL,
  fmtDate,
  fmtDateTime,
  fmtTime,
} from "@/lib/utils";

type Zone = { id: string; name: string; direction: string; points: { x: number; y: number }[] };

type CameraRow = {
  id: string;
  code: string;
  name: string;
  location: string;
  stationId: string;
  stationCode: string;
  status: string;
  lastSeenAt: string;
  isActive: boolean;
  zones: Zone[];
};

type EventRow = {
  id: string;
  detectedAt: string;
  plate: string;
  plateConfidence: number | null;
  vehicleType: string;
  direction: string;
  matchStatus: string;
  cameraName: string;
  cameraCode: string;
  vehiclePlate: string;
  imageUrl: string;
  note: string;
};

type Option = { id: string; label: string };

const EMPTY_CAM = {
  code: "",
  name: "",
  location: "",
  stationId: "",
  rtspUrl: "",
  isActive: true,
};

export function CamerasClient({
  cameras,
  events,
  stations,
  knownPlates,
  canCreate,
  canUpdate,
  canDelete,
}: {
  cameras: CameraRow[];
  events: EventRow[];
  stations: Option[];
  knownPlates: string[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const { show, node: toast } = useToast();

  const [tab, setTab] = useState<"cameras" | "events">("cameras");
  const [query, setQuery] = useState("");
  const [eventQuery, setEventQuery] = useState("");
  const [matchFilter, setMatchFilter] = useState("");

  const [camOpen, setCamOpen] = useState(false);
  const [editing, setEditing] = useState<CameraRow | null>(null);
  const [form, setForm] = useState(EMPTY_CAM);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [zoneCamera, setZoneCamera] = useState<CameraRow | null>(null);
  const [revealedRtsp, setRevealedRtsp] = useState<{ code: string; url: string } | null>(null);

  const pickCam = useCallback((c: CameraRow) => [c.code, c.name, c.location, c.stationCode], []);
  const filteredCams = useFilter(cameras, query, pickCam);

  const pickEvent = useCallback(
    (e: EventRow) => [e.plate, e.cameraName, e.vehiclePlate, e.note],
    []
  );
  const filteredEvents = useFilter(events, eventQuery, pickEvent).filter(
    (e) => !matchFilter || e.matchStatus === matchFilter
  );

  const unknownCount = useMemo(
    () => events.filter((e) => e.matchStatus === "UNKNOWN").length,
    [events]
  );

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_CAM, stationId: stations[0]?.id ?? "" });
    setError(null);
    setCamOpen(true);
  }

  function openEdit(c: CameraRow) {
    setEditing(c);
    setForm({
      code: c.code,
      name: c.name,
      location: c.location,
      stationId: c.stationId,
      rtspUrl: "",
      isActive: c.isActive,
    });
    setError(null);
    setCamOpen(true);
  }

  async function saveCamera() {
    setPending(true);
    setError(null);
    try {
      const payload = {
        code: form.code,
        name: form.name,
        location: form.location || null,
        stationId: form.stationId || null,
        rtspUrl: form.rtspUrl || null,
        isActive: form.isActive,
      };

      const res = await fetch(editing ? `/api/cameras/${editing.id}` : "/api/cameras", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Không lưu được camera");
        return;
      }

      setCamOpen(false);
      show(editing ? "Đã cập nhật camera" : "Đã thêm camera");
      router.refresh();
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setPending(false);
    }
  }

  async function removeCamera(c: CameraRow) {
    if (!confirm(`Xóa camera ${c.code} — ${c.name}? Toàn bộ sự kiện của camera này cũng bị xóa.`)) return;
    const res = await fetch(`/api/cameras/${c.id}`, { method: "DELETE" });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      show(data.error ?? "Không xóa được", "error");
      return;
    }
    show("Đã xóa camera");
    router.refresh();
  }

  async function revealRtsp(c: CameraRow) {
    const res = await fetch("/api/cameras", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cameraId: c.id }),
    });
    const data = (await res.json()) as { ok?: boolean; rtspUrl?: string; error?: string };
    if (!res.ok || !data.ok || !data.rtspUrl) {
      show(data.error ?? "Không lấy được RTSP URL", "error");
      return;
    }
    setRevealedRtsp({ code: c.code, url: data.rtspUrl });
  }

  return (
    <div className="space-y-3">
      {toast}

      {/* Tabs */}
      <div className="no-print flex flex-wrap items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setTab("cameras")}
          className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
            tab === "cameras"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent"
          }`}
        >
          Danh sách camera ({cameras.length})
        </button>
        <button
          onClick={() => setTab("events")}
          className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
            tab === "events"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent"
          }`}
        >
          Lịch sử nhận diện ({events.length})
          {unknownCount > 0 ? (
            <span className="ml-1.5 rounded-full bg-warning/20 px-1.5 text-[10px] text-warning">
              {unknownCount}
            </span>
          ) : null}
        </button>
      </div>

      {tab === "cameras" ? (
        <>
          <div className="no-print flex flex-wrap items-center gap-2">
            <SearchBox
              value={query}
              onChange={setQuery}
              placeholder="Tìm mã, tên, vị trí camera…"
              className="w-full sm:w-72"
            />
            {canCreate ? (
              <Button size="sm" className="ml-auto" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" /> Thêm camera
              </Button>
            ) : null}
          </div>

          <Table>
            <THead>
              <TR>
                <TH>Mã</TH>
                <TH>Tên camera</TH>
                <TH>Vị trí</TH>
                <TH>Trạm</TH>
                <TH>Trạng thái</TH>
                <TH>Lần cuối online</TH>
                <TH className="text-center">Vùng ROI</TH>
                <TH className="text-right">Thao tác</TH>
              </TR>
            </THead>
            <TBody>
              {filteredCams.length === 0 ? (
                <EmptyRow colSpan={8} message="Chưa có camera nào. Thêm camera để bắt đầu." />
              ) : (
                filteredCams.map((c) => (
                  <TR key={c.id}>
                    <TD className="whitespace-nowrap font-medium">{c.code}</TD>
                    <TD className="whitespace-nowrap font-medium">{c.name}</TD>
                    <TD className="max-w-[200px] truncate text-muted-foreground">
                      {c.location || "—"}
                    </TD>
                    <TD className="whitespace-nowrap">{c.stationCode}</TD>
                    <TD>
                      <Badge
                        tone={
                          c.status === "ONLINE" ? "success" : c.status === "OFFLINE" ? "danger" : "muted"
                        }
                      >
                        {c.status === "ONLINE" ? (
                          <Wifi className="h-3 w-3" />
                        ) : (
                          <WifiOff className="h-3 w-3" />
                        )}
                        {c.status === "ONLINE" ? "Online" : c.status === "OFFLINE" ? "Offline" : "Chưa rõ"}
                      </Badge>
                    </TD>
                    <TD className="whitespace-nowrap text-muted-foreground">
                      {c.lastSeenAt ? fmtDateTime(c.lastSeenAt) : "—"}
                    </TD>
                    <TD className="text-center">
                      <Badge tone={c.zones.length > 0 ? "primary" : "muted"}>{c.zones.length}</Badge>
                    </TD>
                    <TD>
                      <div className="flex items-center justify-end gap-1">
                        {canUpdate ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setZoneCamera(c)}
                              title="Vẽ vùng nhận diện"
                              aria-label="Vẽ vùng nhận diện"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => revealRtsp(c)}
                              title="Xem RTSP URL (đã mã hóa)"
                              aria-label="Xem RTSP URL"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEdit(c)}
                              title="Sửa"
                              aria-label="Sửa"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : null}
                        {canDelete ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeCamera(c)}
                            title="Xóa"
                            aria-label="Xóa"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>

          <div className="card-panel bg-muted/40 p-3">
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Lưu ý kiến trúc:</strong> Vercel không truy cập được
              IP nội bộ (192.168.x.x). Camera được đọc bởi <strong>AI Camera Agent</strong> chạy trên
              máy Windows tại nhà máy, agent đẩy sự kiện lên hệ thống qua HTTPS API có token bảo mật.
              RTSP URL và mật khẩu camera được mã hóa AES-256-GCM trong database và không bao giờ trả
              ra giao diện.
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="no-print flex flex-wrap items-center gap-2">
            <SearchBox
              value={eventQuery}
              onChange={setEventQuery}
              placeholder="Tìm biển số, camera…"
              className="w-full sm:w-72"
            />
            <Select
              value={matchFilter}
              onChange={(e) => setMatchFilter(e.target.value)}
              className="w-full sm:w-52"
            >
              <option value="">Tất cả đối chiếu</option>
              <option value="MATCH">Thuộc danh sách công ty</option>
              <option value="UNKNOWN">Chưa xác định</option>
            </Select>
          </div>

          <Table>
            <THead>
              <TR>
                <TH>Thời gian</TH>
                <TH>Biển số</TH>
                <TH className="text-right">Tin cậy</TH>
                <TH>Loại xe</TH>
                <TH>Hướng</TH>
                <TH>Camera</TH>
                <TH>Đối chiếu</TH>
                <TH>Ghi chú</TH>
              </TR>
            </THead>
            <TBody>
              {filteredEvents.length === 0 ? (
                <EmptyRow colSpan={8} message="Chưa có sự kiện nhận diện nào." />
              ) : (
                filteredEvents.map((e) => (
                  <TR key={e.id}>
                    <TD className="whitespace-nowrap">
                      <span className="font-medium">{fmtTime(e.detectedAt)}</span>
                      <span className="ml-1.5 text-[11px] text-muted-foreground">
                        {fmtDate(e.detectedAt)}
                      </span>
                    </TD>
                    <TD className="whitespace-nowrap font-semibold">
                      {e.plate || <span className="text-muted-foreground">—</span>}
                    </TD>
                    <TD className="whitespace-nowrap text-right tabular-nums text-muted-foreground">
                      {e.plateConfidence ? `${Math.round(e.plateConfidence * 100)}%` : "—"}
                    </TD>
                    <TD className="whitespace-nowrap text-muted-foreground">{e.vehicleType || "—"}</TD>
                    <TD className="whitespace-nowrap">{DIRECTION_LABEL[e.direction]}</TD>
                    <TD className="whitespace-nowrap">{e.cameraName}</TD>
                    <TD>
                      <Badge tone={e.matchStatus === "MATCH" ? "success" : "warning"}>
                        {MATCH_LABEL[e.matchStatus]}
                      </Badge>
                    </TD>
                    <TD className="max-w-[220px] truncate text-muted-foreground">{e.note || "—"}</TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </>
      )}

      {/* Modal camera */}
      <Modal
        open={camOpen}
        onClose={() => setCamOpen(false)}
        title={editing ? `Sửa camera — ${editing.code}` : "Thêm camera mới"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCamOpen(false)} disabled={pending}>
              Hủy
            </Button>
            <Button onClick={saveCamera} disabled={pending || !form.code || !form.name}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Lưu
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Mã camera *">
            <Input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="CAM-CONG"
            />
          </Field>
          <Field label="Tên camera *">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Cổng nhà máy"
            />
          </Field>
          <Field label="Vị trí">
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Cổng chính TNT1"
            />
          </Field>
          <Field label="Trạm">
            <Select
              value={form.stationId}
              onChange={(e) => setForm({ ...form, stationId: e.target.value })}
            >
              <option value="">— Chưa gán —</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field
              label={editing ? "RTSP URL mới (để trống nếu giữ nguyên)" : "RTSP URL *"}
              hint="Ví dụ: rtsp://admin:matkhau@192.168.1.64:554/Streaming/Channels/101 — được mã hóa khi lưu"
            >
              <Input
                value={form.rtspUrl}
                onChange={(e) => setForm({ ...form, rtspUrl: e.target.value })}
                placeholder="rtsp://user:pass@192.168.1.64:554/..."
                autoComplete="off"
              />
            </Field>
          </div>
        </div>

        {error ? (
          <p className="mt-3 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
            {error}
          </p>
        ) : null}
      </Modal>

      {/* Modal RTSP đã giải mã */}
      <Modal
        open={Boolean(revealedRtsp)}
        onClose={() => setRevealedRtsp(null)}
        title={`RTSP URL — ${revealedRtsp?.code ?? ""}`}
        description="Thông tin nhạy cảm. Thao tác này đã được ghi vào nhật ký hệ thống."
        size="md"
        footer={
          <Button variant="ghost" onClick={() => setRevealedRtsp(null)}>
            Đóng
          </Button>
        }
      >
        <div className="rounded-md border border-border bg-muted/50 p-3">
          <code className="break-all text-[12px]">{revealedRtsp?.url}</code>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Dán URL này vào file cấu hình <code>agent/config.yaml</code> trên máy tính tại nhà máy.
        </p>
      </Modal>

      {/* Modal vùng nhận diện */}
      {zoneCamera ? (
        <ZoneEditor
          camera={zoneCamera}
          knownPlates={knownPlates}
          canEdit={canUpdate}
          onClose={() => setZoneCamera(null)}
          onSaved={() => {
            setZoneCamera(null);
            router.refresh();
            show("Đã lưu vùng nhận diện");
          }}
        />
      ) : null}
    </div>
  );
}
