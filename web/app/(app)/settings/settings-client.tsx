"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Database, Download, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR, EmptyRow } from "@/components/ui/table";
import { Field, Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/search-box";
import { fmtDateTime } from "@/lib/utils";

type Backup = {
  id: string;
  filename: string;
  sizeBytes: number;
  status: string;
  createdAt: string;
};

export function SettingsClient({
  initial,
  backups,
  canUpdate,
  canExport,
}: {
  initial: Record<string, string>;
  backups: Backup[];
  canUpdate: boolean;
  canExport: boolean;
}) {
  const router = useRouter();
  const { show, node: toast } = useToast();
  const [cfg, setCfg] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: string, value: string) {
    setCfg((c) => ({ ...c, [key]: value }));
  }

  async function save() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Không lưu được cài đặt");
        return;
      }
      show("Đã lưu cài đặt hệ thống");
      router.refresh();
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setPending(false);
    }
  }

  function downloadBackup() {
    window.location.href = "/api/settings/backup";
    show("Đang tạo bản sao lưu…");
    setTimeout(() => router.refresh(), 2500);
  }

  return (
    <div className="space-y-4">
      {toast}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card-panel space-y-3 p-4 lg:col-span-2">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
            Thông tin công ty
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Tên công ty (đầy đủ)">
                <Input value={cfg["company.name"] ?? ""} onChange={(e) => set("company.name", e.target.value)} />
              </Field>
            </div>
            <Field label="Tên viết tắt">
              <Input
                value={cfg["company.shortName"] ?? ""}
                onChange={(e) => set("company.shortName", e.target.value)}
              />
            </Field>
            <Field label="Mã số thuế">
              <Input
                value={cfg["company.taxCode"] ?? ""}
                onChange={(e) => set("company.taxCode", e.target.value)}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Địa chỉ">
                <Input
                  value={cfg["company.address"] ?? ""}
                  onChange={(e) => set("company.address", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Điện thoại">
              <Input value={cfg["company.phone"] ?? ""} onChange={(e) => set("company.phone", e.target.value)} />
            </Field>
            <Field label="Email">
              <Input value={cfg["company.email"] ?? ""} onChange={(e) => set("company.email", e.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Người đại diện pháp luật">
                <Input
                  value={cfg["company.representative"] ?? ""}
                  onChange={(e) => set("company.representative", e.target.value)}
                />
              </Field>
            </div>
          </div>

          <h2 className="border-t border-border pt-3 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
            Báo cáo sản xuất
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Giờ tự động gửi báo cáo" hint="Định dạng 24h, ví dụ 17:00">
              <Input
                type="time"
                value={cfg["report.autoSendTime"] ?? "17:00"}
                onChange={(e) => set("report.autoSendTime", e.target.value)}
              />
            </Field>
            <div className="flex items-end pb-1">
              <label className="flex cursor-pointer items-center gap-2 text-[12.5px]">
                <input
                  type="checkbox"
                  checked={cfg["report.autoSendEnabled"] === "true"}
                  onChange={(e) => set("report.autoSendEnabled", e.target.checked ? "true" : "false")}
                  className="h-4 w-4 accent-[hsl(var(--primary))]"
                />
                Bật tự động gửi báo cáo hằng ngày
              </label>
            </div>
            <div className="sm:col-span-2">
              <Field label="Ghi chú mẫu báo cáo" hint="Hiển thị ở chân trang báo cáo khi in">
                <Textarea
                  value={cfg["report.templateNote"] ?? ""}
                  onChange={(e) => set("report.templateNote", e.target.value)}
                  placeholder="Ví dụ: Báo cáo được lập tự động từ hệ thống quản lý vận hành TSG-TNT"
                />
              </Field>
            </div>
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
              {error}
            </p>
          ) : null}

          {canUpdate ? (
            <div className="border-t border-border pt-3">
              <Button onClick={save} disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Lưu cài đặt
              </Button>
            </div>
          ) : null}
        </section>

        <section className="space-y-3">
          <div className="card-panel space-y-2.5 p-4">
            <h2 className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Database className="h-3.5 w-3.5" /> Sao lưu dữ liệu
            </h2>
            <p className="text-[11.5px] leading-relaxed text-muted-foreground">
              Xuất toàn bộ dữ liệu nghiệp vụ (trạm, khách hàng, tài xế, phương tiện, giấy tờ, báo cáo,
              camera, sự kiện) ra file JSON. Không bao gồm mật khẩu, token hay RTSP URL.
            </p>
            {canExport ? (
              <Button variant="outline" className="w-full" onClick={downloadBackup}>
                <Download className="h-4 w-4" /> Tải bản sao lưu
              </Button>
            ) : (
              <p className="text-[11.5px] text-muted-foreground">Bạn không có quyền sao lưu dữ liệu.</p>
            )}
          </div>

          <div className="card-panel p-3">
            <h3 className="mb-1.5 text-[12px] font-semibold">Thông tin hệ thống</h3>
            <dl className="space-y-1 text-[11.5px]">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Múi giờ</dt>
                <dd className="font-medium">{cfg["system.timezone"] ?? "Asia/Ho_Chi_Minh"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Cơ sở dữ liệu</dt>
                <dd className="font-medium">PostgreSQL</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Phiên bản</dt>
                <dd className="font-medium">1.0.0</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>

      <section>
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
          Lịch sử sao lưu
        </h2>
        <Table>
          <THead>
            <TR>
              <TH>Tên file</TH>
              <TH className="text-right">Dung lượng</TH>
              <TH>Trạng thái</TH>
              <TH>Thời gian</TH>
            </TR>
          </THead>
          <TBody>
            {backups.length === 0 ? (
              <EmptyRow colSpan={4} message="Chưa có bản sao lưu nào." />
            ) : (
              backups.map((b) => (
                <TR key={b.id}>
                  <TD className="whitespace-nowrap font-medium">{b.filename}</TD>
                  <TD className="whitespace-nowrap text-right tabular-nums text-muted-foreground">
                    {(b.sizeBytes / 1024).toFixed(1)} KB
                  </TD>
                  <TD>
                    <Badge tone={b.status === "SUCCESS" ? "success" : "danger"}>
                      {b.status === "SUCCESS" ? "Thành công" : "Lỗi"}
                    </Badge>
                  </TD>
                  <TD className="whitespace-nowrap text-muted-foreground">{fmtDateTime(b.createdAt)}</TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </section>
    </div>
  );
}
