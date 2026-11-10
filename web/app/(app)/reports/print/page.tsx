import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { listReports, reportSummary } from "@/lib/reports";
import { PrintButton } from "./print-button";
import { Logo } from "@/components/logo";
import { SHIFT_LABEL, fmtDate, fmtNum } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PrintReportPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; stationId?: string; customerId?: string; status?: string; q?: string };
}) {
  await requirePermission("production", "view");

  const [rows, summary, settings] = await Promise.all([
    listReports(searchParams),
    reportSummary({ from: searchParams.from, to: searchParams.to }),
    prisma.systemSetting.findMany(),
  ]);

  const cfg = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  const periodLabel =
    searchParams.from || searchParams.to
      ? `Từ ${searchParams.from ? fmtDate(new Date(`${searchParams.from}T00:00:00Z`)) : "…"} đến ${
          searchParams.to ? fmtDate(new Date(`${searchParams.to}T00:00:00Z`)) : "…"
        }`
      : "Toàn bộ kỳ dữ liệu";

  return (
    <div className="min-h-screen bg-white p-6 text-black print:p-0">
      <div className="no-print mb-4 flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
        <p className="text-[12px] text-muted-foreground">
          Dùng hộp thoại in của trình duyệt và chọn “Save as PDF” để xuất PDF.
        </p>
        <PrintButton />
      </div>

      <div className="print-area mx-auto max-w-[820px]">
        {/* Header công ty */}
        <div className="flex items-start justify-between gap-4 border-b-2 border-black pb-3">
          <div className="flex items-center gap-3">
            <Logo size={52} />
            <div>
              <p className="text-[13px] font-bold uppercase leading-tight">
                {cfg["company.name"] ?? "CÔNG TY CỔ PHẦN SX KD DV BÊ TÔNG TSG TNT"}
              </p>
              <p className="text-[11px] leading-tight">{cfg["company.address"] ?? ""}</p>
              <p className="text-[11px] leading-tight">ĐT: {cfg["company.phone"] ?? ""}</p>
            </div>
          </div>
          <div className="text-right text-[11px]">
            <p className="font-semibold">Mẫu: BC-SX/01</p>
            <p>Ngày in: {fmtDate(new Date())}</p>
          </div>
        </div>

        <h1 className="mt-5 text-center text-[17px] font-bold uppercase tracking-wide">
          Báo cáo tổng hợp sản xuất
        </h1>
        <p className="mt-1 text-center text-[12px] italic">{periodLabel}</p>

        {/* Bảng tổng hợp */}
        <table className="mt-4 w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-1.5 py-1 text-left">STT</th>
              <th className="border border-gray-400 px-1.5 py-1 text-left">Ngày</th>
              <th className="border border-gray-400 px-1.5 py-1 text-left">Ca</th>
              <th className="border border-gray-400 px-1.5 py-1 text-left">Trạm</th>
              <th className="border border-gray-400 px-1.5 py-1 text-left">Công trình</th>
              <th className="border border-gray-400 px-1.5 py-1 text-left">Mác</th>
              <th className="border border-gray-400 px-1.5 py-1 text-right">KH (m³)</th>
              <th className="border border-gray-400 px-1.5 py-1 text-right">Thực tế (m³)</th>
              <th className="border border-gray-400 px-1.5 py-1 text-right">Chuyến</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="border border-gray-400 px-2 py-6 text-center italic">
                  Không có dữ liệu trong kỳ.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.id}>
                  <td className="border border-gray-400 px-1.5 py-1">{i + 1}</td>
                  <td className="border border-gray-400 px-1.5 py-1 whitespace-nowrap">
                    {fmtDate(r.reportDate)}
                  </td>
                  <td className="border border-gray-400 px-1.5 py-1">{SHIFT_LABEL[r.shift]}</td>
                  <td className="border border-gray-400 px-1.5 py-1">{r.station.code}</td>
                  <td className="border border-gray-400 px-1.5 py-1">{r.customer?.name ?? "—"}</td>
                  <td className="border border-gray-400 px-1.5 py-1">{r.grade}</td>
                  <td className="border border-gray-400 px-1.5 py-1 text-right tabular-nums">
                    {fmtNum(r.plannedVolume)}
                  </td>
                  <td className="border border-gray-400 px-1.5 py-1 text-right font-semibold tabular-nums">
                    {fmtNum(r.actualVolume)}
                  </td>
                  <td className="border border-gray-400 px-1.5 py-1 text-right tabular-nums">
                    {r.tripCount}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold">
              <td colSpan={6} className="border border-gray-400 px-1.5 py-1 text-right">
                TỔNG CỘNG
              </td>
              <td className="border border-gray-400 px-1.5 py-1 text-right tabular-nums">
                {fmtNum(summary.totalPlanned)}
              </td>
              <td className="border border-gray-400 px-1.5 py-1 text-right tabular-nums">
                {fmtNum(summary.totalActual)}
              </td>
              <td className="border border-gray-400 px-1.5 py-1 text-right tabular-nums">
                {summary.totalTrips}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Tổng hợp theo trạm */}
        <h2 className="mt-5 text-[12px] font-bold uppercase">Tổng hợp theo trạm trộn</h2>
        <table className="mt-1.5 w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-1.5 py-1 text-left">Trạm</th>
              <th className="border border-gray-400 px-1.5 py-1 text-right">Kế hoạch (m³)</th>
              <th className="border border-gray-400 px-1.5 py-1 text-right">Thực tế (m³)</th>
              <th className="border border-gray-400 px-1.5 py-1 text-right">Tỷ lệ</th>
              <th className="border border-gray-400 px-1.5 py-1 text-right">Chuyến</th>
            </tr>
          </thead>
          <tbody>
            {summary.byStation.map((s) => (
              <tr key={s.code}>
                <td className="border border-gray-400 px-1.5 py-1">
                  {s.code} — {s.name}
                </td>
                <td className="border border-gray-400 px-1.5 py-1 text-right tabular-nums">
                  {fmtNum(s.planned)}
                </td>
                <td className="border border-gray-400 px-1.5 py-1 text-right tabular-nums">
                  {fmtNum(s.actual)}
                </td>
                <td className="border border-gray-400 px-1.5 py-1 text-right tabular-nums">
                  {s.planned > 0 ? Math.round((s.actual / s.planned) * 100) : 0}%
                </td>
                <td className="border border-gray-400 px-1.5 py-1 text-right tabular-nums">{s.trips}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Tổng hợp theo công trình */}
        <h2 className="mt-4 text-[12px] font-bold uppercase">Tổng hợp theo công trình</h2>
        <table className="mt-1.5 w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-1.5 py-1 text-left">Công trình / Khách hàng</th>
              <th className="border border-gray-400 px-1.5 py-1 text-right">Thực tế (m³)</th>
              <th className="border border-gray-400 px-1.5 py-1 text-right">Tỷ trọng</th>
            </tr>
          </thead>
          <tbody>
            {summary.byCustomer.map((c) => (
              <tr key={c.name}>
                <td className="border border-gray-400 px-1.5 py-1">{c.name}</td>
                <td className="border border-gray-400 px-1.5 py-1 text-right tabular-nums">
                  {fmtNum(c.actual)}
                </td>
                <td className="border border-gray-400 px-1.5 py-1 text-right tabular-nums">
                  {summary.totalActual > 0 ? Math.round((c.actual / summary.totalActual) * 100) : 0}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Chữ ký */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center text-[11px]">
          {["Người lập biểu", "Người kiểm tra", "Ban Giám đốc"].map((role) => (
            <div key={role}>
              <p className="font-semibold">{role}</p>
              <p className="italic text-gray-600">(Ký, ghi rõ họ tên)</p>
              <div className="h-16" />
              <p className="border-t border-dotted border-gray-400 pt-1">&nbsp;</p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-[9px] text-gray-500">
          Báo cáo được tạo tự động bởi Hệ thống quản lý vận hành TSG-TNT · {rows.length} dòng dữ liệu
        </p>
      </div>
    </div>
  );
}
