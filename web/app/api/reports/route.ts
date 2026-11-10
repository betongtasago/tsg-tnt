import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import { reportSchema, createReport } from "@/lib/reports";
import { clientIp, writeAudit } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "production", "view")) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const where: Record<string, unknown> = {};
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.gte = new Date(`${from}T00:00:00.000Z`);
    if (to) range.lte = new Date(`${to}T00:00:00.000Z`);
    where.reportDate = range;
  }

  const rows = await prisma.productionReport.findMany({
    where,
    include: { station: true, customer: true },
    orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }],
    take: 300,
  });

  return NextResponse.json({ rows });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "production", "create")) {
    return NextResponse.json({ error: "Không có quyền tạo báo cáo" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 400 }
    );
  }

  try {
    const report = await createReport(parsed.data, session);
    return NextResponse.json({ ok: true, report });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lỗi không xác định";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Đã có báo cáo trùng ngày, ca, trạm, công trình và mác bê tông." },
        { status: 409 }
      );
    }
    await writeAudit(session, { action: "CREATE", module: "production", detail: { error: msg }, ip: clientIp(req) });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
