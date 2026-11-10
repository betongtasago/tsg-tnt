"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR, EmptyRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SearchBox, useFilter, useToast } from "@/components/ui/search-box";
import { DOC_TYPE_LABEL, EXPIRY_LABEL, EXPIRY_TONE, expiryLevel, fmtDate } from "@/lib/utils";

type Row = {
  id: string;
  docType: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleCode: string;
  number: string;
  issuedDate: string;
  expiryDate: string;
  note: string;
};

type Option = { id: string; label: string };

const VEHICLE_DOC_TYPES = ["DANG_KIEM", "BAO_HIEM_TNDS", "BAO_HIEM_VAT_CHAT", "PHU_HIEU", "KHAC"];

export function DocumentsClient({
  rows,
  vehicles,
  canCreate,
  canUpdate,
  canDelete,
}: {
  rows: Row[];
  vehicles: Option[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const { show, node: toast } = useToast();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    docType: "DANG_KIEM",
    vehicleId: "",
    number: "",
    issuedDate: "",
    expiryDate: "",
    note: "",
  });

  const pick = useCallback((r: Row) => [r.vehiclePlate, r.vehicleCode, r.number, DOC_TYPE_LABEL[r.docType]], []);
  const filtered = useFilter(rows, query, pick)
    .filter((r) => !typeFilter || r.docType === typeFilter)
    .filter((r) => {
      if (!levelFilter) return true;
      const lvl = expiryLevel(r.expiryDate);
      if (levelFilter === "soon") return ["d3", "d7", "d15", "d30"].includes(lvl);
      return lvl === levelFilter;
    });

  function openCreate() {
    setEditing(null);
    setForm({
      docType: "DANG_KIEM",
      vehicleId: vehicles[0]?.id ?? "",
      number: "",
      issuedDate: "",
      expiryDate: "",
      note: "",
    });
    setError(null);
    setOpen(true);
  }

  function openEdit(r: Row) {
    setEditing(r);
    setForm({
      docType: r.docType,
      vehicleId: r.vehicleId,
      number: r.number,
      issuedDate: r.issuedDate,
      expiryDate: r.expiryDate,
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
        entity: "VEHICLE",
        docType: form.docType,
        vehicleId: form.vehicleId,
        number: form.number || null,
        issuedDate: form.issuedDate || null,
        expiryDate: form.expiryDate || null,
        note: form.note || null,
      };

      const res = await fetch(editing ? `/api/documents/${editing.id}` : "/api/documents", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Không lưu được giấy tờ");
        return;
      }

      setOpen(false);
      show(editing ? "Đã cập nhật giấy tờ" : "Đã thêm giấy tờ");
      router.refresh();
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setPending(false);
    }
  }

  async function remove(r: Row) {
    if (!confirm(`Xóa giấy tờ ${DOC_TYPE_LABEL[r.docType]} của xe ${r.vehiclePlate}?`)) return;
    const res = await fetch(`/api/documents/${r.id}`, { method: "DELETE" });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      show(data.error ?? "Không xóa được", "error");
      return;
    }
    show("Đã xóa giấy tờ");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {toast}

      <div className="no-print flex flex-wrap items-center gap-2">
        <SearchBox
          value={query}
          onChange={setQuery}
          placeholder="Tìm biển số, số giấy tờ…"
          className="w-full sm:w-64"
        />
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full sm:w-48">
          <option value="">Tất cả loại giấy tờ</option>
          {VEHICLE_DOC_TYPES.map((t) => (
            <option key={t} value={t}>
              {DOC_TYPE_LABEL[t]}
            </option>
          ))}
        </Select>
        <Select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="w-full sm:w-44">
          <option value="">Mọi tình trạng</option>
          <option value="expired">Đã hết hạn</option>
          <option value="soon">Sắp hết hạn (≤30 ngày)</option>
          <option value="ok">Còn hiệu lực</option>
          <option value="none">Chưa cập nhật</option>
        </Select>

        {canCreate ? (
          <Button size="sm" className="ml-auto" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> Thêm giấy tờ
          </Button>
        ) : null}
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Phương tiện</TH>
            <TH>Loại giấy tờ</TH>
            <TH>Số giấy tờ</TH>
            <TH>Ngày cấp</TH>
            <TH>Ngày hết hạn</TH>
            <TH>Tình trạng</TH>
            <TH>Ghi chú</TH>
            <TH className="text-right">Thao tác</TH>
          </TR>
        </THead>
        <TBody>
          {filtered.length === 0 ? (
            <EmptyRow colSpan={8} message="Không có giấy tờ nào khớp bộ lọc." />
          ) : (
            filtered.map((r) => {
              const lvl = expiryLevel(r.expiryDate);
              return (
                <TR key={r.id}>
                  <TD className="whitespace-nowrap font-medium">
                    {r.vehiclePlate}
                    {r.vehicleCode ? (
                      <span className="ml-1 text-[11px] text-muted-foreground">({r.vehicleCode})</span>
                    ) : null}
                  </TD>
                  <TD className="whitespace-nowrap">{DOC_TYPE_LABEL[r.docType]}</TD>
                  <TD className="whitespace-nowrap text-muted-foreground">{r.number || "—"}</TD>
                  <TD className="whitespace-nowrap text-muted-foreground">
                    {r.issuedDate ? fmtDate(r.issuedDate) : "—"}
                  </TD>
                  <TD className="whitespace-nowrap font-medium">
                    {r.expiryDate ? fmtDate(r.expiryDate) : "—"}
                  </TD>
                  <TD>
                    <Badge tone={EXPIRY_TONE[lvl]}>{EXPIRY_LABEL[lvl]}</Badge>
                  </TD>
                  <TD className="max-w-[220px] truncate text-muted-foreground">{r.note || "—"}</TD>
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
        title={editing ? "Sửa giấy tờ phương tiện" : "Thêm giấy tờ phương tiện"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Hủy
            </Button>
            <Button onClick={save} disabled={pending || !form.vehicleId}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Lưu
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Phương tiện *">
            <Select
              value={form.vehicleId}
              onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
              disabled={Boolean(editing)}
            >
              <option value="">— Chọn xe —</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Loại giấy tờ *">
            <Select value={form.docType} onChange={(e) => setForm({ ...form, docType: e.target.value })}>
              {VEHICLE_DOC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {DOC_TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Số giấy tờ">
            <Input
              value={form.number}
              onChange={(e) => setForm({ ...form, number: e.target.value })}
              placeholder="DK-123456"
            />
          </Field>
          <Field label="Ngày cấp">
            <Input
              type="date"
              value={form.issuedDate}
              onChange={(e) => setForm({ ...form, issuedDate: e.target.value })}
            />
          </Field>
          <Field label="Ngày hết hạn">
            <Input
              type="date"
              value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Ghi chú">
              <Textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Ghi chú thêm"
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
