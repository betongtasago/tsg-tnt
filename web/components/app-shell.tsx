"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import type { Role } from "@prisma/client";
import { LogoWordmark } from "@/components/logo";
import { LogoutButton } from "@/components/ui/logout-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { NAV_GROUPS, NAV_ITEMS } from "@/lib/nav";
import { ROLE_LABELS, can } from "@/lib/rbac";
import { cn } from "@/lib/utils";

type Props = {
  role: Role;
  fullName: string;
  username: string;
};

export function AppShell({ role, fullName, username, children }: Props & { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const items = NAV_ITEMS.filter((item) => can(role, item.module, "view"));
  const groups = NAV_GROUPS.filter((g) => items.some((i) => i.group === g));
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const nav = (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-2.5 py-3">
      {groups.map((group) => (
        <div key={group}>
          <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground/80">
            {group}
          </p>
          <ul className="space-y-0.5">
            {items
              .filter((i) => i.group === group)
              .map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const sidebarInner = (
    <>
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <Link href="/dashboard" onClick={() => setOpen(false)}>
          <LogoWordmark />
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Đóng menu"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {nav}

      <div className="shrink-0 border-t border-border p-2.5">
        <div className="mb-1.5 flex items-center gap-2.5 rounded-md px-2 py-1.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
            {initials || "?"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold leading-tight">{fullName}</p>
            <p className="truncate text-[11px] leading-tight text-muted-foreground">
              {ROLE_LABELS[role]}
            </p>
          </div>
        </div>
        <LogoutButton />
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside className="no-print sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-border bg-card lg:flex">
        {sidebarInner}
      </aside>

      {/* Sidebar mobile */}
      {open ? (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 flex h-full w-[270px] flex-col border-r border-border bg-card shadow-xl">
            {sidebarInner}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="no-print sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card/95 px-3 backdrop-blur sm:px-5">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Mở menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold leading-tight">
              Hệ thống quản lý vận hành
            </p>
            <p className="truncate text-[11px] leading-tight text-muted-foreground">
              CTCP SX KD DV Bê tông TSG-TNT
            </p>
          </div>

          <div className="flex items-center gap-1">
            <span className="hidden rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground sm:inline">
              {username}
            </span>
            <ThemeToggle />
          </div>
        </header>

        <main className="min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-5">{children}</main>
      </div>
    </div>
  );
}
