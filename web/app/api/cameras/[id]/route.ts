import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import { cameraSchema } from "@/lib/validators";
import { encryptSecret } from "@/lib/crypto";
import { writeAudit } from "@/lib/audit";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "cameras", "update")) {
    return NextResponse.json({ error: "Không có quyền sửa camera" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = cameraSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const c = parsed.data;

  try {
    const camera = await prisma.camera.update({
      where: { id: params.id },
      data: {
        code: c.code.trim().toUpperCase(),
        name: c.name.trim(),
        location: c.location || null,
        stationId: c.stationId || null,
        isActive: c.isActive ?? true,
        // Chỉ đổi RTSP khi có nhập mới
        ...(c.rtspUrl && /^rtsp:\/\//i.test(c.rtspUrl)
          ? { rtspUrlEnc: encryptSecret(c.rtspUrl) }
          : {}),
      },
    });

    await writeAudit(session, { action: "UPDATE", module: "cameras", entityId: camera.id, detail: { code: camera.code } });
    return NextResponse.json({ ok: true, camera: { id: camera.id, code: camera.code, name: camera.name } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "Mã camera đã tồn tại" }, { status: 409 });
    }
    return NextResponse.json({ error: "Không lưu được camera" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "cameras", "delete")) {
    return NextResponse.json({ error: "Không có quyền xóa camera" }, { status: 403 });
  }

  try {
    await prisma.camera.delete({ where: { id: params.id } });
    await writeAudit(session, { action: "DELETE", module: "cameras", entityId: params.id });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Không xóa được camera" }, { status: 500 });
  }
}
