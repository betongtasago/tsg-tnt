"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const width = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-10 my-8 w-full rounded-lg border border-border bg-card shadow-xl",
          width
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-[15px] font-semibold">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-[12px] text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Đóng">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto px-4 py-3.5">{children}</div>

        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
