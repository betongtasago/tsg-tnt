import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import { documentSchema, dateOrNull } from "@/lib/validators";
import { writeAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "documents", "create")) {
    return NextResponse.json({ error: "Không có quyền thêm giấy tờ" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = documentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const d = parsed.data;

  if (d.entity === "VEHICLE" && !d.vehicleId) {
    return NextResponse.json({ error: "Chọn phương tiện cho giấy tờ này" }, { status: 400 });
  }
  if (d.entity === "DRIVER" && !d.driverId) {
    return NextResponse.json({ error: "Chọn tài xế cho giấy tờ này" }, { status: 400 });
  }

  // GPLX: mỗi tài xế chỉ giữ một bản ghi hiện hành
  if (d.docType === "GPLX" && d.driverId) {
    const existing = await prisma.document.findFirst({
      where: { driverId: d.driverId, docType: "GPLX" },
    });
    if (existing) {
      const updated = await prisma.document.update({
        where: { id: existing.id },
        data: {
          number: d.number || existing.number,
          licenseClass: d.licenseClass || existing.licenseClass,
          issuedDate: dateOrNull(d.issuedDate) ?? existing.issuedDate,
          expiryDate: dateOrNull(d.expiryDate) ?? existing.expiryDate,
          note: d.note || existing.note,
        },
      });
      await writeAudit(session, { action: "UPDATE", module: "documents", entityId: updated.id, detail: { docType: "GPLX" } });
      return NextResponse.json({ ok: true, document: updated });
    }
  }

  const doc = await prisma.document.create({
    data: {
      entity: d.entity,
      docType: d.docType,
      vehicleId: d.entity === "VEHICLE" ? d.vehicleId : null,
      driverId: d.entity === "DRIVER" ? d.driverId : null,
      number: d.number || null,
      licenseClass: d.licenseClass || null,
      issuedDate: dateOrNull(d.issuedDate),
      expiryDate: dateOrNull(d.expiryDate),
      note: d.note || null,
    },
  });

  await writeAudit(session, { action: "CREATE", module: "documents", entityId: doc.id, detail: { docType: doc.docType } });
  return NextResponse.json({ ok: true, document: doc });
}
