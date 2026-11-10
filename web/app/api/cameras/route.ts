import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import { cameraSchema } from "@/lib/validators";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { writeAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "cameras", "create")) {
    return NextResponse.json({ error: "Không có quyền thêm camera" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = cameraSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const c = parsed.data;

  if (!c.rtspUrl) {
    return NextResponse.json({ error: "Nhập RTSP URL của camera" }, { status: 400 });
  }
  if (!/^rtsp:\/\//i.test(c.rtspUrl)) {
    return NextResponse.json({ error: "RTSP URL phải bắt đầu bằng rtsp://" }, { status: 400 });
  }

  try {
    const camera = await prisma.camera.create({
      data: {
        code: c.code.trim().toUpperCase(),
        name: c.name.trim(),
        location: c.location || null,
        stationId: c.stationId || null,
        rtspUrlEnc: encryptSecret(c.rtspUrl),
        isActive: c.isActive ?? true,
      },
    });

    await writeAudit(session, {
      action: "CREATE",
      module: "cameras",
      entityId: camera.id,
      detail: { code: camera.code },
    });

    // Không trả rtspUrlEnc về client
    return NextResponse.json({
      ok: true,
      camera: { id: camera.id, code: camera.code, name: camera.name },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "Mã camera đã tồn tại" }, { status: 409 });
    }
    return NextResponse.json({ error: "Không thêm được camera" }, { status: 500 });
  }
}

/**
 * Trả RTSP URL đã giải mã cho ADMIN/QUAN_LY_DOI_XE để cấu hình agent.
 * Không bao giờ trả trong danh sách thông thường.
 */
export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "cameras", "update")) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { cameraId?: string } | null;
  if (!body?.cameraId) {
    return NextResponse.json({ error: "Thiếu cameraId" }, { status: 400 });
  }

  const camera = await prisma.camera.findUnique({ where: { id: body.cameraId } });
  if (!camera) return NextResponse.json({ error: "Không tìm thấy camera" }, { status: 404 });

  let rtsp = "";
  try {
    rtsp = decryptSecret(camera.rtspUrlEnc);
  } catch {
    return NextResponse.json({ error: "Không giải mã được RTSP URL" }, { status: 500 });
  }

  await writeAudit(session, {
    action: "UPDATE",
    module: "cameras",
    entityId: camera.id,
    detail: { action: "reveal_rtsp" },
  });

  return NextResponse.json({ ok: true, rtspUrl: rtsp });
}
