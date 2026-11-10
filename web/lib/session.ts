import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";

export const SESSION_COOKIE = "tsg_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 giờ

export type SessionPayload = {
  userId: string;
  username: string;
  fullName: string;
  role: Role;
};

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET chưa được cấu hình (tối thiểu 32 ký tự). Xem .env.example");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT({
    username: payload.username,
    fullName: payload.fullName,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.sub !== "string") return null;
    if (typeof payload.username !== "string") return null;
    if (typeof payload.role !== "string") return null;
    return {
      userId: payload.sub,
      username: payload.username,
      fullName: typeof payload.fullName === "string" ? payload.fullName : payload.username,
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

/** Đọc session hiện tại từ cookie. Trả về null nếu chưa đăng nhập. */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
