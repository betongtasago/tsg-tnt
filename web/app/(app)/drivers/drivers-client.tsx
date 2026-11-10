"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Download, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR, EmptyRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SearchBox, useFilter, useToast } from "@/components/ui/search-box";
import { StatCard } from "@/components/ui/stat-card";
import {
  DRIVER_STATUS_LABEL,
  EXPIRY_LABEL,
  EXPIRY_TONE,
  SHIFT_LABEL,
  expiryLevel,
  fmtDate,
} from "@/lib/utils";
import { IdCard, UserCheck, UserMinus, Users } from "lucide-react";

type Row = {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  stationId: string;
  stationCode: string;
  joinDate: string;
  status: string;
  shift: string;
  note: string;
  vehicles: string[];
  licenseClass: string;
  licenseExpiry: string;
};

type Option = { id: string; label: string };

const EMPTY: Omit<Row, "id" | "stationCode" | "vehicles"> = {
  code: "",
  fullName: "",
  phone: "",
  stationId: "",
  joinDate: "",
  status: "WORKING",
  shift: "SANG",
  note: "",
  licenseClass: "",
  licenseExpiry: "",
};

export function DriversClient({
  rows,
  stations,
  canCreate,
  canUpdate,
  canDelete,
  canExport,
}: {
  rows: Row[];
  stations: Option[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
}) {
  const router = useRouter();
  const { show, node: toast } = useToast();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = useCallback(
    (r: Row) => [r.code, r.fullName, r.phone, r.stationCode, ...r.vehicles],
    []
  );

  const filtered = useFilter(rows, query, pick).filter(
    (r) => !statusFilter || r.status === statusFilter
  );

  const stats = {
    total: rows.length,
    working: rows.filter((r) => r.status === "WORKING").length,
    leave: rows.filter((r) => r.status === "LEAVE").length,
    expiringLicense: rows.filter((r) => {
      const lvl = expiryLevel(r.licenseExpiry);
      return lvl === "expired" || lvl === "d3" || lvl === "d7" || lvl === "d15";
    }).length,
  };

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setOpen(true);
  }

  function openEdit(r: Row) {
    setEditing(r);
    setForm({
      code: r.code,
      fullName: r.fullName,
      phone: r.phone,
      stationId: r.stationId,
      joinDate: r.joinDate,
      status: r.status,
      shift: r.shift,
      note: r.note,
      licenseClass: r.licenseClass,
      licenseExpiry: r.licenseExpiry,
    });
    setError(null);
    setOpen(true);
  }

  async function save() {
    setPending(true);
    setError(null);
    try {
      const payload = {
        code: form.code,
        fullName: form.fullName,
        phone: form.phone || null,
        stationId: form.stationId || null,
        joinDate: form.joinDate || null,
        status: form.status,
        shift: form.shift || null,
        note: form.note || null,
      };

      const res = await fetch(editing ? `/api/drivers/${editing.id}` : "/api/drivers", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; driver?: { id: string } };

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Không lưu được tài xế");
        return;
      }

      // Cập nhật GPLX nếu có nhập
      if (form.licenseExpiry && data.driver) {
        await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entity: "DRIVER",
            docType: "GPLX",
            driverId: data.driver.id,
            licenseClass: form.licenseClass || null,
            expiryDate: form.licenseExpiry,
            number: `GPLX-${form.code}`,
          }),
        });
      }

      setOpen(false);
      show(editing ? "Đã cập nhật tài xế" : "Đã thêm tài xế");
      router.refresh();
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setPending(false);
    }
  }

  async function remove(r: Row) {
    if (!confirm(`Xóa tài xế ${r.fullName} (${r.code})?`)) return;
    const res = await fetch(`/api/drivers/${r.id}`, { method: "DELETE" });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      show(data.error ?? "Không xóa được", "error");
      return;
    }
    show("Đã xóa tài xế");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {toast}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Tổng tài xế" value={stats.total} />
        <StatCard icon={UserCheck} label="Đang làm việc" value={stats.working} tone="success" />
        <StatCard icon={UserMinus} label="Nghỉ phép" value={stats.leave} tone="warning" />
        <StatCard
          icon={IdCard}
          label="GPLX sắp hết hạn"
          value={stats.expiringLicense}
          tone={stats.expiringLicense > 0 ? "danger" : "success"}
          hint="Trong 15 ngày tới"
        />
      </section>

      <div className="no-print flex flex-wrap items-center gap-2">
        <SearchBox
          value={query}
          onChange={setQuery}
          placeholder="Tìm theo tên, mã, SĐT, biển số…"
          className="w-full sm:w-72"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-44"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="WORKING">Đang làm việc</option>
          <option value="LEAVE">Nghỉ phép</option>
          <option value="RESIGNED">Nghỉ việc</option>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          {canExport ? (
            <a
              href="/api/drivers/export"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent"
            >
              <Download className="h-3.5 w-3.5" /> Xuất Excel
            </a>
          ) : null}
          {canCreate ? (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" /> Thêm tài xế
            </Button>
          ) : null}
        </div>
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Mã</TH>
            <TH>Họ và tên</TH>
            <TH>Điện thoại</TH>
            <TH>Trạm</TH>
            <TH>Xe phụ trách</TH>
            <TH>Ca</TH>
            <TH>Vào làm</TH>
            <TH>Hạng GPLX</TH>
            <TH>Hạn GPLX</TH>
            <TH>Trạng thái</TH>
            <TH className="text-right">Thao tác</TH>
          </TR>
        </THead>
        <TBody>
          {filtered.length === 0 ? (
            <EmptyRow colSpan={11} message="Không có tài xế nào khớp bộ lọc." />
          ) : (
            filtered.map((r) => {
              const lvl = expiryLevel(r.licenseExpiry);
              return (
                <TR key={r.id}>
                  <TD className="whitespace-nowrap font-medium">{r.code}</TD>
                  <TD className="whitespace-nowrap font-medium">{r.fullName}</TD>
                  <TD className="whitespace-nowrap text-muted-foreground">{r.phone || "—"}</TD>
                  <TD className="whitespace-nowrap">{r.stationCode}</TD>
                  <TD className="max-w-[160px] truncate text-muted-foreground">
                    {r.vehicles.length ? r.vehicles.join(", ") : "—"}
                  </TD>
                  <TD className="whitespace-nowrap text-muted-foreground">
                    {r.shift ? SHIFT_LABEL[r.shift] : "—"}
                  </TD>
                  <TD className="whitespace-nowrap text-muted-foreground">
                    {r.joinDate ? fmtDate(r.joinDate) : "—"}
                  </TD>
                  <TD className="whitespace-nowrap">{r.licenseClass || "—"}</TD>
                  <TD className="whitespace-nowrap">
                    {r.licenseExpiry ? (
                      <Badge tone={EXPIRY_TONE[lvl]}>
                        {fmtDate(r.licenseExpiry)} · {EXPIRY_LABEL[lvl]}
                      </Badge>
                    ) : (
                      <Badge tone="muted">Chưa cập nhật</Badge>
                    )}
                  </TD>
                  <TD>
                    <Badge
                      tone={
                        r.status === "WORKING"
                          ? "success"
                          : r.status === "LEAVE"
                            ? "warning"
                            : "muted"
                      }
                    >
                      {DRIVER_STATUS_LABEL[r.status]}
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
        title={editing ? `Sửa tài xế — ${editing.code}` : "Thêm tài xế mới"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Hủy
            </Button>
            <Button onClick={save} disabled={pending || !form.code || !form.fullName}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editing ? "Lưu thay đổi" : "Thêm tài xế"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Mã tài xế *">
            <Input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="TX011"
            />
          </Field>
          <Field label="Họ và tên *">
            <Input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Nguyễn Văn A"
            />
          </Field>
          <Field label="Số điện thoại">
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="09xx xxx xxx"
            />
          </Field>
          <Field label="Trạm làm việc">
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
          <Field label="Ngày vào làm">
            <Input
              type="date"
              value={form.joinDate}
              onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
            />
          </Field>
          <Field label="Ca làm việc">
            <Select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })}>
              <option value="">— Không cố định —</option>
              <option value="SANG">Ca sáng</option>
              <option value="CHIEU">Ca chiều</option>
              <option value="DEM">Ca đêm</option>
            </Select>
          </Field>
          <Field label="Tình trạng làm việc">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="WORKING">Đang làm việc</option>
              <option value="LEAVE">Nghỉ phép</option>
              <option value="RESIGNED">Nghỉ việc</option>
            </Select>
          </Field>
          <Field label="Hạng GPLX">
            <Input
              value={form.licenseClass}
              onChange={(e) => setForm({ ...form, licenseClass: e.target.value })}
              placeholder="C"
            />
          </Field>
          <Field label="Ngày hết hạn GPLX">
            <Input
              type="date"
              value={form.licenseExpiry}
              onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Ghi chú">
              <Textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Ghi chú thêm về tài xế"
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
