import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4",
  {
    variants: {
      tone: {
        default: "border-border bg-muted text-muted-foreground",
        primary: "border-primary/20 bg-primary/10 text-primary",
        success: "border-success/25 bg-success/10 text-success",
        warning: "border-warning/30 bg-warning/10 text-warning",
        danger: "border-destructive/25 bg-destructive/10 text-destructive",
        muted: "border-border bg-transparent text-muted-foreground",
      },
    },
    defaultVariants: { tone: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
