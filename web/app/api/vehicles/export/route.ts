import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { VEHICLE_STATUS_LABEL, VEHICLE_TYPE_LABEL, fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "vehicles", "export")) {
    return NextResponse.json({ error: "Không có quyền xuất dữ liệu" }, { status: 403 });
  }

  const vehicles = await prisma.vehicle.findMany({
    include: { station: true, driver: true, documents: true },
    orderBy: { plate: "asc" },
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Danh sach phuong tien");

  ws.columns = [
    { header: "Biển số", key: "plate", width: 14 },
    { header: "Mã", key: "code", width: 10 },
    { header: "Loại", key: "type", width: 11 },
    { header: "Nhãn hiệu", key: "brand", width: 14 },
    { header: "Năm SX", key: "year", width: 9 },
    { header: "Tải trọng (m³)", key: "capacity", width: 13 },
    { header: "Tài xế", key: "driver", width: 26 },
    { header: "Trạm", key: "station", width: 10 },
    { header: "Hạn đăng kiểm", key: "reg", width: 14 },
    { header: "Hạn bảo hiểm", key: "ins", width: 14 },
    { header: "Trạng thái", key: "status", width: 16 },
    { header: "Ghi chú", key: "note", width: 34 },
  ];

  ws.mergeCells("A1:L1");
  const title = ws.getCell("A1");
  title.value = "DANH SÁCH PHƯƠNG TIỆN — TSG-TNT";
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

  for (const v of vehicles) {
    const reg = v.documents.find((d) => d.docType === "DANG_KIEM");
    const ins = v.documents.find((d) => d.docType === "BAO_HIEM_TNDS");
    ws.addRow({
      plate: v.plate,
      code: v.code ?? "",
      type: VEHICLE_TYPE_LABEL[v.type],
      brand: v.brand ?? "",
      year: v.year ?? "",
      capacity: v.capacity ?? "",
      driver: v.driver ? `${v.driver.code} — ${v.driver.fullName}` : "",
      station: v.station?.code ?? "",
      reg: (reg?.expiryDate ?? v.registrationExpiry) ? fmtDate(reg?.expiryDate ?? v.registrationExpiry) : "",
      ins: (ins?.expiryDate ?? v.insuranceExpiry) ? fmtDate(ins?.expiryDate ?? v.insuranceExpiry) : "",
      status: VEHICLE_STATUS_LABEL[v.status],
      note: v.note ?? "",
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

  await writeAudit(session, { action: "EXPORT", module: "vehicles", detail: { rows: vehicles.length } });

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="TSG-TNT_PhuongTien_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
