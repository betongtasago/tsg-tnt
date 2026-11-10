import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { ReportForm } from "../report-form";
import { REPORT_STATUS_LABEL, toDateInput } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EditReportPage({ params }: { params: { id: string } }) {
  const session = await requirePermission("production", "update");

  const [report, stations, customers] = await Promise.all([
    prisma.productionReport.findUnique({
      where: { id: params.id },
      include: { station: true, customer: true },
    }),
    prisma.station.findMany({ where: { isActive: true }, orderBy: { code: "asc" } }),
    prisma.customer.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  if (!report) notFound();

  return (
    <div>
      <PageHeader
        title={`Sửa báo cáo — ${report.station.code} · ${report.grade}`}
        description={`Ngày ${toDateInput(report.reportDate)}`}
        actions={
          <Badge
            tone={
              report.status === "APPROVED"
                ? "success"
                : report.status === "SUBMITTED"
                  ? "primary"
                  : "muted"
            }
          >
            {REPORT_STATUS_LABEL[report.status]}
          </Badge>
        }
      />
      <ReportForm
        initial={{
          id: report.id,
          reportDate: toDateInput(report.reportDate),
          shift: report.shift,
          stationId: report.stationId,
          customerId: report.customerId ?? "",
          grade: report.grade,
          slump: report.slump === null ? "" : String(report.slump),
          plannedVolume: String(report.plannedVolume),
          actualVolume: String(report.actualVolume),
          truckCount: String(report.truckCount),
          tripCount: String(report.tripCount),
          startTime: report.startTime ?? "",
          endTime: report.endTime ?? "",
          supervisorName: report.supervisorName ?? "",
          incidentNote: report.incidentNote ?? "",
        }}
        stations={stations.map((s) => ({ id: s.id, label: `${s.code} — ${s.name}` }))}
        customers={customers.map((c) => ({ id: c.id, label: c.name }))}
        canSubmit={report.status === "DRAFT" && can(session.role, "production", "update")}
        canEdit={can(session.role, "production", "update")}
      />
    </div>
  );
}
