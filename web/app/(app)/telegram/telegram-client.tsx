"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Loader2, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR, EmptyRow } from "@/components/ui/table";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/search-box";
import { fmtDateTime } from "@/lib/utils";

type Config = {
  hasToken: boolean;
  chatId: string;
  enabled: boolean;
  notifyReport: boolean;
  notifyVehicleIn: boolean;
  notifyUnknown: boolean;
  notifyCameraOffline: boolean;
  notifyDocExpiry: boolean;
  notifyDailySummary: boolean;
  dedupeSeconds: number;
};

type Log = {
  id: string;
  type: string;
  status: string;
  message: string;
  error: string;
  sentAt: string;
};

const NOTIFY_TYPES: { key: keyof Config; label: string; hint: string }[] = [
  { key: "notifyReport", label: "Báo cáo sản xuất", hint: "Khi báo cáo được gửi Ban Giám đốc" },
  { key: "notifyVehicleIn", label: "Xe vào vùng nhận diện", hint: "Camera phát hiện xe thuộc công ty" },
  { key: "notifyUnknown", label: "Biển số chưa xác định", hint: "Xe lạ hoặc OCR không khớp danh sách" },
  { key: "notifyCameraOffline", label: "Camera mất kết nối", hint: "Agent báo camera offline" },
  { key: "notifyDocExpiry", label: "Giấy tờ sắp hết hạn", hint: "Đăng kiểm, bảo hiểm, GPLX" },
  { key: "notifyDailySummary", label: "Tổng hợp cuối ngày", hint: "Sản lượng, chuyến, sự kiện trong ngày" },
];

const TYPE_LABEL: Record<string, string> = {
  REPORT: "Báo cáo SX",
  VEHICLE_IN: "Xe vào",
  VEHICLE_UNKNOWN: "Xe chưa xác định",
  CAMERA_OFFLINE: "Camera offline",
  DOC_EXPIRY: "Giấy tờ hết hạn",
  DAILY_SUMMARY: "Tổng hợp ngày",
  TEST: "Kiểm tra",
};

export function TelegramClient({
  initial,
  logs,
  stats,
}: {
  initial: Config;
  logs: Log[];
  stats: { success: number; failed: number };
}) {
  const router = useRouter();
  const { show, node: toast } = useToast();

  const [cfg, setCfg] = useState<Config>(initial);
  const [token, setToken] = useState("");
  const [pending, setPending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(key: keyof Config) {
    setCfg((c) => ({ ...c, [key]: !c[key] }));
  }

  async function save() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/telegram", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: token || null,
          chatId: cfg.chatId || null,
          enabled: cfg.enabled,
          notifyReport: cfg.notifyReport,
          notifyVehicleIn: cfg.notifyVehicleIn,
          notifyUnknown: cfg.notifyUnknown,
          notifyCameraOffline: cfg.notifyCameraOffline,
          notifyDocExpiry: cfg.notifyDocExpiry,
          notifyDailySummary: cfg.notifyDailySummary,
          dedupeSeconds: cfg.dedupeSeconds,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Không lưu được cấu hình");
        return;
      }
      setToken("");
      setCfg((c) => ({ ...c, hasToken: c.hasToken || Boolean(token) }));
      show("Đã lưu cấu hình Telegram");
      router.refresh();
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setPending(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    setError(null);
    try {
      const res = await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Gửi thử thất bại");
        show(data.error ?? "Gửi thử thất bại", "error");
        return;
      }
      show("Đã gửi tin nhắn thử — kiểm tra nhóm Telegram");
      router.refresh();
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-4">
      {toast}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Cấu hình bot */}
        <section className="card-panel space-y-3 p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
              Cấu hình Bot Telegram
            </h2>
            <label className="flex cursor-pointer items-center gap-2 text-[12.5px]">
              <input
                type="checkbox"
                checked={cfg.enabled}
                onChange={() => toggle("enabled")}
                className="h-4 w-4 accent-[hsl(var(--primary))]"
              />
              <span className={cfg.enabled ? "font-medium text-success" : "text-muted-foreground"}>
                {cfg.enabled ? "Đang bật" : "Đang tắt"}
              </span>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Bot Token"
              hint={
                cfg.hasToken
                  ? "Đã lưu token (mã hóa AES-256-GCM). Để trống nếu không đổi."
                  : "Lấy từ @BotFather trên Telegram"
              }
            >
              <Input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={cfg.hasToken ? "••••••••••••••••" : "1234567890:AAH..."}
                autoComplete="off"
              />
            </Field>
            <Field label="Chat ID nhóm" hint="ID nhóm hoặc kênh nhận thông báo (số âm với nhóm)">
              <Input
                value={cfg.chatId}
                onChange={(e) => setCfg({ ...cfg, chatId: e.target.value })}
                placeholder="-1001234567890"
              />
            </Field>
            <Field
              label="Chống trùng (giây)"
              hint="Bỏ qua sự kiện trùng biển số trên cùng camera trong khoảng này"
            >
              <Input
                type="number"
                min={10}
                max={3600}
                value={cfg.dedupeSeconds}
                onChange={(e) => setCfg({ ...cfg, dedupeSeconds: Number(e.target.value) })}
              />
            </Field>
          </div>

          <div>
            <p className="field-label">Loại thông báo</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {NOTIFY_TYPES.map((t) => (
                <label
                  key={String(t.key)}
                  className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-background px-2.5 py-2"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(cfg[t.key])}
                    onChange={() => toggle(t.key)}
                    className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
                  />
                  <span>
                    <span className="block text-[12.5px] font-medium">{t.label}</span>
                    <span className="block text-[11px] text-muted-foreground">{t.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <Button onClick={save} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Lưu cấu hình
            </Button>
            <Button variant="outline" onClick={sendTest} disabled={testing || !cfg.hasToken}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Gửi tin nhắn thử
            </Button>
          </div>
        </section>

        {/* Thống kê + hướng dẫn */}
        <section className="space-y-3">
          <div className="card-panel p-4">
            <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
              Trạng thái gửi
            </h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[12.5px]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Thành công
                </span>
                <span className="font-semibold tabular-nums">{stats.success}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[12.5px]">
                  <XCircle className="h-3.5 w-3.5 text-destructive" /> Thất bại
                </span>
                <span className="font-semibold tabular-nums">{stats.failed}</span>
              </div>
            </div>
          </div>

          <div className="card-panel bg-muted/40 p-3">
            <h3 className="mb-1.5 text-[12px] font-semibold">Hướng dẫn nhanh</h3>
            <ol className="list-decimal space-y-1 pl-4 text-[11.5px] leading-relaxed text-muted-foreground">
              <li>Mở Telegram, chat với @BotFather, gõ /newbot để tạo bot và lấy token.</li>
              <li>Thêm bot vào nhóm công ty, cấp quyền gửi tin nhắn.</li>
              <li>Lấy Chat ID nhóm (dùng @userinfobot hoặc getUpdates API).</li>
              <li>Dán token + Chat ID, bật công tắc, bấm Lưu rồi Gửi thử.</li>
            </ol>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Token được mã hóa trong database và không bao giờ hiển thị lại trên giao diện.
            </p>
          </div>
        </section>
      </div>

      {/* Lịch sử gửi */}
      <section>
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
          Lịch sử gửi gần đây
        </h2>
        <Table>
          <THead>
            <TR>
              <TH>Thời gian</TH>
              <TH>Loại</TH>
              <TH>Trạng thái</TH>
              <TH>Nội dung</TH>
              <TH>Lỗi</TH>
            </TR>
          </THead>
          <TBody>
            {logs.length === 0 ? (
              <EmptyRow colSpan={5} message="Chưa có thông báo nào được gửi." />
            ) : (
              logs.map((l) => (
                <TR key={l.id}>
                  <TD className="whitespace-nowrap text-muted-foreground">{fmtDateTime(l.sentAt)}</TD>
                  <TD className="whitespace-nowrap">{TYPE_LABEL[l.type] ?? l.type}</TD>
                  <TD>
                    <Badge tone={l.status === "SUCCESS" ? "success" : "danger"}>
                      {l.status === "SUCCESS" ? "Thành công" : "Thất bại"}
                    </Badge>
                  </TD>
                  <TD className="max-w-[380px] truncate text-muted-foreground">
                    {l.message.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || "—"}
                  </TD>
                  <TD className="max-w-[240px] truncate text-destructive">{l.error || "—"}</TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </section>
    </div>
  );
}
