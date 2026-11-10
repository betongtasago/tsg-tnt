"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

type Option = { id: string; label: string };

export function ReportFilters({
  stations,
  customers,
  initial,
}: {
  stations: Option[];
  customers: Option[];
  initial: { from?: string; to?: string; stationId?: string; customerId?: string; status?: string; q?: string };
}) {
  const router = useRouter();
  const [v, setV] = useState({
    from: initial.from ?? "",
    to: initial.to ?? "",
    stationId: initial.stationId ?? "",
    customerId: initial.customerId ?? "",
    status: initial.status ?? "",
    q: initial.q ?? "",
  });

  function apply() {
    const params = new URLSearchParams();
    for (const [k, val] of Object.entries(v)) {
      if (val) params.set(k, val);
    }
    router.push(`/reports?${params.toString()}`);
  }

  function reset() {
    setV({ from: "", to: "", stationId: "", customerId: "", status: "", q: "" });
    router.push("/reports");
  }

  return (
    <div className="no-print card-panel p-3">
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-6">
        <div>
          <label className="field-label">Từ ngày</label>
          <Input type="date" value={v.from} onChange={(e) => setV({ ...v, from: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Đến ngày</label>
          <Input type="date" value={v.to} onChange={(e) => setV({ ...v, to: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Trạm</label>
          <Select value={v.stationId} onChange={(e) => setV({ ...v, stationId: e.target.value })}>
            <option value="">Tất cả trạm</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="field-label">Công trình</label>
          <Select value={v.customerId} onChange={(e) => setV({ ...v, customerId: e.target.value })}>
            <option value="">Tất cả</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="field-label">Trạng thái</label>
          <Select value={v.status} onChange={(e) => setV({ ...v, status: e.target.value })}>
            <option value="">Tất cả</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="SUBMITTED">Đã gửi</option>
            <option value="APPROVED">Đã duyệt</option>
          </Select>
        </div>
        <div>
          <label className="field-label">Tìm kiếm</label>
          <Input
            placeholder="Mác, phụ trách, công trình"
            value={v.q}
            onChange={(e) => setV({ ...v, q: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") apply();
            }}
          />
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <Button size="sm" onClick={apply}>
          <Filter className="h-3.5 w-3.5" /> Lọc
        </Button>
        <Button size="sm" variant="ghost" onClick={reset}>
          <RotateCcw className="h-3.5 w-3.5" /> Đặt lại
        </Button>
      </div>
    </div>
  );
}
