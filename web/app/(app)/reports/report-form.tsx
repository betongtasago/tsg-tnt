"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Loader2, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SHIFT_LABEL } from "@/lib/utils";

type Option = { id: string; label: string };

export type ReportFormValues = {
  id?: string;
  reportDate: string;
  shift: string;
  stationId: string;
  customerId: string;
  grade: string;
  slump: string;
  plannedVolume: string;
  actualVolume: string;
  truckCount: string;
  tripCount: string;
  startTime: string;
  endTime: string;
  supervisorName: string;
  incidentNote: string;
};

export function ReportForm({
  initial,
  stations,
  customers,
  canSubmit,
  canEdit,
}: {
  initial: ReportFormValues;
  stations: Option[];
  customers: Option[];
  canSubmit: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [v, setV] = useState<ReportFormValues>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"save" | "submit" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isEdit = Boolean(initial.id);

  function set<K extends keyof ReportFormValues>(key: K, value: string) {
    setV((prev) => ({ ...prev, [key]: value }));
  }

  async function save(thenSubmit: boolean) {
    setError(null);
    setNotice(null);
    setPending(thenSubmit ? "submit" : "save");

    const payload = {
      reportDate: v.reportDate,
      shift: v.shift,
      stationId: v.stationId,
      customerId: v.customerId || null,
      grade: v.grade,
      slump: v.slump === "" ? null : Number(v.slump),
      plannedVolume: Number(v.plannedVolume || 0),
      actualVolume: Number(v.actualVolume || 0),
      truckCount: Number(v.truckCount || 0),
      tripCount: Number(v.tripCount || 0),
      startTime: v.startTime || null,
      endTime: v.endTime || null,
      supervisorName: v.supervisorName || null,
      incidentNote: v.incidentNote || null,
    };

    try {
      const url = isEdit ? `/api/reports/${initial.id}` : "/api/reports";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; report?: { id: string } };

      if (!res.ok || !data.ok || !data.report) {
        setError(data.error ?? "Không lưu được báo cáo");
        return;
      }

      const reportId = data.report.id;

      if (thenSubmit) {
        const sub = await fetch(`/api/reports/${reportId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "submit" }),
        });
        const subData = (await sub.json()) as {
          ok?: boolean;
          error?: string;
          telegram?: { sent: boolean; skipped: boolean; error: string | null };
        };

        if (!sub.ok || !subData.ok) {
          setError(subData.error ?? "Đã lưu nhưng không gửi được báo cáo");
          router.refresh();
          return;
        }

        const tg = subData.telegram;
        const tgMsg = tg?.sent
          ? "Đã gửi Telegram."
          : tg?.skipped
            ? `Chưa gửi Telegram: ${tg.error ?? "Telegram đang tắt"}.`
            : `Gửi Telegram thất bại: ${tg?.error ?? "không rõ lỗi"}.`;

        setNotice(`Đã gửi báo cáo cho Ban Giám đốc. ${tgMsg}`);
        router.push("/reports");
        router.refresh();
        return;
      }

      router.push("/reports");
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setPending(null);
    }
  }

  const readOnly = !canEdit;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(false);
      }}
      className="space-y-4"
    >
      <div className="card-panel p-4">
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide">Thông tin báo cáo</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Ngày sản xuất *" htmlFor="reportDate">
            <Input
              id="reportDate"
              type="date"
              value={v.reportDate}
              onChange={(e) => set("reportDate", e.target.value)}
              disabled={readOnly}
              required
            />
          </Field>

          <Field label="Ca sản xuất *" htmlFor="shift">
            <Select
              id="shift"
              value={v.shift}
              onChange={(e) => set("shift", e.target.value)}
              disabled={readOnly}
            >
              {Object.entries(SHIFT_LABEL).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Trạm trộn *" htmlFor="stationId">
            <Select
              id="stationId"
              value={v.stationId}
              onChange={(e) => set("stationId", e.target.value)}
              disabled={readOnly}
              required
            >
              <option value="">— Chọn trạm —</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Khách hàng / Công trình" htmlFor="customerId">
            <Select
              id="customerId"
              value={v.customerId}
              onChange={(e) => set("customerId", e.target.value)}
              disabled={readOnly}
            >
              <option value="">— Không gắn —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Mác bê tông *" htmlFor="grade" hint="Ví dụ: M250, M300">
            <Input
              id="grade"
              value={v.grade}
              onChange={(e) => set("grade", e.target.value)}
              placeholder="M250"
              disabled={readOnly}
              required
            />
          </Field>

          <Field label="Độ sụt (cm)" htmlFor="slump">
            <Input
              id="slump"
              type="number"
              min={0}
              max={50}
              value={v.slump}
              onChange={(e) => set("slump", e.target.value)}
              placeholder="14"
              disabled={readOnly}
            />
          </Field>

          <Field label="Người phụ trách" htmlFor="supervisorName">
            <Input
              id="supervisorName"
              value={v.supervisorName}
              onChange={(e) => set("supervisorName", e.target.value)}
              placeholder="Họ và tên"
              disabled={readOnly}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Bắt đầu" htmlFor="startTime">
              <Input
                id="startTime"
                type="time"
                value={v.startTime}
                onChange={(e) => set("startTime", e.target.value)}
                disabled={readOnly}
              />
            </Field>
            <Field label="Kết thúc" htmlFor="endTime">
              <Input
                id="endTime"
                type="time"
                value={v.endTime}
                onChange={(e) => set("endTime", e.target.value)}
                disabled={readOnly}
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="card-panel p-4">
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide">Sản lượng & vận chuyển</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Khối lượng kế hoạch (m³) *" htmlFor="plannedVolume">
            <Input
              id="plannedVolume"
              type="number"
              step="0.1"
              min={0}
              value={v.plannedVolume}
              onChange={(e) => set("plannedVolume", e.target.value)}
              disabled={readOnly}
              required
            />
          </Field>

          <Field label="Khối lượng thực tế (m³) *" htmlFor="actualVolume">
            <Input
              id="actualVolume"
              type="number"
              step="0.1"
              min={0}
              value={v.actualVolume}
              onChange={(e) => set("actualVolume", e.target.value)}
              disabled={readOnly}
              required
            />
          </Field>

          <Field label="Số lượng xe" htmlFor="truckCount">
            <Input
              id="truckCount"
              type="number"
              min={0}
              value={v.truckCount}
              onChange={(e) => set("truckCount", e.target.value)}
              disabled={readOnly}
            />
          </Field>

          <Field label="Số chuyến" htmlFor="tripCount">
            <Input
              id="tripCount"
              type="number"
              min={0}
              value={v.tripCount}
              onChange={(e) => set("tripCount", e.target.value)}
              disabled={readOnly}
            />
          </Field>
        </div>

        <div className="mt-3">
          <Field label="Ghi chú sự cố" htmlFor="incidentNote">
            <Textarea
              id="incidentNote"
              value={v.incidentNote}
              onChange={(e) => set("incidentNote", e.target.value)}
              placeholder="Mô tả sự cố trong ca (nếu có)"
              disabled={readOnly}
            />
          </Field>
        </div>

        {Number(v.plannedVolume) > 0 ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Tỷ lệ hoàn thành:{" "}
            <span className="font-semibold text-foreground">
              {Math.round((Number(v.actualVolume) / Number(v.plannedVolume)) * 100)}%
            </span>
          </p>
        ) : null}
      </div>

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-[13px] text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-md border border-success/25 bg-success/10 px-3 py-2 text-[13px] text-success">
          {notice}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="outline" disabled={readOnly || pending !== null}>
          {pending === "save" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isEdit ? "Lưu thay đổi" : "Lưu bản nháp"}
        </Button>

        {canSubmit ? (
          <Button
            type="button"
            onClick={() => save(true)}
            disabled={readOnly || pending !== null}
          >
            {pending === "submit" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Lưu & gửi Ban Giám đốc
          </Button>
        ) : null}

        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/reports")}
          disabled={pending !== null}
        >
          Hủy
        </Button>
      </div>
    </form>
  );
}
