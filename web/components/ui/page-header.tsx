import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h1 className="text-lg font-bold tracking-tight sm:text-xl">{title}</h1>
        {description ? (
          <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="no-print flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionTitle({
  children,
  hint,
  actions,
}: {
  children: React.ReactNode;
  hint?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-2.5 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-foreground">
          {children}
        </h2>
        {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
      {actions ? <div className="no-print flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card-panel flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      {Icon ? (
        <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </span>
      ) : null}
      <p className="text-sm font-semibold">{title}</p>
      {description ? (
        <p className="max-w-md text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
