import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { getStations, getCustomers } from "@/lib/ref-data";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { listReportsPage, countReports, reportSummary, REPORTS_PAGE_SIZE } from "@/lib/reports";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR, EmptyRow } from "@/components/ui/table";
import { StatCard } from "@/components/ui/stat-card";
import { ReportFilters } from "./report-filters";
import { ReportRowActions } from "./report-row-actions";
import {
  REPORT_STATUS_LABEL,
  SHIFT_LABEL,
  fmtDate,
  fmtInt,
  fmtNum,
} from "@/lib/utils";
import { BarChart3, Gauge, Target, Truck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: {
    from?: string;
    to?: string;
    stationId?: string;
    customerId?: string;
    status?: string;
    q?: string;
    page?: string;
  };
}) {
  const session = await requirePermission("production", "view");

  const page = Math.max(1, Number(searchParams.page) || 1);

  const [rows, total, summary, stations, customers] = await Promise.all([
    listReportsPage(searchParams, page),
    countReports(searchParams),
    reportSummary({ from: searchParams.from, to: searchParams.to }),
    getStations(),
    getCustomers(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / REPORTS_PAGE_SIZE));

  const canCreate = can(session.role, "production", "create");
  const canUpdate = can(session.role, "production", "update");
  const canDelete = can(session.role, "production", "delete");
  const canExport = can(session.role, "production", "export");

  const exportQuery = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v) exportQuery.set(k, String(v));
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Báo cáo sản xuất"
        description="Lập, tổng hợp và gửi báo cáo sản xuất theo ca, trạm và công trình"
        actions={
          <>
            {canExport ? (
              <>
                <a
                  href={`/api/reports/export?format=xlsx&${exportQuery.toString()}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Xuất Excel
                </a>
                <a
                  href={`/reports/print?${exportQuery.toString()}`}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  In / PDF
                </a>
              </>
            ) : null}
            {canCreate ? (
              <Link href="/reports/new" className={buttonVariants({ size: "sm" })}>
                <Plus className="h-3.5 w-3.5" /> Tạo báo cáo
              </Link>
            ) : null}
          </>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Gauge}
          label="Sản lượng thực tế"
          value={fmtNum(summary.totalActual)}
          unit="m³"
          tone="primary"
          hint={`${summary.rowCount} dòng báo cáo`}
        />
        <StatCard
          icon={Target}
          label="Kế hoạch"
          value={fmtNum(summary.totalPlanned)}
          unit="m³"
          hint={`Hoàn thành ${summary.completion}%`}
        />
        <StatCard
          icon={Truck}
          label="Tổng số chuyến"
          value={fmtInt(summary.totalTrips)}
          hint="Trong khoảng đang lọc"
        />
        <StatCard
          icon={BarChart3}
          label="Trạm có sản lượng"
          value={summary.byStation.length}
          hint={summary.byStation[0] ? `Cao nhất: ${summary.byStation[0].code}` : "—"}
        />
      </section>

      <ReportFilters
        stations={stations.map((s) => ({ id: s.id, label: `${s.code} — ${s.name}` }))}
        customers={customers.map((c) => ({ id: c.id, label: c.name }))}
        initial={searchParams}
      />

      {summary.byStation.length > 0 ? (
        <section className="grid gap-3 lg:grid-cols-2">
          <div className="card-panel p-4">
            <SectionTitle hint="Tổng hợp theo trạm trộn">Sản lượng theo trạm</SectionTitle>
            <div className="space-y-1.5">
              {summary.byStation.map((s) => {
                const pct = summary.totalActual > 0 ? Math.round((s.actual / summary.totalActual) * 100) : 0;
                return (
                  <div key={s.code}>
                    <div className="mb-1 flex items-center justify-between text-[12px]">
                      <span className="font-medium">{s.code}</span>
                      <span className="text-muted-foreground">
                        {fmtNum(s.actual)} m³ · {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card-panel p-4">
        <SectionTitle hint="Tổng hợp theo công trình">Sản lượng theo khách hàng</SectionTitle>
            <div className="space-y-1.5">
              {summary.byCustomer.slice(0, 6).map((c) => {
                const pct = summary.totalActual > 0 ? Math.round((c.actual / summary.totalActual) * 100) : 0;
                return (
                  <div key={c.name}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-[12px]">
                      <span className="truncate font-medium">{c.name}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {fmtNum(c.actual)} m³ · {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <div>
        <SectionTitle hint={`${total} dòng · trang ${page}/${totalPages}`}>Danh sách báo cáo</SectionTitle>
        <Table>
          <THead>
            <TR>
                  <TH>Ngày</TH>
              <TH>Ca</TH>
              <TH>Trạm</TH>
                  <TH>Công trình</TH>
                  <TH>Mác</TH>
              <TH className="text-right">KH (m³)</TH>
              <TH className="text-right">Thực tế (m³)</TH>
              <TH className="text-right">%</TH>
              <TH className="text-right">Chuyến</TH>
              <TH>Trạng thái</TH>
              <TH className="text-right">Thao tác</TH>
            </TR>
          </THead>
          <TBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={11} message="Không có báo cáo nào khớp bộ lọc." />
            ) : (
              rows.map((r) => {
                const pct =
                  r.plannedVolume > 0 ? Math.round((r.actualVolume / r.plannedVolume) * 100) : 0;
                return (
                  <TR key={r.id}>
                    <TD className="whitespace-nowrap font-medium">{fmtDate(r.reportDate)}</TD>
                    <TD className="whitespace-nowrap text-muted-foreground">{SHIFT_LABEL[r.shift]}</TD>
                    <TD className="whitespace-nowrap">{r.station.code}</TD>
                    <TD className="max-w-[220px] truncate">{r.customer?.name ?? "—"}</TD>
                    <TD className="whitespace-nowrap font-medium">{r.grade}</TD>
                    <TD className="whitespace-nowrap text-right tabular-nums text-muted-foreground">
                      {fmtNum(r.plannedVolume)}
                    </TD>
                    <TD className="whitespace-nowrap text-right font-semibold tabular-nums">
                      {fmtNum(r.actualVolume)}
                    </TD>
                    <TD className="whitespace-nowrap text-right tabular-nums">
                      <span
                        className={
                          pct >= 100
                            ? "text-success"
                            : pct >= 80
                              ? "text-foreground"
                              : "text-warning"
                        }
                      >
                        {pct}%
                      </span>
                    </TD>
                    <TD className="whitespace-nowrap text-right tabular-nums">{r.tripCount}</TD>
                    <TD>
                      <Badge
                        tone={
                          r.status === "APPROVED"
                            ? "success"
                            : r.status === "SUBMITTED"
                              ? "primary"
                              : "muted"
                        }
                      >
                        {REPORT_STATUS_LABEL[r.status]}
                      </Badge>
                    </TD>
                    <TD>
                      <ReportRowActions
                        id={r.id}
                        status={r.status}
                        canUpdate={canUpdate}
                        canDelete={canDelete}
                      />
                    </TD>
                  </TR>
                );
              })
            )}
          </TBody>
        </Table>

        {totalPages > 1 && (
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-[12px] text-muted-foreground">
              Hiển thị {(page - 1) * REPORTS_PAGE_SIZE + 1}–
              {Math.min(page * REPORTS_PAGE_SIZE, total)} trong {total} dòng
            </p>
            <div className="flex items-center gap-1.5">
              <PageLink searchParams={searchParams} page={page - 1} disabled={page <= 1}>
                Trước
              </PageLink>
              <span className="px-2 text-[12px] font-medium tabular-nums">
                {page}/{totalPages}
              </span>
              <PageLink searchParams={searchParams} page={page + 1} disabled={page >= totalPages}>
                Sau
              </PageLink>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PageLink({
  searchParams,
  page,
  disabled,
  children,
}: {
  searchParams: Record<string, string | undefined>;
  page: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v && k !== "page") qs.set(k, String(v));
  }
  qs.set("page", String(page));
  const href = `/reports?${qs.toString()}`;

  if (disabled) {
    return (
      <span className="cursor-not-allowed rounded-md border border-border px-2.5 py-1 text-[12px] text-muted-foreground opacity-50">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-md border border-border px-2.5 py-1 text-[12px] font-medium hover:bg-muted"
    >
      {children}
    </Link>
  );
}
