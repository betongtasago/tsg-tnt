import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { DRIVER_STATUS_LABEL, SHIFT_LABEL, fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "drivers", "export")) {
    return NextResponse.json({ error: "Không có quyền xuất dữ liệu" }, { status: 403 });
  }

  const drivers = await prisma.driver.findMany({
    include: {
      station: true,
      vehicles: { select: { plate: true } },
      documents: { where: { docType: "GPLX" }, select: { licenseClass: true, expiryDate: true } },
    },
    orderBy: { code: "asc" },
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Danh sach tai xe");

  ws.columns = [
    { header: "Mã", key: "code", width: 10 },
    { header: "Họ và tên", key: "name", width: 26 },
    { header: "Điện thoại", key: "phone", width: 15 },
    { header: "Trạm", key: "station", width: 10 },
    { header: "Xe phụ trách", key: "vehicles", width: 20 },
    { header: "Ca", key: "shift", width: 11 },
    { header: "Ngày vào làm", key: "join", width: 13 },
    { header: "Hạng GPLX", key: "class", width: 11 },
    { header: "Hạn GPLX", key: "expiry", width: 13 },
    { header: "Trạng thái", key: "status", width: 14 },
    { header: "Ghi chú", key: "note", width: 34 },
  ];

  ws.mergeCells("A1:K1");
  const title = ws.getCell("A1");
  title.value = "DANH SÁCH TÀI XẾ — TSG-TNT";
  title.font = { bold: true, size: 13 };
  title.alignment = { horizontal: "center" };
  ws.getRow(1).height = 22;

  const header = ws.getRow(2);
  ws.columns.forEach((col, i) => {
    const cell = header.getCell(i + 1);
    cell.value = col.header as string;
    cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B2D5C" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });
  ws.getRow(2).height = 26;

  for (const d of drivers) {
    const gplx = d.documents[0];
    ws.addRow({
      code: d.code,
      name: d.fullName,
      phone: d.phone ?? "",
      station: d.station?.code ?? "",
      vehicles: d.vehicles.map((v) => v.plate).join(", "),
      shift: d.shift ? SHIFT_LABEL[d.shift] : "",
      join: d.joinDate ? fmtDate(d.joinDate) : "",
      class: gplx?.licenseClass ?? "",
      expiry: gplx?.expiryDate ? fmtDate(gplx.expiryDate) : "",
      status: DRIVER_STATUS_LABEL[d.status],
      note: d.note ?? "",
    });
  }

  ws.eachRow((row, idx) => {
    if (idx <= 2) return;
    row.eachCell((cell) => {
      cell.font = { size: 10 };
      cell.border = {
        top: { style: "hair" },
        left: { style: "hair" },
        bottom: { style: "hair" },
        right: { style: "hair" },
      };
    });
  });

  await writeAudit(session, { action: "EXPORT", module: "drivers", detail: { rows: drivers.length } });

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="TSG-TNT_DanhSachTaiXe_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
