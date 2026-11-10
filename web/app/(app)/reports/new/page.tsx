import { prisma } from "@/lib/db";
import { getStations, getCustomers } from "@/lib/ref-data";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { ReportForm } from "../report-form";
import { todayInput } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NewReportPage() {
  const session = await requirePermission("production", "create");

  const [stations, customers] = await Promise.all([
    getStations(),
    getCustomers(),
  ]);

  const hour = new Date().getHours();
  const defaultShift = hour < 12 ? "SANG" : hour < 18 ? "CHIEU" : "DEM";

  return (
    <div>
      <PageHeader
        title="Tạo báo cáo sản xuất"
        description="Nhập số liệu ca sản xuất, lưu nháp hoặc gửi trực tiếp cho Ban Giám đốc"
      />
      <ReportForm
        initial={{
          reportDate: todayInput(),
          shift: defaultShift,
          stationId: stations[0]?.id ?? "",
          customerId: "",
          grade: "",
          slump: "",
          plannedVolume: "",
          actualVolume: "",
          truckCount: "",
          tripCount: "",
          startTime: defaultShift === "SANG" ? "07:00" : defaultShift === "CHIEU" ? "13:00" : "21:00",
          endTime: defaultShift === "SANG" ? "11:30" : defaultShift === "CHIEU" ? "17:30" : "01:30",
          supervisorName: session.fullName,
          incidentNote: "",
        }}
        stations={stations.map((s) => ({ id: s.id, label: `${s.code} — ${s.name}` }))}
        customers={customers.map((c) => ({ id: c.id, label: c.name }))}
        canSubmit={can(session.role, "production", "update")}
        canEdit
      />
    </div>
  );
}
