"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Đăng nhập thất bại");
        return;
      }

      const target = nextPath && nextPath.startsWith("/") ? nextPath : "/dashboard";
      router.push(target);
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ. Kiểm tra lại mạng.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
      <Field label="Tên đăng nhập" htmlFor="username">
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoFocus
          placeholder="vd: admin"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={pending}
          required
        />
      </Field>

      <Field label="Mật khẩu" htmlFor="password">
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={pending}
            required
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-[13px] text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending || !username || !password}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Đang đăng nhập…
          </>
        ) : (
          <>
            <LogIn className="h-4 w-4" /> Đăng nhập
          </>
        )}
      </Button>

      <p className="pt-1 text-center text-[11px] leading-relaxed text-muted-foreground">
        Quên mật khẩu? Liên hệ quản trị viên hệ thống để được cấp lại.
      </p>
    </form>
  );
}
