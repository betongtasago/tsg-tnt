import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR, EmptyRow } from "@/components/ui/table";
import { fmtDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<string, string> = {
  CREATE: "Tạo mới",
  UPDATE: "Cập nhật",
  DELETE: "Xóa",
  LOGIN: "Đăng nhập",
  LOGIN_FAILED: "Đăng nhập lỗi",
  LOGOUT: "Đăng xuất",
  EXPORT: "Xuất dữ liệu",
  SEND: "Gửi",
};

const MODULE_LABEL: Record<string, string> = {
  auth: "Đăng nhập",
  production: "Báo cáo SX",
  reports: "Báo cáo SX",
  drivers: "Tài xế",
  vehicles: "Phương tiện",
  documents: "Giấy tờ",
  cameras: "Camera",
  telegram: "Telegram",
  users: "Người dùng",
  settings: "Cài đặt",
};

const TONE: Record<string, "success" | "warning" | "danger" | "primary" | "default"> = {
  CREATE: "success",
  UPDATE: "primary",
  DELETE: "danger",
  LOGIN: "default",
  LOGIN_FAILED: "warning",
  LOGOUT: "default",
  EXPORT: "primary",
  SEND: "success",
};

export default async function AuditPage() {
  await requirePermission("settings", "view");

  const logs = await prisma.auditLog.findMany({
    include: { user: { select: { username: true, fullName: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Nhật ký thao tác"
        description="Toàn bộ thao tác trên hệ thống — 300 bản ghi gần nhất"
      />

      <Table>
        <THead>
          <TR>
            <TH>Thời gian</TH>
            <TH>Người dùng</TH>
            <TH>Hành động</TH>
            <TH>Phân hệ</TH>
            <TH>Chi tiết</TH>
            <TH>IP</TH>
          </TR>
        </THead>
        <TBody>
          {logs.length === 0 ? (
            <EmptyRow colSpan={6} message="Chưa có nhật ký nào." />
          ) : (
            logs.map((l) => (
              <TR key={l.id}>
                <TD className="whitespace-nowrap text-muted-foreground">{fmtDateTime(l.createdAt)}</TD>
                <TD className="whitespace-nowrap font-medium">
                  {l.user ? (
                    <>
                      {l.user.fullName}
                      <span className="ml-1 text-[11px] text-muted-foreground">({l.user.username})</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Hệ thống</span>
                  )}
                </TD>
                <TD>
                  <Badge tone={TONE[l.action] ?? "default"}>{ACTION_LABEL[l.action] ?? l.action}</Badge>
                </TD>
                <TD className="whitespace-nowrap">{MODULE_LABEL[l.module] ?? l.module}</TD>
                <TD className="max-w-[360px] truncate text-[11.5px] text-muted-foreground">
                  {l.detail ? JSON.stringify(l.detail) : "—"}
                </TD>
                <TD className="whitespace-nowrap text-muted-foreground">{l.ip ?? "—"}</TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
    </div>
  );
}
