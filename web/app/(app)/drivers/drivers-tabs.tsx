"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DriversTabs({ list, monthLog }: { list: ReactNode; monthLog: ReactNode }) {
  const [tab, setTab] = useState<"list" | "month">("month");

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1 print:hidden">
        {[
          { id: "month" as const, label: "Bảng theo dõi tháng" },
          { id: "list" as const, label: "Danh sách tài xế" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors",
              tab === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={tab === "month" ? "" : "hidden"}>{monthLog}</div>
      <div className={tab === "list" ? "" : "hidden"}>{list}</div>
    </div>
  );
}
