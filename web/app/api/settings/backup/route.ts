import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

/** Xuất toàn bộ dữ liệu nghiệp vụ ra JSON để sao lưu ngoài hệ thống. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "settings", "export")) {
    return NextResponse.json({ error: "Không có quyền sao lưu dữ liệu" }, { status: 403 });
  }

  const [
    stations,
    customers,
    drivers,
    vehicles,
    documents,
    reports,
    cameras,
    zones,
    events,
    settings,
  ] = await Promise.all([
    prisma.station.findMany(),
    prisma.customer.findMany(),
    prisma.driver.findMany(),
    prisma.vehicle.findMany(),
    prisma.document.findMany(),
    prisma.productionReport.findMany(),
    prisma.camera.findMany({ select: { id: true, code: true, name: true, location: true, stationId: true, status: true, isActive: true } }),
    prisma.detectionZone.findMany(),
    prisma.detectionEvent.findMany({ take: 5000, orderBy: { detectedAt: "desc" } }),
    prisma.systemSetting.findMany(),
  ]);

  const payload = {
    meta: {
      app: "TSG-TNT",
      version: 1,
      exportedAt: new Date().toISOString(),
      exportedBy: session.username,
      note: "Bản sao lưu dữ liệu nghiệp vụ. Không chứa mật khẩu, token hay RTSP URL.",
    },
    stations,
    customers,
    drivers,
    vehicles,
    documents,
    reports,
    cameras,
    zones,
    events,
    settings,
  };

  const json = JSON.stringify(payload, null, 2);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

  await prisma.backupLog.create({
    data: {
      filename: `tsg-tnt-backup-${stamp}.json`,
      sizeBytes: Buffer.byteLength(json, "utf8"),
      status: "SUCCESS",
    },
  });

  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="tsg-tnt-backup-${stamp}.json"`,
    },
  });
}
