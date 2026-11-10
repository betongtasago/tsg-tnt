import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import { telegramSchema } from "@/lib/validators";
import { encryptSecret } from "@/lib/crypto";
import { sendTelegram } from "@/lib/telegram";
import { writeAudit } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "telegram", "view")) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const [cfg, logs] = await Promise.all([
    prisma.telegramConfig.findUnique({ where: { id: "singleton" } }),
    prisma.notificationLog.findMany({ orderBy: { sentAt: "desc" }, take: 50 }),
  ]);

  return NextResponse.json({
    config: cfg
      ? {
          // Không trả token — chỉ cho biết đã cấu hình hay chưa
          hasToken: Boolean(cfg.botTokenEnc),
          chatId: cfg.chatId ?? "",
          enabled: cfg.enabled,
          notifyReport: cfg.notifyReport,
          notifyVehicleIn: cfg.notifyVehicleIn,
          notifyUnknown: cfg.notifyUnknown,
          notifyCameraOffline: cfg.notifyCameraOffline,
          notifyDocExpiry: cfg.notifyDocExpiry,
          notifyDailySummary: cfg.notifyDailySummary,
          dedupeSeconds: cfg.dedupeSeconds,
        }
      : null,
    logs,
  });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "telegram", "update")) {
    return NextResponse.json({ error: "Không có quyền cấu hình Telegram" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = telegramSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const c = parsed.data;
  const existing = await prisma.telegramConfig.findUnique({ where: { id: "singleton" } });

  const data = {
    chatId: c.chatId || null,
    enabled: c.enabled,
    notifyReport: c.notifyReport,
    notifyVehicleIn: c.notifyVehicleIn,
    notifyUnknown: c.notifyUnknown,
    notifyCameraOffline: c.notifyCameraOffline,
    notifyDocExpiry: c.notifyDocExpiry,
    notifyDailySummary: c.notifyDailySummary,
    dedupeSeconds: c.dedupeSeconds,
    // Chỉ ghi token mới khi người dùng nhập (không phải chuỗi rỗng)
    ...(c.botToken && c.botToken.trim()
      ? { botTokenEnc: encryptSecret(c.botToken.trim()) }
      : {}),
  };

  const cfg = existing
    ? await prisma.telegramConfig.update({ where: { id: "singleton" }, data })
    : await prisma.telegramConfig.create({ data: { id: "singleton", ...data } });

  await writeAudit(session, {
    action: "UPDATE",
    module: "telegram",
    entityId: cfg.id,
    detail: { enabled: cfg.enabled, tokenChanged: Boolean(c.botToken) },
  });

  return NextResponse.json({ ok: true });
}

/** Gửi tin nhắn thử để kiểm tra cấu hình bot. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "telegram", "update")) {
    return NextResponse.json({ error: "Không có quyền gửi thử" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { test?: boolean } | null;
  if (!body?.test) {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ" }, { status: 400 });
  }

  const now = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const result = await sendTelegram(
    "TEST",
    [
      "✅ <b>TSG-TNT — KIỂM TRA KẾT NỐI TELEGRAM</b>",
      "",
      "Bot đã kết nối thành công với hệ thống quản lý vận hành.",
      `• Người gửi: ${session.fullName}`,
      `• Thời gian: ${now}`,
    ].join("\n")
  );

  await writeAudit(session, {
    action: "SEND",
    module: "telegram",
    detail: { type: "TEST", ok: result.ok, error: result.error ?? null },
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "Gửi thất bại" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
