import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import { driverSchema, dateOrNull } from "@/lib/validators";
import { writeAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "drivers", "create")) {
    return NextResponse.json({ error: "Không có quyền thêm tài xế" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = driverSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const d = parsed.data;

  try {
    const driver = await prisma.driver.create({
      data: {
        code: d.code.trim().toUpperCase(),
        fullName: d.fullName.trim(),
        phone: d.phone || null,
        stationId: d.stationId || null,
        joinDate: dateOrNull(d.joinDate),
        status: d.status,
        shift: d.shift || null,
        note: d.note || null,
      },
    });

    await writeAudit(session, { action: "CREATE", module: "drivers", entityId: driver.id, detail: { code: driver.code } });
    return NextResponse.json({ ok: true, driver });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "Mã tài xế đã tồn tại" }, { status: 409 });
    }
    return NextResponse.json({ error: "Không thêm được tài xế" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "drivers", "view")) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const drivers = await prisma.driver.findMany({
    include: { station: true, vehicles: { select: { plate: true } } },
    orderBy: { code: "asc" },
  });
  return NextResponse.json({ drivers });
}
