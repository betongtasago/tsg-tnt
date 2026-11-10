import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import { submitReport, approveReport } from "@/lib/reports";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  let action = "submit";
  try {
    const body = (await req.json()) as { action?: string };
    action = body.action ?? "submit";
  } catch {
    // mặc định submit
  }

  if (action === "approve") {
    if (!can(session.role, "production", "update")) {
      return NextResponse.json({ error: "Không có quyền duyệt báo cáo" }, { status: 403 });
    }
    const report = await approveReport(params.id, session);
    return NextResponse.json({ ok: true, report });
  }

  if (!can(session.role, "production", "update")) {
    return NextResponse.json({ error: "Không có quyền gửi báo cáo" }, { status: 403 });
  }

  try {
    const { report, telegram } = await submitReport(params.id, session);
    return NextResponse.json({
      ok: true,
      report,
      telegram: {
        sent: telegram.ok,
        skipped: telegram.skipped ?? false,
        error: telegram.error ?? null,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Không gửi được báo cáo" },
      { status: 500 }
    );
  }
}
