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

export const REPORTS_PAGE_SIZE = 50;

/** Đếm số dòng khớp bộ lọc, để phân trang. */
export async function countReports(filters: {
  from?: string;
  to?: string;
  stationId?: string;
  customerId?: string;
  status?: string;
  q?: string;
}) {
  const where = buildReportWhere(filters);
  return prisma.productionReport.count({ where });
}

/** Một trang báo cáo — chỉ tải đúng số dòng cần hiển thị. */
export async function listReportsPage(
  filters: {
    from?: string;
    to?: string;
    stationId?: string;
    customerId?: string;
    status?: string;
    q?: string;
  },
  page = 1,
  pageSize = REPORTS_PAGE_SIZE
) {
  const where = buildReportWhere(filters);
  const safePage = Math.max(1, page);
  return prisma.productionReport.findMany({
    where,
    select: {
      id: true,
      reportDate: true,
      shift: true,
      grade: true,
      plannedVolume: true,
      actualVolume: true,
      tripCount: true,
      status: true,
      station: { select: { code: true } },
      customer: { select: { name: true } },
    },
    orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }],
    skip: (safePage - 1) * pageSize,
    take: pageSize,
  });
}

function buildReportWhere(filters: {
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
  return where;
}

export async function reportSummary(filters: { from?: string; to?: string }) {
  const where: Record<string, unknown> = {};
  if (filters.from || filters.to) {
    const range: Record<string, Date> = {};
    if (filters.from) range.gte = parseDateOnly(filters.from);
    if (filters.to) range.lte = parseDateOnly(filters.to);
    where.reportDate = range;
  }

  // Tổng hợp bằng SQL thay vì kéo toàn bộ dòng về Node.
  // Trước đây mỗi lần mở trang phải tải cả bảng + join station/customer.
  const [totals, stationGroups, customerGroups, stations] = await Promise.all([
    prisma.productionReport.aggregate({
      where,
      _sum: { actualVolume: true, plannedVolume: true, tripCount: true },
      _count: { _all: true },
    }),
    prisma.productionReport.groupBy({
      by: ["stationId"],
      where,
      _sum: { actualVolume: true, plannedVolume: true, tripCount: true },
      _count: { _all: true },
    }),
    prisma.productionReport.groupBy({
      by: ["customerId"],
      where,
      _sum: { actualVolume: true, plannedVolume: true },
      _count: { _all: true },
    }),
    prisma.station.findMany({ select: { id: true, code: true, name: true } }),
  ]);

  const stationMap = new Map(stations.map((s) => [s.id, s]));
  const customerIds = customerGroups.map((g) => g.customerId).filter((x): x is string => Boolean(x));
  const customers = customerIds.length
    ? await prisma.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, name: true },
      })
    : [];
  const customerMap = new Map(customers.map((c) => [c.id, c.name]));

  const round = (n: number) => Math.round(n * 10) / 10;

  const byStation = stationGroups
    .map((g) => {
      const st = stationMap.get(g.stationId);
      return {
        code: st?.code ?? "—",
        name: st?.name ?? "—",
        actual: round(g._sum.actualVolume ?? 0),
        planned: round(g._sum.plannedVolume ?? 0),
        trips: g._sum.tripCount ?? 0,
        rows: g._count._all,
      };
    })
    .sort((a, b) => b.actual - a.actual);

  const byCustomer = customerGroups
    .map((g) => ({
      name: g.customerId ? (customerMap.get(g.customerId) ?? "—") : "Không gắn công trình",
      actual: round(g._sum.actualVolume ?? 0),
      planned: round(g._sum.plannedVolume ?? 0),
      rows: g._count._all,
    }))
    .sort((a, b) => b.actual - a.actual);

  const totalActual = round(totals._sum.actualVolume ?? 0);
  const totalPlanned = round(totals._sum.plannedVolume ?? 0);

  return {
    totalActual,
    totalPlanned,
    totalTrips: totals._sum.tripCount ?? 0,
    rowCount: totals._count._all,
    completion: totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0,
    byStation,
    byCustomer,
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
