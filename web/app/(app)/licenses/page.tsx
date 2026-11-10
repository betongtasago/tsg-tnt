import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { LicensesClient } from "./licenses-client";
import { EXPIRY_LABEL, EXPIRY_TONE, expiryLevel, fmtDate } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Clock, IdCard } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LicensesPage() {
  const session = await requirePermission("documents", "view");

  const [docs, drivers] = await Promise.all([
    prisma.document.findMany({
      where: { entity: "DRIVER" },
      include: { driver: { select: { id: true, code: true, fullName: true, phone: true, status: true } } },
      orderBy: { expiryDate: "asc" },
    }),
    prisma.driver.findMany({
      where: { status: { in: ["WORKING", "LEAVE"] } },
      select: { id: true, code: true, fullName: true },
      orderBy: { code: "asc" },
    }),
  ]);

  const rows = docs.map((d) => ({
    id: d.id,
    driverId: d.driverId ?? "",
    driverCode: d.driver?.code ?? "—",
    driverName: d.driver?.fullName ?? "—",
    phone: d.driver?.phone ?? "",
    licenseClass: d.licenseClass ?? "",
    number: d.number ?? "",
    issuedDate: d.issuedDate ? d.issuedDate.toISOString().slice(0, 10) : "",
    expiryDate: d.expiryDate ? d.expiryDate.toISOString().slice(0, 10) : "",
    note: d.note ?? "",
  }));

  const buckets = { expired: 0, soon: 0, ok: 0, none: 0 };
  for (const r of rows) {
    const lvl = expiryLevel(r.expiryDate);
    if (lvl === "expired") buckets.expired++;
    else if (lvl === "none") buckets.none++;
    else if (["d3", "d7", "d15", "d30"].includes(lvl)) buckets.soon++;
    else buckets.ok++;
  }

  const critical = rows.filter((r) => ["expired", "d3", "d7"].includes(expiryLevel(r.expiryDate)));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Giấy phép lái xe"
        description="Hạng GPLX, ngày cấp, ngày hết hạn và cảnh báo gia hạn cho toàn bộ tài xế"
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={CheckCircle2} label="Còn hiệu lực" value={buckets.ok} tone="success" />
        <StatCard icon={Clock} label="Sắp hết hạn" value={buckets.soon} tone="warning" hint="Trong 30 ngày" />
        <StatCard icon={AlertTriangle} label="Đã hết hạn" value={buckets.expired} tone="danger" />
        <StatCard icon={IdCard} label="Tổng hồ sơ GPLX" value={rows.length} />
      </section>

      {critical.length > 0 ? (
        <section className="card-panel border-destructive/30 p-3.5">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h2 className="text-[13px] font-semibold text-destructive">
              {critical.length} tài xế cần gia hạn giấy phép lái xe
            </h2>
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {critical.map((r) => {
              const lvl = expiryLevel(r.expiryDate);
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2.5 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium">
                      {r.driverCode} — {r.driverName}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Hạng {r.licenseClass || "—"} · {fmtDate(r.expiryDate)}
                    </p>
                  </div>
                  <Badge tone={EXPIRY_TONE[lvl]}>{EXPIRY_LABEL[lvl]}</Badge>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <LicensesClient
        rows={rows}
        drivers={drivers.map((d) => ({ id: d.id, label: `${d.code} — ${d.fullName}` }))}
        canCreate={can(session.role, "documents", "create")}
        canUpdate={can(session.role, "documents", "update")}
        canDelete={can(session.role, "documents", "delete")}
      />
    </div>
  );
}
