import { NextResponse } from "next/server";
import { SESSION_COOKIE, getSession } from "@/lib/session";
import { writeAudit, clientIp } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getSession();
  if (session) {
    await writeAudit(session, { action: "LOGOUT", module: "auth", ip: clientIp(req) });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
