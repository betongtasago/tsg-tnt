"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "./input";

export function SearchBox({
  value,
  onChange,
  placeholder = "Tìm kiếm…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-8"
      />
    </div>
  );
}

/** Hook lọc theo từ khóa trên nhiều trường. */
export function useFilter<T>(rows: T[], query: string, pick: (row: T) => (string | null | undefined)[]) {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      pick(row)
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, query, pick]);
}

export function useToast() {
  const [message, setMessage] = useState<{ text: string; tone: "success" | "error" } | null>(null);

  function show(text: string, tone: "success" | "error" = "success") {
    setMessage({ text, tone });
    setTimeout(() => setMessage(null), 4500);
  }

  const node = message ? (
    <div
      role="status"
      className={`fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 rounded-md px-4 py-2 text-[13px] font-medium text-white shadow-lg ${
        message.tone === "success" ? "bg-success" : "bg-destructive"
      }`}
    >
      {message.text}
    </div>
  ) : null;

  return { show, node };
}
