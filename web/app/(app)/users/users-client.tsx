"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Check, Loader2, Pencil, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR, EmptyRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select } from "@/components/ui/input";
import { SearchBox, useFilter, useToast } from "@/components/ui/search-box";
import { fmtDateTime } from "@/lib/utils";
import type { Permission } from "@/lib/rbac";

type UserRow = {
  id: string;
  username: string;
  fullName: string;
  phone: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string;
  createdAt: string;
};

type MatrixRow = {
  role: string;
  label: string;
  perms: { module: string; label: string; permissions: Permission[] }[];
};

const PERM_LABEL: Record<Permission, string> = {
  view: "Xem",
  create: "Thêm",
  update: "Sửa",
  delete: "Xóa",
  export: "Xuất",
};

const EMPTY = {
  username: "",
  fullName: "",
  phone: "",
  role: "BAO_VE",
  password: "",
  isActive: true,
};

export function UsersClient({
  users,
  matrix,
  roleLabels,
  currentUserId,
  canCreate,
  canUpdate,
  canDelete,
}: {
  users: UserRow[];
  matrix: MatrixRow[];
  roleLabels: Record<string, string>;
  currentUserId: string;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const { show, node: toast } = useToast();

  const [tab, setTab] = useState<"accounts" | "matrix">("accounts");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = useCallback(
    (u: UserRow) => [u.username, u.fullName, u.phone, roleLabels[u.role] ?? u.role],
    [roleLabels]
  );
  const filtered = useFilter(users, query, pick);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setOpen(true);
  }

  function openEdit(u: UserRow) {
    setEditing(u);
    setForm({
      username: u.username,
      fullName: u.fullName,
      phone: u.phone,
      role: u.role,
      password: "",
      isActive: u.isActive,
    });
    setError(null);
    setOpen(true);
  }

  async function save() {
    setPending(true);
    setError(null);
    try {
      const payload = {
        username: form.username,
        fullName: form.fullName,
        phone: form.phone || null,
        role: form.role,
        isActive: form.isActive,
        password: form.password || undefined,
      };

      const res = await fetch(editing ? `/api/users/${editing.id}` : "/api/users", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Không lưu được người dùng");
        return;
      }

      setOpen(false);
      show(editing ? "Đã cập nhật tài khoản" : "Đã tạo tài khoản");
      router.refresh();
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setPending(false);
    }
  }

  async function remove(u: UserRow) {
    if (!confirm(`Xóa tài khoản ${u.username}?`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      show(data.error ?? "Không xóa được", "error");
      return;
    }
    show("Đã xóa tài khoản");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {toast}

      <div className="no-print flex flex-wrap items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setTab("accounts")}
          className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
            tab === "accounts" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
          }`}
        >
          Tài khoản ({users.length})
        </button>
        <button
          onClick={() => setTab("matrix")}
          className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
            tab === "matrix" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
          }`}
        >
          Ma trận phân quyền
        </button>
      </div>

      {tab === "accounts" ? (
        <>
          <div className="no-print flex flex-wrap items-center gap-2">
            <SearchBox
              value={query}
              onChange={setQuery}
              placeholder="Tìm tên đăng nhập, họ tên, vai trò…"
              className="w-full sm:w-72"
            />
            {canCreate ? (
              <Button size="sm" className="ml-auto" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" /> Thêm người dùng
              </Button>
            ) : null}
          </div>

          <Table>
            <THead>
              <TR>
                <TH>Tên đăng nhập</TH>
                <TH>Họ và tên</TH>
                <TH>Điện thoại</TH>
                <TH>Vai trò</TH>
                <TH>Trạng thái</TH>
                <TH>Đăng nhập gần nhất</TH>
                <TH className="text-right">Thao tác</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.length === 0 ? (
                <EmptyRow colSpan={7} message="Không có tài khoản nào khớp bộ lọc." />
              ) : (
                filtered.map((u) => (
                  <TR key={u.id}>
                    <TD className="whitespace-nowrap font-medium">
                      {u.username}
                      {u.id === currentUserId ? (
                        <span className="ml-1.5 text-[10px] text-muted-foreground">(bạn)</span>
                      ) : null}
                    </TD>
                    <TD className="whitespace-nowrap font-medium">{u.fullName}</TD>
                    <TD className="whitespace-nowrap text-muted-foreground">{u.phone || "—"}</TD>
                    <TD>
                      <Badge tone={u.role === "ADMIN" ? "primary" : "default"}>
                        {u.role === "ADMIN" ? <ShieldCheck className="h-3 w-3" /> : null}
                        {roleLabels[u.role] ?? u.role}
                      </Badge>
                    </TD>
                    <TD>
                      <Badge tone={u.isActive ? "success" : "muted"}>
                        {u.isActive ? "Đang hoạt động" : "Đã khóa"}
                      </Badge>
                    </TD>
                    <TD className="whitespace-nowrap text-muted-foreground">
                      {u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : "Chưa đăng nhập"}
                    </TD>
                    <TD>
                      <div className="flex items-center justify-end gap-1">
                        {canUpdate ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(u)}
                            aria-label="Sửa"
                            title="Sửa"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                        {canDelete && u.id !== currentUserId ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => remove(u)}
                            aria-label="Xóa"
                            title="Xóa"
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
        </>
      ) : (
        <div className="card-panel overflow-x-auto p-0">
          <table className="w-full min-w-[860px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left font-semibold">Phân hệ</th>
                {matrix.map((m) => (
                  <th key={m.role} className="px-2 py-2 text-center font-semibold">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix[0]?.perms.map((p, i) => (
                <tr key={p.module} className="border-b border-border last:border-0">
                  <td className="sticky left-0 z-10 bg-card px-3 py-1.5 font-medium">{p.label}</td>
                  {matrix.map((m) => {
                    const perms = m.perms[i]?.permissions ?? [];
                    return (
                      <td key={m.role} className="px-2 py-1.5 text-center">
                        {perms.length === 0 ? (
                          <X className="mx-auto h-3.5 w-3.5 text-muted-foreground/40" />
                        ) : (
                          <div className="flex flex-wrap justify-center gap-0.5">
                            {perms.map((perm) => (
                              <span
                                key={perm}
                                className="rounded bg-primary/10 px-1 py-0.5 text-[10px] font-medium text-primary"
                                title={PERM_LABEL[perm]}
                              >
                                {PERM_LABEL[perm]}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
            <Check className="mr-1 inline h-3 w-3 text-success" />
            Ma trận mặc định áp dụng cho mọi tài khoản theo vai trò. Quản trị hệ thống có toàn quyền trên
            mọi phân hệ.
          </p>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Sửa tài khoản — ${editing.username}` : "Thêm người dùng"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Hủy
            </Button>
            <Button onClick={save} disabled={pending || !form.username || !form.fullName}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Lưu
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tên đăng nhập *" hint="Chữ thường, số, dấu chấm hoặc gạch">
            <Input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="nguyenvana"
              disabled={Boolean(editing)}
              autoComplete="off"
            />
          </Field>
          <Field label="Họ và tên *">
            <Input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Nguyễn Văn A"
            />
          </Field>
          <Field label="Điện thoại">
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="0901234567"
            />
          </Field>
          <Field label="Vai trò *">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {Object.entries(roleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label={editing ? "Mật khẩu mới" : "Mật khẩu *"}
            hint={editing ? "Để trống nếu không đổi" : "Tối thiểu 8 ký tự"}
          >
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </Field>
          <div className="flex items-end pb-1">
            <label className="flex cursor-pointer items-center gap-2 text-[12.5px]">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4 accent-[hsl(var(--primary))]"
              />
              Cho phép đăng nhập
            </label>
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
