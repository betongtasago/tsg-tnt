import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { PageHeader } from "@/components/ui/page-header";
import { TelegramClient } from "./telegram-client";

export const dynamic = "force-dynamic";

export default async function TelegramPage() {
  await requirePermission("telegram", "view");

  const [cfg, logs] = await Promise.all([
    prisma.telegramConfig.findUnique({ where: { id: "singleton" } }),
    prisma.notificationLog.findMany({ orderBy: { sentAt: "desc" }, take: 60 }),
  ]);

  const successCount = logs.filter((l) => l.status === "SUCCESS").length;
  const failCount = logs.filter((l) => l.status === "FAILED").length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Thông báo Telegram"
        description="Bot trung tâm gửi cảnh báo sản xuất, phương tiện, camera và giấy tờ tới nhóm Telegram của công ty"
      />

      <TelegramClient
        initial={{
          hasToken: Boolean(cfg?.botTokenEnc),
          chatId: cfg?.chatId ?? "",
          enabled: cfg?.enabled ?? false,
          notifyReport: cfg?.notifyReport ?? true,
          notifyVehicleIn: cfg?.notifyVehicleIn ?? true,
          notifyUnknown: cfg?.notifyUnknown ?? true,
          notifyCameraOffline: cfg?.notifyCameraOffline ?? true,
          notifyDocExpiry: cfg?.notifyDocExpiry ?? true,
          notifyDailySummary: cfg?.notifyDailySummary ?? true,
          dedupeSeconds: cfg?.dedupeSeconds ?? 120,
        }}
        logs={logs.map((l) => ({
          id: l.id,
          type: l.type,
          status: l.status,
          message: l.message ?? "",
          error: l.error ?? "",
          sentAt: l.sentAt.toISOString(),
        }))}
        stats={{ success: successCount, failed: failCount }}
      />
    </div>
  );
}
