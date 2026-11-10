import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

const DEFAULTS: Record<string, string> = {
  "company.name": "CÔNG TY CỔ PHẦN SX KD DV BÊ TÔNG TSG TNT",
  "company.shortName": "TSG-TNT",
  "company.address": "",
  "company.phone": "",
  "company.email": "",
  "company.taxCode": "",
  "company.representative": "",
  "report.autoSendTime": "17:00",
  "report.autoSendEnabled": "false",
  "report.templateNote": "",
  "system.timezone": "Asia/Ho_Chi_Minh",
};

export default async function SettingsPage() {
  const session = await requirePermission("settings", "view");

  const [rows, backups] = await Promise.all([
    prisma.systemSetting.findMany(),
    prisma.backupLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  const settings: Record<string, string> = { ...DEFAULTS };
  for (const r of rows) settings[r.key] = r.value;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cài đặt hệ thống"
        description="Thông tin công ty, mẫu báo cáo, sao lưu dữ liệu và nhật ký thao tác"
      />

      <SettingsClient
        initial={settings}
        backups={backups.map((b) => ({
          id: b.id,
          filename: b.filename,
          sizeBytes: b.sizeBytes,
          status: b.status,
          createdAt: b.createdAt.toISOString(),
        }))}
        canUpdate={can(session.role, "settings", "update")}
        canExport={can(session.role, "settings", "export")}
      />
    </div>
  );
}
