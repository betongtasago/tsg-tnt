import { prisma } from "@/lib/db";
import { getStations } from "@/lib/ref-data";
import { getMonthLog } from "@/lib/month-log";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { DriversClient } from "./drivers-client";
import { MonthLogClient } from "./month-log-client";
import { DriversTabs } from "./drivers-tabs";

export const dynamic = "force-dynamic";

export default async function DriversPage() {
  const session = await requirePermission("drivers", "view");

  const now = new Date();
  const vnNow = new Date(now.getTime() + 7 * 3600 * 1000);
  const vnYear = vnNow.getUTCFullYear();
  const vnMonth = vnNow.getUTCMonth() + 1;

  const [drivers, stations, companySetting, monthRows] = await Promise.all([
    prisma.driver.findMany({
      include: {
        station: true,
        vehicles: { select: { id: true, plate: true, code: true } },
        documents: { where: { docType: "GPLX" }, select: { expiryDate: true, licenseClass: true } },
      },
      orderBy: { code: "asc" },
    }),
    getStations(),
    prisma.systemSetting.findUnique({ where: { key: "company.name" } }),
    getMonthLog(vnYear, vnMonth),
  ]);

  const rows = drivers.map((d) => ({
    id: d.id,
    code: d.code,
    fullName: d.fullName,
    phone: d.phone ?? "",
    stationId: d.stationId ?? "",
    stationCode: d.station?.code ?? "—",
    joinDate: d.joinDate ? d.joinDate.toISOString().slice(0, 10) : "",
    status: d.status,
    shift: d.shift ?? "",
    note: d.note ?? "",
    vehicles: d.vehicles.map((v) => v.plate),
    licenseClass: d.documents[0]?.licenseClass ?? "",
    licenseExpiry: d.documents[0]?.expiryDate
      ? d.documents[0].expiryDate.toISOString().slice(0, 10)
      : "",
  }));

  return (
    <div>
      <PageHeader
        title="Bảng tài / Quản lý tài xế"
        description="Danh sách tài xế, phân công phương tiện và bảng theo dõi lịch tài tháng"
      />
      <DriversTabs
        list={
          <DriversClient
            rows={rows}
            stations={stations.map((s) => ({ id: s.id, label: `${s.code} — ${s.name}` }))}
            canCreate={can(session.role, "drivers", "create")}
            canUpdate={can(session.role, "drivers", "update")}
            canDelete={can(session.role, "drivers", "delete")}
            canExport={can(session.role, "drivers", "export")}
          />
        }
        monthLog={
          <MonthLogClient
            initialYear={vnYear}
            initialMonth={vnMonth}
            initialRows={monthRows}
            canUpdate={can(session.role, "drivers", "update")}
            canExport={can(session.role, "drivers", "export")}
            companyName={companySetting?.value ?? "CTCP SX KD DV Bê tông TSG-TNT"}
          />
        }
      />
    </div>
  );
}
