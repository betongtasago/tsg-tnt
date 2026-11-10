import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import { userSchema } from "@/lib/validators";
import { writeAudit, clientIp } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "users", "view")) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      fullName: true,
      phone: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: [{ role: "asc" }, { username: "asc" }],
  });

  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "users", "create")) {
    return NextResponse.json({ error: "Không có quyền thêm người dùng" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = userSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const u = parsed.data;
  if (!u.password) {
    return NextResponse.json({ error: "Nhập mật khẩu cho tài khoản mới" }, { status: 400 });
  }

  try {
    const user = await prisma.user.create({
      data: {
        username: u.username.toLowerCase(),
        passwordHash: await bcrypt.hash(u.password, 10),
        fullName: u.fullName.trim(),
        phone: u.phone || null,
        role: u.role,
        isActive: u.isActive ?? true,
      },
      select: { id: true, username: true },
    });

    await writeAudit(session, {
      action: "CREATE",
      module: "users",
      entityId: user.id,
      detail: { username: user.username, role: u.role },
      ip: clientIp(req),
    });

    return NextResponse.json({ ok: true, user });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "Tên đăng nhập đã tồn tại" }, { status: 409 });
    }
    return NextResponse.json({ error: "Không tạo được người dùng" }, { status: 500 });
  }
}
