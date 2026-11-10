import { z } from "zod";
import { prisma } from "./db";
import { writeAudit } from "./audit";
import { sendTelegram, escapeHtml } from "./telegram";
import type { SessionPayload } from "./session";
import { SHIFT_LABEL, fmtNum } from "./utils";

export const reportSchema = z.object({
  reportDate: z.string().min(1, "Chọn ngày sản xuất"),
  shift: z.enum(["SANG", "CHIEU", "DEM"]),
  stationId: z.string().min(1, "Chọn trạm trộn"),
  customerId: z.string().optional().nullable(),
  grade: z.string().min(1, "Nhập mác bê tông").max(40),
  slump: z.coerce.number().int().min(0).max(50).optional().nullable(),
  plannedVolume: z.coerce.number().min(0, "Khối lượng không âm").max(100000),
  actualVolume: z.coerce.number().min(0, "Khối lượng không âm").max(100000),
  truckCount: z.coerce.number().int().min(0).max(500),
  tripCount: z.coerce.number().int().min(0).max(2000),
  startTime: z.string().max(10).optional().nullable(),
  endTime: z.string().max(10).optional().nullable(),
  supervisorName: z.string().max(120).optional().nullable(),
  incidentNote: z.string().max(2000).optional().nullable(),
});

export type ReportInput = z.infer<typeof reportSchema>;

/** Chuyển "yyyy-mm-dd" thành Date ở UTC nửa đêm để khớp cột @db.Date. */
export function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) throw new Error("Ngày không hợp lệ");
  return new Date(Date.UTC(y, m - 1, d));
}

export async function listReports(filters: {
  from?: string;
  to?: string;
  stationId?: string;
  customerId?: string;
  status?: string;
  q?: string;
}) {
  const where: Record<string, unknown> = {};

  if (filters.from || filters.to) {
    const range: Record<string, Date> = {};
    if (filters.from) range.gte = parseDateOnly(filters.from);
    if (filters.to) range.lte = parseDateOnly(filters.to);
    where.reportDate = range;
  }
  if (filters.stationId) where.stationId = filters.stationId;
  if (filters.customerId) where.customerId = filters.customerId;
  if (filters.status) where.status = filters.status;
  if (filters.q) {
    where.OR = [
      { grade: { contains: filters.q, mode: "insensitive" } },
      { supervisorName: { contains: filters.q, mode: "insensitive" } },
      { customer: { name: { contains: filters.q, mode: "insensitive" } } },
    ];
  }

  return prisma.productionReport.findMany({
    where,
    include: { station: true, customer: true, createdBy: { select: { fullName: true } } },
    orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }],
    take: 500,
  });
}

export async function reportSummary(filters: { from?: string; to?: string }) {
  const where: Record<string, unknown> = {};
  if (filters.from || filters.to) {
    const range: Record<string, Date> = {};
    if (filters.from) range.gte = parseDateOnly(filters.from);
    if (filters.to) range.lte = parseDateOnly(filters.to);
    where.reportDate = range;
  }

  const rows = await prisma.productionReport.findMany({
    where,
    include: { station: true, customer: true },
  });

  const round = (n: number) => Math.round(n * 10) / 10;

  const byStation = new Map<string, { code: string; name: string; actual: number; planned: number; trips: number; rows: number }>();
  const byCustomer = new Map<string, { name: string; actual: number; planned: number; rows: number }>();

  for (const r of rows) {
    const st = byStation.get(r.stationId) ?? {
      code: r.station.code,
      name: r.station.name,
      actual: 0,
      planned: 0,
      trips: 0,
      rows: 0,
    };
    st.actual += r.actualVolume;
    st.planned += r.plannedVolume;
    st.trips += r.tripCount;
    st.rows += 1;
    byStation.set(r.stationId, st);

    const key = r.customerId ?? "none";
    const cu = byCustomer.get(key) ?? {
      name: r.customer?.name ?? "Không gắn công trình",
      actual: 0,
      planned: 0,
      rows: 0,
    };
    cu.actual += r.actualVolume;
    cu.planned += r.plannedVolume;
    cu.rows += 1;
    byCustomer.set(key, cu);
  }

  const totalActual = round(rows.reduce((a, r) => a + r.actualVolume, 0));
  const totalPlanned = round(rows.reduce((a, r) => a + r.plannedVolume, 0));

  return {
    totalActual,
    totalPlanned,
    totalTrips: rows.reduce((a, r) => a + r.tripCount, 0),
    rowCount: rows.length,
    completion: totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0,
    byStation: [...byStation.values()]
      .map((s) => ({ ...s, actual: round(s.actual), planned: round(s.planned) }))
      .sort((a, b) => b.actual - a.actual),
    byCustomer: [...byCustomer.values()]
      .map((c) => ({ ...c, actual: round(c.actual), planned: round(c.planned) }))
      .sort((a, b) => b.actual - a.actual),
  };
}

export async function createReport(input: ReportInput, session: SessionPayload) {
  const report = await prisma.productionReport.create({
    data: {
      reportDate: parseDateOnly(input.reportDate),
      shift: input.shift,
      stationId: input.stationId,
      customerId: input.customerId || null,
      grade: input.grade.trim().toUpperCase(),
      slump: input.slump ?? null,
      plannedVolume: input.plannedVolume,
      actualVolume: input.actualVolume,
      truckCount: input.truckCount,
      tripCount: input.tripCount,
      startTime: input.startTime || null,
      endTime: input.endTime || null,
      supervisorName: input.supervisorName || null,
      incidentNote: input.incidentNote || null,
      status: "DRAFT",
      createdById: session.userId,
    },
    include: { station: true, customer: true },
  });

  await writeAudit(session, {
    action: "CREATE",
    module: "production",
    entityId: report.id,
    detail: { grade: report.grade, volume: report.actualVolume },
  });

  return report;
}

export async function updateReport(id: string, input: ReportInput, session: SessionPayload) {
  const report = await prisma.productionReport.update({
    where: { id },
    data: {
      reportDate: parseDateOnly(input.reportDate),
      shift: input.shift,
      stationId: input.stationId,
      customerId: input.customerId || null,
      grade: input.grade.trim().toUpperCase(),
      slump: input.slump ?? null,
      plannedVolume: input.plannedVolume,
      actualVolume: input.actualVolume,
      truckCount: input.truckCount,
      tripCount: input.tripCount,
      startTime: input.startTime || null,
      endTime: input.endTime || null,
      supervisorName: input.supervisorName || null,
      incidentNote: input.incidentNote || null,
    },
    include: { station: true, customer: true },
  });

  await writeAudit(session, {
    action: "UPDATE",
    module: "production",
    entityId: id,
    detail: { grade: report.grade, volume: report.actualVolume },
  });

  return report;
}

/** Gửi báo cáo cho Ban Giám đốc: đổi trạng thái + gửi Telegram. */
export async function submitReport(id: string, session: SessionPayload) {
  const report = await prisma.productionReport.update({
    where: { id },
    data: { status: "SUBMITTED", submittedAt: new Date() },
    include: { station: true, customer: true },
  });

  await writeAudit(session, {
    action: "SEND",
    module: "production",
    entityId: id,
    detail: { channel: "telegram", status: "SUBMITTED" },
  });

  const dateStr = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(report.reportDate);

  const text = [
    "📊 <b>TSG-TNT — BÁO CÁO SẢN XUẤT</b>",
    "",
    `• Ngày: <b>${dateStr}</b>`,
    `• Ca: ${SHIFT_LABEL[report.shift]}`,
    `• Trạm: ${escapeHtml(report.station.code)}`,
    `• Công trình: ${escapeHtml(report.customer?.name ?? "—")}`,
    `• Mác: <b>${escapeHtml(report.grade)}</b> · Độ sụt ${report.slump ?? "—"} cm`,
    `• Khối lượng: <b>${fmtNum(report.actualVolume)} m³</b> / KH ${fmtNum(report.plannedVolume)} m³`,
    `• Số xe: ${report.truckCount} · Số chuyến: ${report.tripCount}`,
    `• Người phụ trách: ${escapeHtml(report.supervisorName ?? "—")}`,
    report.incidentNote ? `\n⚠️ <b>Sự cố:</b> ${escapeHtml(report.incidentNote)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await sendTelegram("REPORT", text);

  return { report, telegram: result };
}

export async function approveReport(id: string, session: SessionPayload) {
  const report = await prisma.productionReport.update({
    where: { id },
    data: { status: "APPROVED", approvedById: session.userId, approvedAt: new Date() },
  });

  await writeAudit(session, { action: "UPDATE", module: "production", entityId: id, detail: { status: "APPROVED" } });
  return report;
}

export async function deleteReport(id: string, session: SessionPayload) {
  await prisma.productionReport.delete({ where: { id } });
  await writeAudit(session, { action: "DELETE", module: "production", entityId: id });
}
