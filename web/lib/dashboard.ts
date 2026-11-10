import { prisma } from "./db";
import { addDays, daysUntil, vnParts, vnStartOfDay, vnStartOfMonth } from "./utils";

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

export async function getDashboardData() {
  const now = new Date();
  const today = vnStartOfDay(now);
  const monthStart = vnStartOfMonth(now);
  const weekAgo = addDays(today, -6);

  const [
    todayReports,
    monthReports,
    weekReports,
    vehicleStatusGroups,
    driverStatusGroups,
    documents,
    cameras,
    recentEvents,
    todayEventCount,
    unknownEventCount,
    stations,
  ] = await Promise.all([
    prisma.productionReport.findMany({
      where: { reportDate: { gte: today } },
      include: { station: true, customer: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.productionReport.findMany({
      where: { reportDate: { gte: monthStart } },
      include: { station: true },
    }),
    prisma.productionReport.findMany({
      where: { reportDate: { gte: weekAgo } },
      include: { station: true },
    }),
    prisma.vehicle.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.driver.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.document.findMany({
      select: { id: true, docType: true, expiryDate: true, entity: true },
    }),
    prisma.camera.findMany({ select: { id: true, status: true, name: true, lastSeenAt: true } }),
    prisma.detectionEvent.findMany({
      where: { detectedAt: { gte: weekAgo } },
      include: { camera: { select: { name: true } }, vehicle: { select: { plate: true } } },
      orderBy: { detectedAt: "desc" },
      take: 8,
    }),
    prisma.detectionEvent.count({ where: { detectedAt: { gte: today } } }),
    prisma.detectionEvent.count({
      where: { detectedAt: { gte: today }, matchStatus: "UNKNOWN" },
    }),
    prisma.station.findMany({ orderBy: { code: "asc" } }),
  ]);

  const sum = (rows: { actualVolume: number }[]) =>
    Math.round(rows.reduce((a, r) => a + r.actualVolume, 0) * 10) / 10;
  const sumPlanned = (rows: { plannedVolume: number }[]) =>
    Math.round(rows.reduce((a, r) => a + r.plannedVolume, 0) * 10) / 10;

  const todayVolume = sum(todayReports);
  const todayPlanned = sumPlanned(todayReports);
  const monthVolume = sum(monthReports);
  const monthPlanned = sumPlanned(monthReports);

  // Sản lượng theo trạm (tháng này)
  const byStation = stations.map((s) => {
    const rows = monthReports.filter((r) => r.stationId === s.id);
    return {
      code: s.code,
      name: s.name,
      actual: sum(rows),
      planned: sumPlanned(rows),
      trips: rows.reduce((a, r) => a + r.tripCount, 0),
      count: rows.length,
    };
  });

  // Sản lượng 7 ngày gần nhất
  const daily: { date: string; label: string; actual: number; planned: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = addDays(today, -i);
    const next = addDays(day, 1);
    const rows = weekReports.filter((r) => {
      const rd = new Date(r.reportDate);
      return rd >= day && rd < next;
    });
    const vp = vnParts(day);
    daily.push({
      date: day.toISOString().slice(0, 10),
      label: `${vp.day}/${vp.month}`,
      actual: sum(rows),
      planned: sumPlanned(rows),
    });
  }

  // Cảnh báo giấy tờ
  const docBuckets = { expired: 0, d3: 0, d7: 0, d15: 0, d30: 0, ok: 0, none: 0 };
  for (const doc of documents) {
    const days = daysUntil(doc.expiryDate);
    if (days === null) docBuckets.none++;
    else if (days < 0) docBuckets.expired++;
    else if (days <= 3) docBuckets.d3++;
    else if (days <= 7) docBuckets.d7++;
    else if (days <= 15) docBuckets.d15++;
    else if (days <= 30) docBuckets.d30++;
    else docBuckets.ok++;
  }

  const vehicleStatus = Object.fromEntries(
    vehicleStatusGroups.map((g) => [g.status, g._count._all])
  ) as Record<string, number>;
  const driverStatus = Object.fromEntries(
    driverStatusGroups.map((g) => [g.status, g._count._all])
  ) as Record<string, number>;

  const totalVehicles = Object.values(vehicleStatus).reduce((a, b) => a + b, 0);
  const activeVehicles = vehicleStatus.ACTIVE ?? 0;
  const camerasOnline = cameras.filter((c) => c.status === "ONLINE").length;

  return {
    today: {
      volume: todayVolume,
      planned: todayPlanned,
      reports: todayReports.length,
      trips: todayReports.reduce((a, r) => a + r.tripCount, 0),
      completion: todayPlanned > 0 ? Math.round((todayVolume / todayPlanned) * 100) : 0,
    },
    month: {
      volume: monthVolume,
      planned: monthPlanned,
      completion: monthPlanned > 0 ? Math.round((monthVolume / monthPlanned) * 100) : 0,
      reports: monthReports.length,
    },
    byStation,
    daily,
    docBuckets,
    docTotal: documents.length,
    vehicleStatus,
    totalVehicles,
    activeVehicles,
    driverStatus,
    totalDrivers: Object.values(driverStatus).reduce((a, b) => a + b, 0),
    cameras,
    camerasOnline,
    cameraTotal: cameras.length,
    recentEvents,
    todayEventCount,
    unknownEventCount,
    todayReports,
  };
}
