import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import { vehicleSchema, dateOrNull } from "@/lib/validators";
import { writeAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "vehicles", "create")) {
    return NextResponse.json({ error: "Không có quyền thêm phương tiện" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = vehicleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const v = parsed.data;

  try {
    const vehicle = await prisma.vehicle.create({
      data: {
        plate: v.plate.trim().toUpperCase(),
        code: v.code?.trim().toUpperCase() || null,
        type: v.type,
        brand: v.brand || null,
        year: v.year ?? null,
        capacity: v.capacity ?? null,
        driverId: v.driverId || null,
        stationId: v.stationId || null,
        status: v.status,
        registrationDate: dateOrNull(v.registrationDate),
        registrationExpiry: dateOrNull(v.registrationExpiry),
        insuranceExpiry: dateOrNull(v.insuranceExpiry),
        note: v.note || null,
      },
    });

    // Ghi lịch sử phân công nếu có tài xế
    if (v.driverId) {
      await prisma.vehicleDriverHistory.create({
        data: { vehicleId: vehicle.id, driverId: v.driverId, note: "Phân công khi tạo phương tiện" },
      });
    }

    await writeAudit(session, { action: "CREATE", module: "vehicles", entityId: vehicle.id, detail: { plate: vehicle.plate } });
    return NextResponse.json({ ok: true, vehicle });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "Biển số hoặc mã phương tiện đã tồn tại" }, { status: 409 });
    }
    return NextResponse.json({ error: "Không thêm được phương tiện" }, { status: 500 });
  }
}
