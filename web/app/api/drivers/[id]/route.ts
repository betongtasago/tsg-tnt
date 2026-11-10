import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import { driverSchema, dateOrNull } from "@/lib/validators";
import { writeAudit } from "@/lib/audit";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "drivers", "update")) {
    return NextResponse.json({ error: "Không có quyền sửa tài xế" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = driverSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const d = parsed.data;

  try {
    const driver = await prisma.driver.update({
      where: { id: params.id },
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

    await writeAudit(session, { action: "UPDATE", module: "drivers", entityId: driver.id, detail: { code: driver.code } });
    return NextResponse.json({ ok: true, driver });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "Mã tài xế đã tồn tại" }, { status: 409 });
    }
    return NextResponse.json({ error: "Không lưu được tài xế" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "drivers", "delete")) {
    return NextResponse.json({ error: "Không có quyền xóa tài xế" }, { status: 403 });
  }

  try {
    await prisma.driver.delete({ where: { id: params.id } });
    await writeAudit(session, { action: "DELETE", module: "drivers", entityId: params.id });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Không xóa được: tài xế đang được gán cho phương tiện." },
      { status: 409 }
    );
  }
}
