import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, createSessionToken } from "@/lib/session";
import { writeAudit, clientIp } from "@/lib/audit";

const schema = z.object({
  username: z.string().min(1, "Nhập tên đăng nhập").max(64),
  password: z.string().min(1, "Nhập mật khẩu").max(200),
});

export async function POST(req: Request) {
  const ip = clientIp(req);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 400 }
    );
  }

  const { username, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { username: username.trim().toLowerCase() },
  });

  // Luôn chạy bcrypt để thời gian phản hồi không tiết lộ tài khoản có tồn tại hay không
  const dummyHash = "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidiu";
  const ok = await bcrypt.compare(password, user?.passwordHash ?? dummyHash);

  if (!user || !ok || !user.isActive) {
    await writeAudit(null, {
      action: "LOGIN_FAILED",
      module: "auth",
      detail: { username, reason: !user ? "not_found" : !ok ? "bad_password" : "inactive" },
      ip,
    });
    return NextResponse.json(
      { error: "Tên đăng nhập hoặc mật khẩu không đúng" },
      { status: 401 }
    );
  }

  const token = await createSessionToken({
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await writeAudit(
    { userId: user.id, username: user.username, fullName: user.fullName, role: user.role },
    { action: "LOGIN", module: "auth", entityId: user.id, ip }
  );

  const res = NextResponse.json({
    ok: true,
    user: { username: user.username, fullName: user.fullName, role: user.role },
  });

  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return res;
}
