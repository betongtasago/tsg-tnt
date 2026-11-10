import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { VehiclesClient } from "./vehicles-client";

export const dynamic = "force-dynamic";

export default async function VehiclesPage() {
  const session = await requirePermission("vehicles", "view");

  const [vehicles, stations, drivers] = await Promise.all([
    prisma.vehicle.findMany({
      include: {
        station: true,
        driver: { select: { id: true, code: true, fullName: true } },
        documents: { select: { docType: true, expiryDate: true } },
      },
      orderBy: { plate: "asc" },
    }),
    prisma.station.findMany({ where: { isActive: true }, orderBy: { code: "asc" } }),
    prisma.driver.findMany({
      where: { status: { in: ["WORKING", "LEAVE"] } },
      select: { id: true, code: true, fullName: true },
      orderBy: { code: "asc" },
    }),
  ]);

  const rows = vehicles.map((v) => {
    const reg = v.documents.find((d) => d.docType === "DANG_KIEM");
    const ins = v.documents.find((d) => d.docType === "BAO_HIEM_TNDS");
    return {
      id: v.id,
      plate: v.plate,
      code: v.code ?? "",
      type: v.type,
      brand: v.brand ?? "",
      year: v.year ?? null,
      capacity: v.capacity ?? null,
      driverId: v.driverId ?? "",
      driverName: v.driver ? `${v.driver.code} — ${v.driver.fullName}` : "",
      stationId: v.stationId ?? "",
      stationCode: v.station?.code ?? "—",
      status: v.status,
      registrationDate: v.registrationDate ? v.registrationDate.toISOString().slice(0, 10) : "",
      registrationExpiry: reg?.expiryDate
        ? reg.expiryDate.toISOString().slice(0, 10)
        : v.registrationExpiry
          ? v.registrationExpiry.toISOString().slice(0, 10)
          : "",
      insuranceExpiry: ins?.expiryDate
        ? ins.expiryDate.toISOString().slice(0, 10)
        : v.insuranceExpiry
          ? v.insuranceExpiry.toISOString().slice(0, 10)
          : "",
      note: v.note ?? "",
    };
  });

  return (
    <div>
      <PageHeader
        title="Quản lý phương tiện"
        description="Đội xe bồn, xe tải, xe bơm — tình trạng hoạt động và hạn giấy tờ"
      />
      <VehiclesClient
        rows={rows}
        stations={stations.map((s) => ({ id: s.id, label: `${s.code} — ${s.name}` }))}
        drivers={drivers.map((d) => ({ id: d.id, label: `${d.code} — ${d.fullName}` }))}
        canCreate={can(session.role, "vehicles", "create")}
        canUpdate={can(session.role, "vehicles", "update")}
        canDelete={can(session.role, "vehicles", "delete")}
        canExport={can(session.role, "vehicles", "export")}
      />
    </div>
  );
}
