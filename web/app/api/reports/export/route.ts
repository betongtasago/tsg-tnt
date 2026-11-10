import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import { listReports, reportSummary } from "@/lib/reports";
import { writeAudit } from "@/lib/audit";
import { SHIFT_LABEL, REPORT_STATUS_LABEL, fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "production", "export")) {
    return NextResponse.json({ error: "Không có quyền xuất dữ liệu" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const filters = {
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    stationId: searchParams.get("stationId") ?? undefined,
    customerId: searchParams.get("customerId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    q: searchParams.get("q") ?? undefined,
  };

  const [rows, summary] = await Promise.all([listReports(filters), reportSummary(filters)]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "TSG-TNT";
  wb.created = new Date();

  const ws = wb.addWorksheet("Bao cao san xuat", {
    views: [{ state: "frozen", ySplit: 4 }],
  });

  ws.columns = [
    { header: "STT", key: "stt", width: 6 },
    { header: "Ngày", key: "date", width: 12 },
    { header: "Ca", key: "shift", width: 11 },
    { header: "Trạm", key: "station", width: 10 },
    { header: "Công trình", key: "customer", width: 32 },
    { header: "Mác", key: "grade", width: 9 },
    { header: "Độ sụt", key: "slump", width: 9 },
    { header: "KH (m³)", key: "planned", width: 12 },
    { header: "Thực tế (m³)", key: "actual", width: 13 },
    { header: "% HT", key: "pct", width: 9 },
    { header: "Số xe", key: "trucks", width: 8 },
    { header: "Chuyến", key: "trips", width: 8 },
    { header: "Bắt đầu", key: "start", width: 9 },
    { header: "Kết thúc", key: "end", width: 9 },
    { header: "Phụ trách", key: "supervisor", width: 20 },
    { header: "Trạng thái", key: "status", width: 12 },
    { header: "Ghi chú sự cố", key: "note", width: 40 },
  ];

  // Tiêu đề
  ws.mergeCells("A1:Q1");
  const title = ws.getCell("A1");
  title.value = "CÔNG TY CỔ PHẦN SX KD DV BÊ TÔNG TSG TNT — BÁO CÁO SẢN XUẤT";
  title.font = { bold: true, size: 13 };
  title.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 24;

  ws.mergeCells("A2:Q2");
  const sub = ws.getCell("A2");
  const period =
    filters.from || filters.to
      ? `Kỳ: ${filters.from ?? "…"} → ${filters.to ?? "…"}`
      : "Kỳ: toàn bộ dữ liệu";
  sub.value = `${period}  |  Xuất lúc: ${new Date().toLocaleString("vi-VN")}  |  Người xuất: ${session.fullName}`;
  sub.font = { size: 10, italic: true };
  sub.alignment = { horizontal: "center" };

  ws.getRow(3).height = 6;

  // Header dòng 4
  const headerRow = ws.getRow(4);
  ws.columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header as string;
    cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B2D5C" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
  headerRow.height = 30;

  // Dữ liệu
  rows.forEach((r, i) => {
    const pct = r.plannedVolume > 0 ? Math.round((r.actualVolume / r.plannedVolume) * 100) : 0;
    const row = ws.addRow({
      stt: i + 1,
      date: fmtDate(r.reportDate),
      shift: SHIFT_LABEL[r.shift],
      station: r.station.code,
      customer: r.customer?.name ?? "—",
      grade: r.grade,
      slump: r.slump ?? "",
      planned: r.plannedVolume,
      actual: r.actualVolume,
      pct: `${pct}%`,
      trucks: r.truckCount,
      trips: r.tripCount,
      start: r.startTime ?? "",
      end: r.endTime ?? "",
      supervisor: r.supervisorName ?? "",
      status: REPORT_STATUS_LABEL[r.status],
      note: r.incidentNote ?? "",
    });

    row.eachCell((cell) => {
      cell.font = { size: 10 };
      cell.border = {
        top: { style: "hair" },
        left: { style: "hair" },
        bottom: { style: "hair" },
        right: { style: "hair" },
      };
    });
    row.getCell("planned").numFmt = "#,##0.0";
    row.getCell("actual").numFmt = "#,##0.0";
    row.getCell("actual").font = { size: 10, bold: true };
  });

  // Dòng tổng
  const totalRow = ws.addRow({
    stt: "",
    date: "",
    shift: "",
    station: "",
    customer: "TỔNG CỘNG",
    grade: "",
    slump: "",
    planned: summary.totalPlanned,
    actual: summary.totalActual,
    pct: `${summary.completion}%`,
    trucks: "",
    trips: summary.totalTrips,
    start: "",
    end: "",
    supervisor: "",
    status: "",
    note: "",
  });
  totalRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EEF7" } };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
  totalRow.getCell("planned").numFmt = "#,##0.0";
  totalRow.getCell("actual").numFmt = "#,##0.0";

  // Sheet tổng hợp
  const ws2 = wb.addWorksheet("Tong hop");
  ws2.columns = [
    { header: "Nhóm", key: "group", width: 16 },
    { header: "Tên", key: "name", width: 38 },
    { header: "Kế hoạch (m³)", key: "planned", width: 15 },
    { header: "Thực tế (m³)", key: "actual", width: 15 },
    { header: "Tỷ lệ", key: "pct", width: 10 },
    { header: "Số chuyến", key: "trips", width: 12 },
  ];
  const h2 = ws2.getRow(1);
  ws2.columns.forEach((col, i) => {
    const cell = h2.getCell(i + 1);
    cell.value = col.header as string;
    cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B2D5C" } };
    cell.alignment = { horizontal: "center" };
  });

  for (const s of summary.byStation) {
    ws2.addRow({
      group: "Trạm",
      name: `${s.code} — ${s.name}`,
      planned: s.planned,
      actual: s.actual,
      pct: s.planned > 0 ? `${Math.round((s.actual / s.planned) * 100)}%` : "0%",
      trips: s.trips,
    });
  }
  for (const c of summary.byCustomer) {
    ws2.addRow({
      group: "Công trình",
      name: c.name,
      planned: c.planned,
      actual: c.actual,
      pct: c.planned > 0 ? `${Math.round((c.actual / c.planned) * 100)}%` : "0%",
      trips: "",
    });
  }
  ws2.eachRow((row, idx) => {
    if (idx === 1) return;
    row.getCell("planned").numFmt = "#,##0.0";
    row.getCell("actual").numFmt = "#,##0.0";
  });

  const buffer = await wb.xlsx.writeBuffer();

  await writeAudit(session, {
    action: "EXPORT",
    module: "production",
    detail: { format: "xlsx", rows: rows.length },
  });

  const filename = `TSG-TNT_BaoCaoSanXuat_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
