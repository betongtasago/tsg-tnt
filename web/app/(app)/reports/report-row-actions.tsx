"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2, Pencil, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReportRowActions({
  id,
  status,
  canUpdate,
  canDelete,
}: {
  id: string;
  status: string;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function send() {
    setBusy("send");
    setMsg(null);
    try {
      const res = await fetch(`/api/reports/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit" }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        telegram?: { sent: boolean; skipped: boolean; error: string | null };
      };
      if (!res.ok || !data.ok) {
        setMsg(data.error ?? "Gửi thất bại");
        return;
      }
      if (data.telegram && !data.telegram.sent) {
        setMsg(data.telegram.skipped ? "Đã gửi (Telegram đang tắt)" : "Đã gửi (Telegram lỗi)");
      }
      router.refresh();
    } catch {
      setMsg("Lỗi kết nối");
    } finally {
      setBusy(null);
    }
  }

  async function approve() {
    setBusy("approve");
    try {
      await fetch(`/api/reports/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm("Xóa báo cáo này? Thao tác không thể hoàn tác.")) return;
    setBusy("delete");
    try {
      const res = await fetch(`/api/reports/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        setMsg(d.error ?? "Xóa thất bại");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {msg ? <span className="mr-1 text-[10px] text-muted-foreground">{msg}</span> : null}

      {canUpdate ? (
        <Link
          href={`/reports/${id}`}
          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Sửa báo cáo"
          aria-label="Sửa báo cáo"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Link>
      ) : null}

      {canUpdate && status === "DRAFT" ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={send}
          disabled={busy !== null}
          title="Gửi Ban Giám đốc"
          aria-label="Gửi Ban Giám đốc"
        >
          {busy === "send" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </Button>
      ) : null}

      {canUpdate && status === "SUBMITTED" ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-success"
          onClick={approve}
          disabled={busy !== null}
          title="Duyệt báo cáo"
          aria-label="Duyệt báo cáo"
        >
          {busy === "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        </Button>
      ) : null}

      {canDelete ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={remove}
          disabled={busy !== null}
          title="Xóa báo cáo"
          aria-label="Xóa báo cáo"
        >
          {busy === "delete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </Button>
      ) : null}
    </div>
  );
}
