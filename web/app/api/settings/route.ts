import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import { writeAudit, clientIp } from "@/lib/audit";

const ALLOWED_KEYS = [
  "company.name",
  "company.shortName",
  "company.address",
  "company.phone",
  "company.email",
  "company.taxCode",
  "company.representative",
  "report.autoSendTime",
  "report.autoSendEnabled",
  "report.templateNote",
  "system.timezone",
] as const;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "settings", "view")) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const rows = await prisma.systemSetting.findMany();
  const settings: Record<string, string> = {};
  for (const r of rows) settings[r.key] = r.value;

  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "settings", "update")) {
    return NextResponse.json({ error: "Không có quyền sửa cài đặt" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, string> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const updates = Object.entries(body).filter(([k]) =>
    (ALLOWED_KEYS as readonly string[]).includes(k)
  );

  if (updates.length === 0) {
    return NextResponse.json({ error: "Không có cài đặt nào hợp lệ" }, { status: 400 });
  }

  for (const [key, value] of updates) {
    await prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: String(value ?? "") },
      update: { value: String(value ?? "") },
    });
  }

  await writeAudit(session, {
    action: "UPDATE",
    module: "settings",
    detail: { keys: updates.map(([k]) => k) },
    ip: clientIp(req),
  });

  return NextResponse.json({ ok: true, updated: updates.length });
}
