"use client";

import { useRef, useState } from "react";
import { Loader2, MousePointer2, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select } from "@/components/ui/input";
import { DIRECTION_LABEL } from "@/lib/utils";

type Point = { x: number; y: number };
type Zone = { id: string; name: string; direction: string; points: Point[] };
type CameraRow = { id: string; code: string; name: string; zones: Zone[] };

const DIRECTION_OPTIONS = [
  { value: "IN", label: "Xe vào (IN)" },
  { value: "OUT", label: "Xe ra (OUT)" },
  { value: "BOTH", label: "Cả hai chiều" },
];

export function ZoneEditor({
  camera,
  knownPlates,
  canEdit,
  onClose,
  onSaved,
}: {
  camera: CameraRow;
  knownPlates: string[];
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [zones, setZones] = useState<Zone[]>(camera.zones);
  const [points, setPoints] = useState<Point[]>([]);
  const [name, setName] = useState("Vùng cổng chính");
  const [direction, setDirection] = useState("IN");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  function addPoint(e: React.MouseEvent<HTMLDivElement>) {
    if (!canEdit) return;
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    setPoints((p) => [...p, { x: Number(x.toFixed(4)), y: Number(y.toFixed(4)) }]);
  }

  async function saveZone() {
    if (points.length < 3) {
      setError("Cần ít nhất 3 điểm để tạo vùng nhận diện");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/cameras/zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cameraId: camera.id, name: name.trim(), points, direction }),
      });
      const data = (await res.json()) as { ok?: boolean; zone?: Zone; error?: string };
      if (!res.ok || !data.ok || !data.zone) {
        setError(data.error ?? "Không lưu được vùng nhận diện");
        return;
      }
      setZones((z) => [...z, data.zone as Zone]);
      setPoints([]);
      onSaved();
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setPending(false);
    }
  }

  async function removeZone(id: string) {
    if (!confirm("Xóa vùng nhận diện này?")) return;
    const res = await fetch(`/api/cameras/zones?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      setError(data.error ?? "Không xóa được vùng");
      return;
    }
    setZones((z) => z.filter((x) => x.id !== id));
    onSaved();
  }

  const polygon = points.map((p) => `${p.x * 100},${p.y * 100}`).join(" ");

  return (
    <Modal
      open
      onClose={onClose}
      title={`Vùng nhận diện — ${camera.code}`}
      description="Bấm vào khung để đặt các đỉnh của vùng đa giác. Toạ độ được chuẩn hóa 0–1 nên agent áp dụng đúng ở mọi độ phân giải."
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Đóng
          </Button>
          {canEdit ? (
            <Button onClick={saveZone} disabled={pending || points.length < 3}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Lưu vùng ({points.length} điểm)
            </Button>
          ) : null}
        </>
      }
    >
      <div className="space-y-3">
        <div
          ref={areaRef}
          onClick={addPoint}
          className="relative aspect-video w-full cursor-crosshair overflow-hidden rounded-md border-2 border-dashed border-border bg-slate-900"
          role="presentation"
        >
          {/* Lưới tham chiếu */}
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {[20, 40, 60, 80].map((v) => (
              <g key={v}>
                <line x1={v} y1="0" x2={v} y2="100" stroke="rgba(255,255,255,0.08)" strokeWidth="0.2" />
                <line x1="0" y1={v} x2="100" y2={v} stroke="rgba(255,255,255,0.08)" strokeWidth="0.2" />
              </g>
            ))}

            {zones.map((z) => (
              <polygon
                key={z.id}
                points={z.points.map((p) => `${p.x * 100},${p.y * 100}`).join(" ")}
                fill="rgba(56,189,248,0.18)"
                stroke="rgba(56,189,248,0.85)"
                strokeWidth="0.4"
              />
            ))}

            {points.length >= 2 ? (
              <polygon
                points={polygon}
                fill="rgba(250,204,21,0.18)"
                stroke="rgba(250,204,21,0.9)"
                strokeWidth="0.4"
                strokeDasharray="1.5 1"
              />
            ) : null}

            {points.map((p, i) => (
              <circle key={i} cx={p.x * 100} cy={p.y * 100} r="0.9" fill="#facc15" />
            ))}
          </svg>

          <div className="pointer-events-none absolute left-2 top-2 rounded bg-black/55 px-2 py-1 text-[11px] text-white/85">
            Khung hình camera — {camera.name}
          </div>

          {points.length === 0 ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p className="flex items-center gap-1.5 rounded bg-black/55 px-3 py-1.5 text-[12px] text-white/85">
                <MousePointer2 className="h-3.5 w-3.5" /> Bấm để thêm điểm đầu tiên
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPoints((p) => p.slice(0, -1))}
            disabled={points.length === 0}
          >
            <Undo2 className="h-3.5 w-3.5" /> Bỏ điểm cuối
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPoints([])} disabled={points.length === 0}>
            <Trash2 className="h-3.5 w-3.5" /> Xóa tất cả điểm
          </Button>
          <span className="text-[11px] text-muted-foreground">
            Danh sách xe công ty đối chiếu: {knownPlates.length} biển số
          </span>
        </div>

        {canEdit ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tên vùng">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vùng cổng chính" />
            </Field>
            <Field label="Chiều nhận diện">
              <Select value={direction} onChange={(e) => setDirection(e.target.value)}>
                {DIRECTION_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        ) : null}

        {error ? (
          <p className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
            {error}
          </p>
        ) : null}

        <div>
          <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            Vùng đã cấu hình ({zones.length})
          </h3>
          {zones.length === 0 ? (
            <p className="text-[12.5px] text-muted-foreground">Chưa có vùng nào cho camera này.</p>
          ) : (
            <ul className="space-y-1.5">
              {zones.map((z) => (
                <li
                  key={z.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2.5 py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-medium">{z.name}</span>
                    <Badge tone="primary">{DIRECTION_LABEL[z.direction] ?? z.direction}</Badge>
                    <span className="text-[11px] text-muted-foreground">{z.points.length} điểm</span>
                  </div>
                  {canEdit ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeZone(z.id)}
                      aria-label="Xóa vùng"
                      title="Xóa vùng"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
