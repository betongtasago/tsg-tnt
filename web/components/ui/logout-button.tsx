"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "./button";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size={compact ? "icon" : "sm"}
      onClick={handleLogout}
      disabled={pending}
      aria-label="Đăng xuất"
      title="Đăng xuất"
      className={compact ? undefined : "w-full justify-start text-muted-foreground"}
    >
      <LogOut className="h-4 w-4" />
      {compact ? null : <span>{pending ? "Đang thoát…" : "Đăng xuất"}</span>}
    </Button>
  );
}
