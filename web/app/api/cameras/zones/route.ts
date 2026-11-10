import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import { zoneSchema } from "@/lib/validators";
import { writeAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "cameras", "update")) {
    return NextResponse.json({ error: "Không có quyền cấu hình vùng nhận diện" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = zoneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const z = parsed.data;

  const zone = await prisma.detectionZone.create({
    data: {
      cameraId: z.cameraId,
      name: z.name,
      points: z.points as never,
      direction: z.direction,
    },
  });

  await writeAudit(session, {
    action: "CREATE",
    module: "cameras",
    entityId: zone.id,
    detail: { cameraId: z.cameraId, zone: z.name, points: z.points.length },
  });

  return NextResponse.json({ ok: true, zone });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "cameras", "delete")) {
    return NextResponse.json({ error: "Không có quyền xóa vùng nhận diện" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });

  await prisma.detectionZone.delete({ where: { id } });
  await writeAudit(session, { action: "DELETE", module: "cameras", entityId: id, detail: { type: "zone" } });
  return NextResponse.json({ ok: true });
}
