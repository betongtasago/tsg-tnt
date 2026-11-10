import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import { reportSchema, updateReport, deleteReport } from "@/lib/reports";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "production", "update")) {
    return NextResponse.json({ error: "Không có quyền sửa báo cáo" }, { status: 403 });
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
    const report = await updateReport(params.id, parsed.data, session);
    return NextResponse.json({ ok: true, report });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lỗi không xác định";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Trùng báo cáo khác cùng ngày, ca, trạm, công trình và mác." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "production", "delete")) {
    return NextResponse.json({ error: "Không có quyền xóa báo cáo" }, { status: 403 });
  }

  try {
    await deleteReport(params.id, session);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Không xóa được báo cáo" }, { status: 500 });
  }
}
