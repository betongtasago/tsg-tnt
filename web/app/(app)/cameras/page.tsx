import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { CamerasClient } from "./cameras-client";
import { Cctv, CircleDot, AlertTriangle, Wifi } from "lucide-react";
export const dynamic = "force-dynamic";

export default async function CamerasPage() {
  const session = await requirePermission("cameras", "view");

  const [cameras, stations, events, vehicles] = await Promise.all([
    prisma.camera.findMany({
      include: {
        station: { select: { code: true } },
        zones: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { code: "asc" },
    }),
    prisma.station.findMany({ where: { isActive: true }, orderBy: { code: "asc" } }),
    prisma.detectionEvent.findMany({
      include: {
        camera: { select: { name: true, code: true } },
        vehicle: { select: { plate: true, code: true } },
      },
      orderBy: { detectedAt: "desc" },
      take: 100,
    }),
    prisma.vehicle.findMany({ select: { plate: true }, orderBy: { plate: "asc" } }),
  ]);

  const online = cameras.filter((c) => c.status === "ONLINE").length;
  const unknownToday = events.filter(
    (e) =>
      e.matchStatus === "UNKNOWN" &&
      new Date(e.detectedAt).toDateString() === new Date().toDateString()
  ).length;

  const camRows = cameras.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    location: c.location ?? "",
    stationId: c.stationId ?? "",
    stationCode: c.station?.code ?? "—",
    status: c.status,
    lastSeenAt: c.lastSeenAt ? c.lastSeenAt.toISOString() : "",
    isActive: c.isActive,
    zones: c.zones.map((z) => ({
      id: z.id,
      name: z.name,
      direction: z.direction,
      points: z.points as { x: number; y: number }[],
    })),
  }));

  const eventRows = events.map((e) => ({
    id: e.id,
    detectedAt: e.detectedAt.toISOString(),
    plate: e.plate ?? "",
    plateConfidence: e.plateConfidence,
    vehicleType: e.vehicleType ?? "",
    direction: e.direction,
    matchStatus: e.matchStatus,
    cameraName: e.camera.name,
    cameraCode: e.camera.code,
    vehiclePlate: e.vehicle?.plate ?? "",
    imageUrl: e.imageUrl ?? "",
    note: e.note ?? "",
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI Camera — Giám sát phương tiện"
        description="Camera IP nội bộ, vùng nhận diện và lịch sử nhận diện biển số"
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Cctv} label="Tổng camera" value={cameras.length} />
        <StatCard
          icon={Wifi}
          label="Đang online"
          value={`${online}/${cameras.length}`}
          tone={online === cameras.length && cameras.length > 0 ? "success" : "warning"}
        />
        <StatCard icon={CircleDot} label="Sự kiện gần đây" value={events.length} hint="100 bản ghi mới nhất" />
        <StatCard
          icon={AlertTriangle}
          label="Chưa xác định hôm nay"
          value={unknownToday}
          tone={unknownToday > 0 ? "warning" : "success"}
        />
      </section>

      <CamerasClient
        cameras={camRows}
        events={eventRows}
        stations={stations.map((s) => ({ id: s.id, label: `${s.code} — ${s.name}` }))}
        knownPlates={vehicles.map((v) => v.plate)}
        canCreate={can(session.role, "cameras", "create")}
        canUpdate={can(session.role, "cameras", "update")}
        canDelete={can(session.role, "cameras", "delete")}
      />
    </div>
  );
}
