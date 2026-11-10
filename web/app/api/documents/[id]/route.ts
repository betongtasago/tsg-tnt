import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import { documentSchema, dateOrNull } from "@/lib/validators";
import { writeAudit } from "@/lib/audit";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "documents", "update")) {
    return NextResponse.json({ error: "Không có quyền sửa giấy tờ" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = documentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const d = parsed.data;

  try {
    const doc = await prisma.document.update({
      where: { id: params.id },
      data: {
        docType: d.docType,
        number: d.number || null,
        licenseClass: d.licenseClass || null,
        issuedDate: dateOrNull(d.issuedDate),
        expiryDate: dateOrNull(d.expiryDate),
        note: d.note || null,
      },
    });
    await writeAudit(session, { action: "UPDATE", module: "documents", entityId: doc.id, detail: { docType: doc.docType } });
    return NextResponse.json({ ok: true, document: doc });
  } catch {
    return NextResponse.json({ error: "Không lưu được giấy tờ" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "documents", "delete")) {
    return NextResponse.json({ error: "Không có quyền xóa giấy tờ" }, { status: 403 });
  }

  try {
    await prisma.document.delete({ where: { id: params.id } });
    await writeAudit(session, { action: "DELETE", module: "documents", entityId: params.id });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Không xóa được giấy tờ" }, { status: 500 });
  }
}
