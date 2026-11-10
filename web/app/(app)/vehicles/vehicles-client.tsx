"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Download, Loader2, Pencil, Plus, Trash2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR, EmptyRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SearchBox, useFilter, useToast } from "@/components/ui/search-box";
import { StatCard } from "@/components/ui/stat-card";
import {
  EXPIRY_LABEL,
  EXPIRY_TONE,
  VEHICLE_STATUS_LABEL,
  VEHICLE_TYPE_LABEL,
  expiryLevel,
  fmtDate,
  fmtNum,
} from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Wrench } from "lucide-react";

type Row = {
  id: string;
  plate: string;
  code: string;
  type: string;
  brand: string;
  year: number | null;
  capacity: number | null;
  driverId: string;
  driverName: string;
  stationId: string;
  stationCode: string;
  status: string;
  registrationDate: string;
  registrationExpiry: string;
  insuranceExpiry: string;
  note: string;
};

type Option = { id: string; label: string };

const EMPTY = {
  plate: "",
  code: "",
  type: "BON",
  brand: "",
  year: "",
  capacity: "",
  driverId: "",
  stationId: "",
  status: "ACTIVE",
  registrationDate: "",
  registrationExpiry: "",
  insuranceExpiry: "",
  note: "",
};

export function VehiclesClient({
  rows,
  stations,
  drivers,
  canCreate,
  canUpdate,
  canDelete,
  canExport,
}: {
  rows: Row[];
  stations: Option[];
  drivers: Option[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
}) {
  const router = useRouter();
  const { show, node: toast } = useToast();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = useCallback((r: Row) => [r.plate, r.code, r.brand, r.driverName, r.stationCode], []);
  const filtered = useFilter(rows, query, pick)
    .filter((r) => !statusFilter || r.status === statusFilter)
    .filter((r) => !typeFilter || r.type === typeFilter);

  const stats = {
    total: rows.length,
    active: rows.filter((r) => r.status === "ACTIVE").length,
    down: rows.filter((r) => ["REPAIR", "MAINTENANCE"].includes(r.status)).length,
    expiring: rows.filter((r) => {
      const a = expiryLevel(r.registrationExpiry);
      const b = expiryLevel(r.insuranceExpiry);
      return ["expired", "d3", "d7", "d15"].includes(a) || ["expired", "d3", "d7", "d15"].includes(b);
    }).length,
  };

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY, stationId: stations[0]?.id ?? "" });
    setError(null);
    setOpen(true);
  }

  function openEdit(r: Row) {
    setEditing(r);
    setForm({
      plate: r.plate,
      code: r.code,
      type: r.type,
      brand: r.brand,
      year: r.year ? String(r.year) : "",
      capacity: r.capacity ? String(r.capacity) : "",
      driverId: r.driverId,
      stationId: r.stationId,
      status: r.status,
      registrationDate: r.registrationDate,
      registrationExpiry: r.registrationExpiry,
      insuranceExpiry: r.insuranceExpiry,
      note: r.note,
    });
    setError(null);
    setOpen(true);
  }

  async function save() {
    setPending(true);
    setError(null);
    try {
      const payload = {
        plate: form.plate,
        code: form.code || null,
        type: form.type,
        brand: form.brand || null,
        year: form.year ? Number(form.year) : null,
        capacity: form.capacity ? Number(form.capacity) : null,
        driverId: form.driverId || null,
        stationId: form.stationId || null,
        status: form.status,
        registrationDate: form.registrationDate || null,
        registrationExpiry: form.registrationExpiry || null,
        insuranceExpiry: form.insuranceExpiry || null,
        note: form.note || null,
      };

      const res = await fetch(editing ? `/api/vehicles/${editing.id}` : "/api/vehicles", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; vehicle?: { id: string } };

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Không lưu được phương tiện");
        return;
      }

      // Đồng bộ hồ sơ đăng kiểm + bảo hiểm vào bảng Document để cảnh báo hạn dùng chung
      if (data.vehicle) {
        for (const [docType, expiry] of [
          ["DANG_KIEM", form.registrationExpiry],
          ["BAO_HIEM_TNDS", form.insuranceExpiry],
        ] as const) {
          if (!expiry) continue;
          await fetch("/api/documents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              entity: "VEHICLE",
              docType,
              vehicleId: data.vehicle.id,
              expiryDate: expiry,
              issuedDate: form.registrationDate || null,
              number: `${docType === "DANG_KIEM" ? "DK" : "BH"}-${form.plate}`,
            }),
          });
        }
      }

      setOpen(false);
      show(editing ? "Đã cập nhật phương tiện" : "Đã thêm phương tiện");
      router.refresh();
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setPending(false);
    }
  }

  async function remove(r: Row) {
    if (!confirm(`Xóa phương tiện ${r.plate}?`)) return;
    const res = await fetch(`/api/vehicles/${r.id}`, { method: "DELETE" });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      show(data.error ?? "Không xóa được", "error");
      return;
    }
    show("Đã xóa phương tiện");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {toast}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Truck} label="Tổng phương tiện" value={stats.total} />
        <StatCard icon={CheckCircle2} label="Đang hoạt động" value={stats.active} tone="success" />
        <StatCard icon={Wrench} label="Sửa chữa / bảo dưỡng" value={stats.down} tone="warning" />
        <StatCard
          icon={AlertTriangle}
          label="Giấy tờ cần xử lý"
          value={stats.expiring}
          tone={stats.expiring > 0 ? "danger" : "success"}
          hint="Đăng kiểm hoặc bảo hiểm ≤ 15 ngày"
        />
      </section>

      <div className="no-print flex flex-wrap items-center gap-2">
        <SearchBox
          value={query}
          onChange={setQuery}
          placeholder="Tìm biển số, mã, nhãn hiệu, tài xế…"
          className="w-full sm:w-72"
        />
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full sm:w-40">
          <option value="">Tất cả loại xe</option>
          {Object.entries(VEHICLE_TYPE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-44"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(VEHICLE_STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>

        <div className="ml-auto flex items-center gap-2">
          {canExport ? (
            <a
              href="/api/vehicles/export"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent"
            >
              <Download className="h-3.5 w-3.5" /> Xuất Excel
            </a>
          ) : null}
          {canCreate ? (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" /> Thêm xe
            </Button>
          ) : null}
        </div>
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Biển số</TH>
            <TH>Mã</TH>
            <TH>Loại</TH>
            <TH>Nhãn hiệu</TH>
            <TH className="text-right">Tải trọng</TH>
            <TH>Tài xế</TH>
            <TH>Trạm</TH>
            <TH>Đăng kiểm</TH>
            <TH>Bảo hiểm</TH>
            <TH>Trạng thái</TH>
            <TH className="text-right">Thao tác</TH>
          </TR>
        </THead>
        <TBody>
          {filtered.length === 0 ? (
            <EmptyRow colSpan={11} message="Không có phương tiện nào khớp bộ lọc." />
          ) : (
            filtered.map((r) => {
              const regLvl = expiryLevel(r.registrationExpiry);
              const insLvl = expiryLevel(r.insuranceExpiry);
              return (
                <TR key={r.id}>
                  <TD className="whitespace-nowrap font-semibold">{r.plate}</TD>
                  <TD className="whitespace-nowrap text-muted-foreground">{r.code || "—"}</TD>
                  <TD className="whitespace-nowrap">{VEHICLE_TYPE_LABEL[r.type]}</TD>
                  <TD className="whitespace-nowrap text-muted-foreground">
                    {r.brand || "—"}
                    {r.year ? ` · ${r.year}` : ""}
                  </TD>
                  <TD className="whitespace-nowrap text-right tabular-nums">
                    {r.capacity ? `${fmtNum(r.capacity, 0)} m³` : "—"}
                  </TD>
                  <TD className="max-w-[170px] truncate">{r.driverName || "—"}</TD>
                  <TD className="whitespace-nowrap">{r.stationCode}</TD>
                  <TD className="whitespace-nowrap">
                    {r.registrationExpiry ? (
                      <Badge tone={EXPIRY_TONE[regLvl]}>{fmtDate(r.registrationExpiry)}</Badge>
                    ) : (
                      <Badge tone="muted">Chưa có</Badge>
                    )}
                  </TD>
                  <TD className="whitespace-nowrap">
                    {r.insuranceExpiry ? (
                      <Badge tone={EXPIRY_TONE[insLvl]}>{fmtDate(r.insuranceExpiry)}</Badge>
                    ) : (
                      <Badge tone="muted">Chưa có</Badge>
                    )}
                  </TD>
                  <TD>
                    <Badge
                      tone={
                        r.status === "ACTIVE"
                          ? "success"
                          : r.status === "REPAIR"
                            ? "danger"
                            : r.status === "MAINTENANCE"
                              ? "warning"
                              : "muted"
                      }
                    >
                      {VEHICLE_STATUS_LABEL[r.status]}
                    </Badge>
                  </TD>
                  <TD>
                    <div className="flex items-center justify-end gap-1">
                      {canUpdate ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(r)}
                          aria-label="Sửa"
                          title="Sửa"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => remove(r)}
                          aria-label="Xóa"
                          title="Xóa"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </TD>
                </TR>
              );
            })
          )}
        </TBody>
      </Table>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Sửa phương tiện — ${editing.plate}` : "Thêm phương tiện mới"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Hủy
            </Button>
            <Button onClick={save} disabled={pending || !form.plate}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editing ? "Lưu thay đổi" : "Thêm xe"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Biển số xe *">
            <Input
              value={form.plate}
              onChange={(e) => setForm({ ...form, plate: e.target.value })}
              placeholder="51C-123.45"
            />
          </Field>
          <Field label="Mã phương tiện">
            <Input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="BON09"
            />
          </Field>
          <Field label="Loại phương tiện">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {Object.entries(VEHICLE_TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nhãn hiệu">
            <Input
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              placeholder="Hyundai"
            />
          </Field>
          <Field label="Năm sản xuất">
            <Input
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              placeholder="2022"
            />
          </Field>
          <Field label="Tải trọng (m³)">
            <Input
              type="number"
              step="0.1"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              placeholder="10"
            />
          </Field>
          <Field label="Tài xế phụ trách">
            <Select
              value={form.driverId}
              onChange={(e) => setForm({ ...form, driverId: e.target.value })}
            >
              <option value="">— Chưa phân công —</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Trạm quản lý">
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
          <Field label="Tình trạng hoạt động">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {Object.entries(VEHICLE_STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ngày đăng kiểm">
            <Input
              type="date"
              value={form.registrationDate}
              onChange={(e) => setForm({ ...form, registrationDate: e.target.value })}
            />
          </Field>
          <Field label="Hạn đăng kiểm">
            <Input
              type="date"
              value={form.registrationExpiry}
              onChange={(e) => setForm({ ...form, registrationExpiry: e.target.value })}
            />
          </Field>
          <Field label="Hạn bảo hiểm">
            <Input
              type="date"
              value={form.insuranceExpiry}
              onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Ghi chú">
              <Textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Tình trạng xe, lịch sửa chữa…"
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
    </div>
  );
}
