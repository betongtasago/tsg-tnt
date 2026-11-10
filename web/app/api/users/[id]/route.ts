import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import { userSchema } from "@/lib/validators";
import { writeAudit, clientIp } from "@/lib/audit";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "users", "update")) {
    return NextResponse.json({ error: "Không có quyền sửa người dùng" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = userSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const u = parsed.data;

  // Không cho tự hạ quyền chính mình khỏi ADMIN (tránh khoá hệ thống)
  if (params.id === session.userId && u.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Không thể tự đổi vai trò của chính mình khỏi Quản trị hệ thống" },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        fullName: u.fullName.trim(),
        phone: u.phone || null,
        role: u.role,
        isActive: u.isActive ?? true,
        ...(u.password && u.password.trim().length >= 8
          ? { passwordHash: await bcrypt.hash(u.password, 10) }
          : {}),
      },
      select: { id: true, username: true },
    });

    await writeAudit(session, {
      action: "UPDATE",
      module: "users",
      entityId: user.id,
      detail: { username: user.username, role: u.role, passwordChanged: Boolean(u.password) },
      ip: clientIp(req),
    });

    return NextResponse.json({ ok: true, user });
  } catch {
    return NextResponse.json({ error: "Không lưu được người dùng" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "users", "delete")) {
    return NextResponse.json({ error: "Không có quyền xóa người dùng" }, { status: 403 });
  }

  if (params.id === session.userId) {
    return NextResponse.json({ error: "Không thể xóa tài khoản đang đăng nhập" }, { status: 400 });
  }

  const admins = await prisma.user.count({ where: { role: "ADMIN", isActive: true } });
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (target?.role === "ADMIN" && admins <= 1) {
    return NextResponse.json({ error: "Phải còn ít nhất một quản trị viên đang hoạt động" }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id: params.id } });
    await writeAudit(session, {
      action: "DELETE",
      module: "users",
      entityId: params.id,
      detail: { username: target?.username },
      ip: clientIp(req),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Không xóa được người dùng" }, { status: 500 });
  }
}
