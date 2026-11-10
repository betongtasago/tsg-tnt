import { prisma } from "./db";
import { decryptSecret } from "./crypto";

export type NotifyType =
  | "REPORT"
  | "VEHICLE_IN"
  | "VEHICLE_UNKNOWN"
  | "CAMERA_OFFLINE"
  | "DOC_EXPIRY"
  | "DAILY_SUMMARY"
  | "TEST";

const TYPE_FLAG: Record<NotifyType, keyof Awaited<ReturnType<typeof getConfig>> | null> = {
  REPORT: "notifyReport",
  VEHICLE_IN: "notifyVehicleIn",
  VEHICLE_UNKNOWN: "notifyUnknown",
  CAMERA_OFFLINE: "notifyCameraOffline",
  DOC_EXPIRY: "notifyDocExpiry",
  DAILY_SUMMARY: "notifyDailySummary",
  TEST: "enabled",
};

export async function getConfig() {
  const cfg = await prisma.telegramConfig.findUnique({ where: { id: "singleton" } });
  return (
    cfg ?? {
      id: "singleton",
      botTokenEnc: null,
      chatId: null,
      enabled: false,
      notifyReport: true,
      notifyVehicleIn: true,
      notifyUnknown: true,
      notifyCameraOffline: true,
      notifyDocExpiry: true,
      notifyDailySummary: true,
      dedupeSeconds: 120,
      updatedAt: new Date(),
    }
  );
}

type SendResult = { ok: boolean; error?: string; skipped?: boolean };

/**
 * Gửi tin nhắn Telegram. Tự đọc cấu hình từ DB, giải mã token tại server.
 * Không bao giờ trả token ra ngoài.
 */
export async function sendTelegram(
  type: NotifyType,
  text: string,
  photoUrl?: string
): Promise<SendResult> {
  const cfg = await getConfig();

  if (!cfg.enabled) return { ok: false, skipped: true, error: "Telegram đang tắt" };

  const flag = TYPE_FLAG[type];
  if (flag && flag !== "enabled" && !(cfg as Record<string, unknown>)[flag]) {
    return { ok: false, skipped: true, error: `Loại thông báo ${type} đang tắt` };
  }

  if (!cfg.botTokenEnc || !cfg.chatId) {
    return { ok: false, error: "Chưa cấu hình Bot Token hoặc Chat ID" };
  }

  let token: string;
  try {
    token = decryptSecret(cfg.botTokenEnc);
  } catch {
    return { ok: false, error: "Không giải mã được Bot Token" };
  }

  try {
    const isPhoto = Boolean(photoUrl && /^https?:\/\//.test(photoUrl));
    const url = isPhoto
      ? `https://api.telegram.org/bot${token}/sendPhoto`
      : `https://api.telegram.org/bot${token}/sendMessage`;

    const body = isPhoto
      ? { chat_id: cfg.chatId, photo: photoUrl, caption: text, parse_mode: "HTML" }
      : { chat_id: cfg.chatId, text, parse_mode: "HTML", disable_web_page_preview: true };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });

    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };

    if (!res.ok || !json.ok) {
      const error = json.description || `HTTP ${res.status}`;
      await logNotification(type, "FAILED", text, error);
      return { ok: false, error };
    }

    await logNotification(type, "SUCCESS", text);
    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Lỗi không xác định";
    await logNotification(type, "FAILED", text, error);
    return { ok: false, error };
  }
}

async function logNotification(type: string, status: string, message: string, error?: string) {
  try {
    await prisma.notificationLog.create({
      data: { type, status, message: message.slice(0, 900), error: error?.slice(0, 500) },
    });
  } catch (e) {
    console.error("[telegram] không ghi được log:", e);
  }
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
