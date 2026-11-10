import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BellRing,
  Camera,
  Car,
  CheckCircle2,
  Cctv,
  FileWarning,
  Gauge,
  Truck,
  Users,
} from "lucide-react";
import { requirePermission } from "@/lib/guard";
import { getDashboardData } from "@/lib/dashboard";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StationBarChart, VehicleStatusChart, VolumeTrendChart } from "@/components/charts";
import {
  DIRECTION_LABEL,
  MATCH_LABEL,
  REPORT_STATUS_LABEL,
  SHIFT_LABEL,
  VEHICLE_STATUS_LABEL,
  fmtInt,
  fmtNum,
  fmtTime,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

const VEHICLE_COLORS: Record<string, string> = {
  ACTIVE: "#15803d",
  REPAIR: "#dc2626",
  MAINTENANCE: "#d97706",
  SUSPENDED: "#64748b",
  RETIRED: "#94a3b8",
};

export default async function DashboardPage() {
  const session = await requirePermission("production", "view");
  const data = await getDashboardData();

  const expiringSoon =
    data.docBuckets.expired + data.docBuckets.d3 + data.docBuckets.d7 + data.docBuckets.d15;

  const vehiclePie = Object.entries(data.vehicleStatus).map(([status, count]) => ({
    name: VEHICLE_STATUS_LABEL[status] ?? status,
    value: count,
    color: VEHICLE_COLORS[status] ?? "#94a3b8",
  }));

  const todayLabel = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Xin chào, ${session.fullName}`}
        description={`${todayLabel} · Tổng quan vận hành nhà máy`}
        actions={
          <Badge tone="primary" className="gap-1.5 px-2.5 py-1">
            <BarChart3 className="h-3.5 w-3.5" /> Báo cáo hôm nay: {data.today.reports}
          </Badge>
        }
      />

      {/* Thẻ thống kê chính */}
      <section aria-label="Thống kê chính" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard
          icon={Gauge}
          label="Sản lượng hôm nay"
          value={fmtNum(data.today.volume)}
          unit="m³"
          hint={`KH ${fmtNum(data.today.planned)} m³ · ${data.today.completion}%`}
          tone="primary"
        />
        <StatCard
          icon={BarChart3}
          label="Lũy kế tháng"
          value={fmtNum(data.month.volume)}
          unit="m³"
          hint={`${data.month.completion}% kế hoạch tháng`}
        />
        <StatCard
          icon={Truck}
          label="Xe hoạt động"
          value={`${data.activeVehicles}/${data.totalVehicles}`}
          hint={
            data.totalVehicles - data.activeVehicles > 0
              ? `${data.totalVehicles - data.activeVehicles} xe không hoạt động`
              : "Toàn bộ đội xe sẵn sàng"
          }
          tone={data.activeVehicles === data.totalVehicles ? "success" : "warning"}
        />
        <StatCard
          icon={Users}
          label="Tài xế đang làm"
          value={data.driverStatus.WORKING ?? 0}
          hint={`Tổng ${data.totalDrivers} tài xế`}
        />
        <StatCard
          icon={FileWarning}
          label="Giấy tờ sắp hết hạn"
          value={expiringSoon}
          hint={
            data.docBuckets.expired > 0
              ? `${data.docBuckets.expired} giấy tờ đã hết hạn`
              : "Trong 15 ngày tới"
          }
          tone={data.docBuckets.expired > 0 ? "danger" : expiringSoon > 0 ? "warning" : "success"}
        />
        <StatCard
          icon={Cctv}
          label="Camera online"
          value={`${data.camerasOnline}/${data.cameraTotal}`}
          hint={`${data.todayEventCount} lượt xe nhận diện hôm nay`}
          tone={data.camerasOnline === data.cameraTotal ? "success" : "warning"}
        />
      </section>

      {/* Biểu đồ */}
      <section className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Sản lượng 7 ngày gần nhất</CardTitle>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Đường liền: thực tế · Đường đứt: kế hoạch
              </p>
            </div>
            <Badge tone="primary">{fmtNum(data.month.volume)} m³ / tháng</Badge>
          </CardHeader>
          <CardContent>
            <VolumeTrendChart data={data.daily} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tình trạng phương tiện</CardTitle>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {data.totalVehicles} phương tiện trong hệ thống
            </p>
          </CardHeader>
          <CardContent>
            <VehicleStatusChart data={vehiclePie} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sản lượng theo trạm — tháng này</CardTitle>
          </CardHeader>
          <CardContent>
            <StationBarChart data={data.byStation} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Cảnh báo giấy tờ</CardTitle>
            <Link
              href="/documents"
              className="text-[11px] font-medium text-primary hover:underline"
            >
              Xem tất cả
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Đã hết hạn", value: data.docBuckets.expired, tone: "danger" as const },
              { label: "Còn ≤ 3 ngày", value: data.docBuckets.d3, tone: "danger" as const },
              { label: "Còn ≤ 7 ngày", value: data.docBuckets.d7, tone: "warning" as const },
              { label: "Còn ≤ 15 ngày", value: data.docBuckets.d15, tone: "warning" as const },
              { label: "Còn ≤ 30 ngày", value: data.docBuckets.d30, tone: "muted" as const },
              { label: "Còn hiệu lực", value: data.docBuckets.ok, tone: "success" as const },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-md border border-border/70 px-2.5 py-1.5"
              >
                <span className="text-[12.5px] text-muted-foreground">{row.label}</span>
                <Badge tone={row.tone}>{fmtInt(row.value)}</Badge>
              </div>
            ))}
            <p className="pt-1 text-[11px] text-muted-foreground">
              Tổng {data.docTotal} hồ sơ đang theo dõi
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Báo cáo hôm nay + sự kiện camera */}
      <section className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Báo cáo sản xuất hôm nay</CardTitle>
            <Link href="/reports" className="text-[11px] font-medium text-primary hover:underline">
              Quản lý báo cáo
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {data.todayReports.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                Chưa có báo cáo nào cho hôm nay.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {data.todayReports.slice(0, 6).map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">
                        {r.station.code} · {r.grade}
                        <span className="ml-1.5 text-muted-foreground">
                          {SHIFT_LABEL[r.shift]}
                        </span>
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {r.customer?.name ?? "Không gắn công trình"} · {r.tripCount} chuyến
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-semibold">{fmtNum(r.actualVolume)} m³</p>
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Nhận diện phương tiện gần đây</CardTitle>
            <Link href="/cameras" className="text-[11px] font-medium text-primary hover:underline">
              AI Camera
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentEvents.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                Chưa có sự kiện nhận diện.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {data.recentEvents.slice(0, 6).map((e) => (
                  <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                        e.matchStatus === "MATCH"
                          ? "bg-success/10 text-success"
                          : "bg-warning/10 text-warning"
                      }`}
                    >
                      {e.matchStatus === "MATCH" ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">
                        {e.plate ?? "Không đọc được biển số"}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {e.camera.name} · {DIRECTION_LABEL[e.direction]}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground">{fmtTime(e.detectedAt)}</p>
                      <Badge tone={e.matchStatus === "MATCH" ? "success" : "warning"}>
                        {MATCH_LABEL[e.matchStatus]}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Lối tắt */}
      <section>
        <SectionTitle hint="Truy cập nhanh các phân hệ thường dùng">Lối tắt</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { href: "/reports/new", label: "Lập báo cáo", icon: BarChart3 },
            { href: "/vehicles", label: "Đội xe", icon: Car },
            { href: "/documents", label: "Hồ sơ giấy tờ", icon: FileWarning },
            { href: "/telegram", label: "Cấu hình Telegram", icon: BellRing },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.href}
                href={s.href}
                className="card-panel group flex items-center gap-2.5 p-3 transition-colors hover:border-primary/40 hover:bg-accent/40"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="flex-1 text-[13px] font-medium">{s.label}</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
