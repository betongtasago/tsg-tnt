import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { monthLogBulkSchema } from "@/lib/month-log-validators";
import { getMonthLog } from "@/lib/month-log";

export const dynamic = "force-dynamic";

/** Đọc bảng theo dõi tài xế của một tháng. */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "drivers", "view")) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const year = Number(searchParams.get("year")) || now.getFullYear();
  const month = Number(searchParams.get("month")) || now.getMonth() + 1;

  const rows = await getMonthLog(year, month);
  return NextResponse.json({ year, month, rows });
}

/** Lưu toàn bộ bảng của một tháng (upsert từng dòng). */
export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "drivers", "update")) {
    return NextResponse.json({ error: "Không có quyền sửa bảng tài" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = monthLogBulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 400 }
    );
  }

  const { year, month, rows } = parsed.data;

  // Lấy thông tin tài xế để chụp lại vào dòng tháng
  const drivers = await prisma.driver.findMany({
    where: { id: { in: rows.map((r) => r.driverId) } },
    include: { vehicles: { select: { plate: true }, take: 1 } },
  });
  const driverMap = new Map(drivers.map((d) => [d.id, d]));

  const ops = rows
    .filter((r) => driverMap.has(r.driverId))
    .map((r) => {
      const d = driverMap.get(r.driverId)!;
      const data = {
        driverCode: d.code,
        driverName: d.fullName,
        vehiclePlate: d.vehicles[0]?.plate ?? null,
        taiNgay: r.taiNgay,
        timeValue: r.timeValue,
        leaveRepair: r.leaveRepair || null,
        note: r.note || null,
        lan1: r.lan1,
        lan2: r.lan2,
        lan3: r.lan3,
        odometer: r.odometer,
        tireDate: r.tireDate,
      };
      return prisma.driverMonthLog.upsert({
        where: { driverId_year_month: { driverId: r.driverId, year, month } },
        create: { driverId: r.driverId, year, month, ...data },
        update: data,
      });
    });

  await prisma.$transaction(ops);

  await writeAudit(session, {
    action: "UPDATE",
    module: "drivers",
    entityId: `${year}-${String(month).padStart(2, "0")}`,
    detail: { table: "monthLog", rows: ops.length },
  });

  return NextResponse.json({ ok: true, saved: ops.length });
}
