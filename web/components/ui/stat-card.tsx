import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Tone = "default" | "success" | "warning" | "danger" | "primary";

const TONE_STYLES: Record<Tone, { ring: string; icon: string; value: string }> = {
  default: { ring: "border-border", icon: "bg-muted text-muted-foreground", value: "text-foreground" },
  primary: { ring: "border-primary/25", icon: "bg-primary/10 text-primary", value: "text-primary" },
  success: { ring: "border-success/25", icon: "bg-success/10 text-success", value: "text-success" },
  warning: { ring: "border-warning/30", icon: "bg-warning/10 text-warning", value: "text-warning" },
  danger: { ring: "border-destructive/25", icon: "bg-destructive/10 text-destructive", value: "text-destructive" },
};

export function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  hint,
  tone = "default",
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  tone?: Tone;
  className?: string;
}) {
  const styles = TONE_STYLES[tone];

  return (
    <div className={cn("card-panel flex flex-col gap-2.5 p-3.5", styles.ring, className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase leading-tight tracking-wide text-muted-foreground">
          {label}
        </p>
        <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", styles.icon)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className={cn("text-2xl font-bold leading-none tracking-tight", styles.value)}>
        {value}
        {unit ? <span className="ml-1 text-sm font-semibold text-muted-foreground">{unit}</span> : null}
      </p>
      {hint ? <p className="text-[11px] leading-tight text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
