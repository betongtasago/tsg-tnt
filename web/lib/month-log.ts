import { prisma } from "@/lib/db";

export type MonthLogRow = {
  driverId: string;
  driverCode: string;
  driverName: string;
  stationCode: string;
  vehiclePlate: string;
  taiNgay: number | null;
  timeValue: number | null;
  leaveRepair: string;
  note: string;
  lan1: number;
  lan2: number;
  lan3: number;
  odometer: number | null;
  tireDate: string;
};

/**
 * Đọc bảng theo dõi tài xế của một tháng.
 * Dùng chung cho API GET và cho server component để trang hiện dữ liệu ngay,
 * không phải chờ thêm một vòng fetch nữa.
 */
export async function getMonthLog(year: number, month: number): Promise<MonthLogRow[]> {
  const [drivers, logs] = await Promise.all([
    prisma.driver.findMany({
      where: { status: { not: "RESIGNED" } },
      select: {
        id: true,
        code: true,
        fullName: true,
        station: { select: { code: true } },
        vehicles: { select: { plate: true }, take: 1 },
      },
      orderBy: [{ station: { code: "asc" } }, { code: "asc" }],
    }),
    prisma.driverMonthLog.findMany({ where: { year, month } }),
  ]);

  const byDriver = new Map(logs.map((l) => [l.driverId, l]));

  return drivers.map((d) => {
    const log = byDriver.get(d.id);
    return {
      driverId: d.id,
      driverCode: d.code,
      driverName: d.fullName,
      stationCode: d.station?.code ?? "—",
      vehiclePlate: log?.vehiclePlate ?? d.vehicles[0]?.plate ?? "",
      taiNgay: log?.taiNgay ?? null,
      timeValue: log?.timeValue ?? null,
      leaveRepair: log?.leaveRepair ?? "",
      note: log?.note ?? "",
      lan1: log?.lan1 ?? 0,
      lan2: log?.lan2 ?? 0,
      lan3: log?.lan3 ?? 0,
      odometer: log?.odometer ?? null,
      tireDate: log?.tireDate ? log.tireDate.toISOString().slice(0, 10) : "",
    };
  });
}
