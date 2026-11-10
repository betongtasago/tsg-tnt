"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Save, Loader2, RotateCcw, Printer, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MonthRow = {
  driverId: string;
  driverCode: string;
  driverName: string;
  stationCode: string;
  vehiclePlate: string;
  taiNgay: number | null;
  timeValue: number | null;
  leaveRepair: string;
  note: string;
  lan1: number;
  lan2: number;
  lan3: number;
  odometer: number | null;
  tireDate: string;
};

const MONTH_NAMES = [
  "THÁNG 1", "THÁNG 2", "THÁNG 3", "THÁNG 4", "THÁNG 5", "THÁNG 6",
  "THÁNG 7", "THÁNG 8", "THÁNG 9", "THÁNG 10", "THÁNG 11", "THÁNG 12",
];

const fmtNum = (n: number | null) =>
  n === null || n === undefined || Number.isNaN(n)
    ? ""
    : new Intl.NumberFormat("vi-VN").format(n);

const fmtDate = (s: string) => {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return d && m && y ? `${d}/${m}/${y}` : "";
};

/** Ô nhập gọn, không viền, khớp mẫu Excel */
function Cell({
  value,
  onChange,
  type = "text",
  align = "center",
  disabled,
  className,
  placeholder,
}: {
  value: string | number | null;
  onChange: (v: string) => void;
  type?: "text" | "number" | "date";
  align?: "left" | "center" | "right";
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value === null || value === undefined ? "" : String(value)}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className={cn(
        "h-8 w-full border-0 bg-transparent px-1.5 text-[12.5px] outline-none",
        "focus:bg-primary/10 focus:ring-1 focus:ring-inset focus:ring-primary",
        "disabled:cursor-not-allowed disabled:opacity-60",
        align === "left" && "text-left",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className
      )}
    />
  );
}

export function MonthLogClient({
  initialYear,
  initialMonth,
  initialRows,
  canUpdate,
  canExport,
  companyName,
}: {
  initialYear: number;
  initialMonth: number;
  initialRows: MonthRow[];
  canUpdate: boolean;
  canExport: boolean;
  companyName: string;
}) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [rows, setRows] = useState<MonthRow[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (y: number, m: number) => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/month-log?year=${y}&month=${m}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Không tải được bảng");
      setRows(data.rows ?? []);
      setDirty(false);
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Lỗi tải dữ liệu" });
    } finally {
      setLoading(false);
    }
  }, []);

  const firstRun = useRef(true);

  useEffect(() => {
    // Dữ liệu tháng hiện tại đã có sẵn từ server: chỉ tải khi người dùng đổi tháng/năm.
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    load(year, month);
  }, [year, month, load]);

  const patch = (driverId: string, key: keyof MonthRow, raw: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.driverId !== driverId) return r;
        let v: string | number | null = raw;
        if (key === "taiNgay" || key === "timeValue" || key === "odometer") {
          v = raw === "" ? null : Number(raw.replace(",", "."));
          if (typeof v === "number" && Number.isNaN(v)) v = null;
        }
        if (key === "lan1" || key === "lan2" || key === "lan3") {
          v = raw === "" ? 0 : Math.max(0, Math.floor(Number(raw) || 0));
        }
        return { ...r, [key]: v };
      })
    );
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/month-log", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lưu thất bại");
      setDirty(false);
      setMsg({ kind: "ok", text: `Đã lưu ${data.saved} dòng` });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Lỗi lưu" });
    } finally {
      setSaving(false);
    }
  };

  const totals = useMemo(() => {
    const sum = (f: (r: MonthRow) => number | null) =>
      rows.reduce((a, r) => a + (f(r) ?? 0), 0);
    return {
      taiNgay: sum((r) => r.taiNgay),
      time: sum((r) => r.timeValue),
      lan1: sum((r) => r.lan1),
      lan2: sum((r) => r.lan2),
      lan3: sum((r) => r.lan3),
      odometer: sum((r) => r.odometer),
    };
  }, [rows]);

  const exportExcel = () => {
    // Xuất CSV có BOM để Excel đọc đúng tiếng Việt
    const head = [
      "STT", "TRẠM", "MÃ XE", "TÊN TÀI XẾ", "SỐ XE", "TÀI NGÀY", "TIME",
      "PHÉP / SỬA CHỮA", "LƯU Ý", "LẦN 1", "LẦN 2", "LẦN 3", "XÁC XE", "NGÀY XOAY VỎ",
    ];
    const body = rows.map((r, i) => [
      i + 1, r.stationCode, r.driverCode, r.driverName, r.vehiclePlate,
      r.taiNgay ?? "", r.timeValue ?? "", r.leaveRepair, r.note,
      r.lan1, r.lan2, r.lan3, r.odometer ?? "", fmtDate(r.tireDate),
    ]);
    const csv = [head, ...body]
      .map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `TSG-TNT_BangTai_${year}-${String(month).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const years = Array.from({ length: 5 }, (_, i) => initialYear - 2 + i);

  return (
    <div className="space-y-3">
      {/* Thanh công cụ — ẩn khi in */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="h-9 rounded-md border border-border bg-background px-2.5 text-[13px]"
        >
          {MONTH_NAMES.map((n, i) => (
            <option key={i} value={i + 1}>{n}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="h-9 rounded-md border border-border bg-background px-2.5 text-[13px]"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {canUpdate && (
          <Button onClick={save} disabled={saving || !dirty} size="sm">
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            {saving ? "Đang lưu…" : dirty ? "Lưu thay đổi" : "Đã lưu"}
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => load(year, month)} disabled={loading}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Tải lại
        </Button>
        {canExport && (
          <>
            <Button variant="outline" size="sm" onClick={exportExcel}>
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-1.5 h-3.5 w-3.5" /> In
            </Button>
          </>
        )}

        {msg && (
          <span
            className={cn(
              "text-[12px] font-medium",
              msg.kind === "ok" ? "text-success" : "text-danger"
            )}
          >
            {msg.text}
          </span>
        )}
        {dirty && !msg && (
          <span className="text-[12px] text-warning">Có thay đổi chưa lưu</span>
        )}
      </div>

      {/* Bảng */}
      <div ref={printRef} className="month-log-print overflow-x-auto rounded-lg border border-border bg-white print:overflow-visible print:border-0">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải bảng…
          </div>
        ) : (
          <table className="w-full border-collapse text-[12.5px]">
            <colgroup>
              <col style={{ width: 34 }} />
              <col style={{ width: 46 }} />
              <col style={{ width: 52 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 92 }} />
              <col style={{ width: 68 }} />
              <col style={{ width: 58 }} />
              <col style={{ width: 96 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 40 }} />
              <col style={{ width: 40 }} />
              <col style={{ width: 40 }} />
              <col style={{ width: 74 }} />
              <col style={{ width: 84 }} />
            </colgroup>

            {/* Tiêu đề công ty */}
            <thead>
              <tr>
                <td colSpan={14} className="border border-[#8aa89a] bg-[#1f6b47] px-3 py-2 text-center">
                  <div className="text-[17px] font-bold uppercase tracking-wide text-white">
                    BẢNG THEO DÕI TÀI XẾ BỒN TSG–TNT
                  </div>
                  <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#cfe6da]">
                    {MONTH_NAMES[month - 1]} • {year} • QUẢN LÝ LỊCH TÀI XẾ – PHÉP – SỬA CHỮA – XÁC XE
                  </div>
                </td>
              </tr>

              {/* Hàng nhóm cột */}
              <tr className="bg-[#2d7a55] text-white">
                <th colSpan={5} className="border border-[#8aa89a] py-1 text-[11px] font-bold uppercase">
                  Thông tin tài xế
                </th>
                <th colSpan={4} className="border border-[#8aa89a] py-1 text-[11px] font-bold uppercase">
                  Lịch {MONTH_NAMES[month - 1].toLowerCase()}/{year}
                </th>
                <th colSpan={3} className="border border-[#8aa89a] bg-[#6b7a3a] py-1 text-[10.5px] font-bold uppercase leading-tight">
                  Theo dõi nghỉ 1 buổi
                  <div className="font-normal normal-case">(3 buổi tính 1 phép)</div>
                </th>
                <th colSpan={2} className="border border-[#8aa89a] bg-[#4a6b3a] py-1 text-[11px] font-bold uppercase">
                  Theo dõi xác xe
                </th>
              </tr>

              {/* Hàng tên cột */}
              <tr className="bg-[#2d7a55] text-white">
                {["STT", "TRẠM", "MÃ XE", "TÊN TÀI XẾ", "SỐ XE"].map((h) => (
                  <th key={h} className="border border-[#8aa89a] px-1 py-1 text-[10.5px] font-bold uppercase">
                    {h}
                  </th>
                ))}
                {["TÀI NGÀY", "TIME", "PHÉP / SỬA CHỮA", "LƯU Ý"].map((h) => (
                  <th key={h} className="border border-[#8aa89a] px-1 py-1 text-[10.5px] font-bold uppercase">
                    {h}
                  </th>
                ))}
                {["LẦN 1", "LẦN 2", "LẦN 3"].map((h) => (
                  <th key={h} className="border border-[#8aa89a] bg-[#6b7a3a] px-1 py-1 text-[10.5px] font-bold uppercase">
                    {h}
                  </th>
                ))}
                {["XÁC XE", "NGÀY XOAY VỎ"].map((h) => (
                  <th key={h} className="border border-[#8aa89a] bg-[#4a6b3a] px-1 py-1 text-[10.5px] font-bold uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={14} className="border border-[#c9d6cf] py-10 text-center text-muted-foreground">
                    Chưa có tài xế nào đang làm việc.
                  </td>
                </tr>
              )}

              {rows.map((r, i) => (
                <tr key={r.driverId} className={i % 2 === 1 ? "bg-[#f4f8f5]" : "bg-white"}>
                  <td className="border border-[#c9d6cf] text-center text-[11.5px] text-slate-600">{i + 1}</td>
                  <td className="border border-[#c9d6cf] px-1 text-center text-[11.5px] font-medium">
                    {r.stationCode}
                  </td>
                  <td className="border border-[#c9d6cf] px-1 text-center text-[11.5px] font-semibold">
                    {r.driverCode}
                  </td>
                  <td className="border border-[#c9d6cf] px-1.5 text-left text-[12.5px] font-medium text-slate-800">
                    {r.driverName}
                  </td>
                  <td className="border border-[#c9d6cf] px-1 text-center text-[12px] tabular-nums">
                    {r.vehiclePlate}
                  </td>

                  <td className="border border-[#c9d6cf] p-0">
                    <Cell value={r.taiNgay} onChange={(v) => patch(r.driverId, "taiNgay", v)} type="number" disabled={!canUpdate} />
                  </td>
                  <td className="border border-[#c9d6cf] p-0">
                    <Cell value={r.timeValue} onChange={(v) => patch(r.driverId, "timeValue", v)} type="number" disabled={!canUpdate} />
                  </td>
                  <td className="border border-[#c9d6cf] p-0">
                    <Cell value={r.leaveRepair} onChange={(v) => patch(r.driverId, "leaveRepair", v)} align="left" disabled={!canUpdate} />
                  </td>
                  <td className="border border-[#c9d6cf] p-0">
                    <Cell value={r.note} onChange={(v) => patch(r.driverId, "note", v)} align="left" disabled={!canUpdate} />
                  </td>

                  <td className="border border-[#c9d6cf] bg-[#f7faf3] p-0">
                    <Cell value={r.lan1} onChange={(v) => patch(r.driverId, "lan1", v)} type="number" disabled={!canUpdate} />
                  </td>
                  <td className="border border-[#c9d6cf] bg-[#f7faf3] p-0">
                    <Cell value={r.lan2} onChange={(v) => patch(r.driverId, "lan2", v)} type="number" disabled={!canUpdate} />
                  </td>
                  <td className="border border-[#c9d6cf] bg-[#f7faf3] p-0">
                    <Cell value={r.lan3} onChange={(v) => patch(r.driverId, "lan3", v)} type="number" disabled={!canUpdate} />
                  </td>

                  <td className="border border-[#c9d6cf] bg-[#f4f8f0] p-0">
                    <Cell
                      value={r.odometer}
                      onChange={(v) => patch(r.driverId, "odometer", v)}
                      type="number"
                      align="right"
                      disabled={!canUpdate}
                      className="font-semibold"
                    />
                  </td>
                  <td className="border border-[#c9d6cf] bg-[#f4f8f0] p-0">
                    <Cell
                      value={r.tireDate}
                      onChange={(v) => patch(r.driverId, "tireDate", v)}
                      type="date"
                      disabled={!canUpdate}
                      className="text-[11.5px]"
                    />
                  </td>
                </tr>
              ))}
            </tbody>

            {rows.length > 0 && (
              <tfoot>
                <tr className="bg-[#e8f0ea] font-semibold">
                  <td colSpan={5} className="border border-[#8aa89a] px-2 py-1.5 text-right text-[11.5px] uppercase">
                    Tổng cộng
                  </td>
                  <td className="border border-[#8aa89a] text-center text-[12px] tabular-nums">{fmtNum(totals.taiNgay) || "0"}</td>
                  <td className="border border-[#8aa89a] text-center text-[12px] tabular-nums">{fmtNum(totals.time) || "0"}</td>
                  <td colSpan={2} className="border border-[#8aa89a]" />
                  <td className="border border-[#8aa89a] bg-[#dfe9d8] text-center text-[12px] tabular-nums">{totals.lan1}</td>
                  <td className="border border-[#8aa89a] bg-[#dfe9d8] text-center text-[12px] tabular-nums">{totals.lan2}</td>
                  <td className="border border-[#8aa89a] bg-[#dfe9d8] text-center text-[12px] tabular-nums">{totals.lan3}</td>
                  <td className="border border-[#8aa89a] bg-[#dfe9d8] text-right text-[12px] tabular-nums">{fmtNum(totals.odometer) || "0"}</td>
                  <td className="border border-[#8aa89a]" />
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground print:hidden">
        Ghi chú: 3 buổi nghỉ tính 1 phép. Cột XÁC XE ghi số đồng hồ, NGÀY XOAY VỎ ghi ngày thay/xoay vỏ gần nhất.
      </p>

      <div className="hidden text-center text-[11px] print:block">
        {companyName} — Bảng theo dõi tài xế {MONTH_NAMES[month - 1]}/{year}
      </div>
    </div>
  );
}
