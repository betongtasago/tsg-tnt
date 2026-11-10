import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import { vehicleSchema, dateOrNull } from "@/lib/validators";
import { writeAudit } from "@/lib/audit";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "vehicles", "update")) {
    return NextResponse.json({ error: "Không có quyền sửa phương tiện" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = vehicleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const v = parsed.data;

  const existing = await prisma.vehicle.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Không tìm thấy phương tiện" }, { status: 404 });

  try {
    const vehicle = await prisma.vehicle.update({
      where: { id: params.id },
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

    // Theo dõi lịch sử thay đổi tài xế
    if (existing.driverId !== (v.driverId || null)) {
      await prisma.vehicleDriverHistory.updateMany({
        where: { vehicleId: vehicle.id, toDate: null },
        data: { toDate: new Date() },
      });
      if (v.driverId) {
        await prisma.vehicleDriverHistory.create({
          data: { vehicleId: vehicle.id, driverId: v.driverId, note: "Đổi tài xế phụ trách" },
        });
      }
    }

    await writeAudit(session, {
      action: "UPDATE",
      module: "vehicles",
      entityId: vehicle.id,
      detail: { plate: vehicle.plate, driverChanged: existing.driverId !== (v.driverId || null) },
    });
    return NextResponse.json({ ok: true, vehicle });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "Biển số hoặc mã phương tiện đã tồn tại" }, { status: 409 });
    }
    return NextResponse.json({ error: "Không lưu được phương tiện" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "vehicles", "delete")) {
    return NextResponse.json({ error: "Không có quyền xóa phương tiện" }, { status: 403 });
  }

  try {
    await prisma.vehicle.delete({ where: { id: params.id } });
    await writeAudit(session, { action: "DELETE", module: "vehicles", entityId: params.id });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Không xóa được phương tiện" }, { status: 500 });
  }
}
