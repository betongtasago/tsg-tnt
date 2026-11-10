import { cn } from "@/lib/utils";

/**
 * Logo TSG-TNT — dựng bằng SVG để sắc nét ở mọi kích thước và tự đổi màu theo theme.
 */
export function Logo({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Logo TSG-TNT"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id="tsgNavy" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0b2d5c" />
          <stop offset="100%" stopColor="#1e5aa8" />
        </linearGradient>
        <linearGradient id="tsgRed" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d7263d" />
          <stop offset="100%" stopColor="#a81b2d" />
        </linearGradient>
      </defs>

      <rect width="48" height="48" rx="11" fill="url(#tsgNavy)" />

      {/* Vòng xoáy cách điệu — tượng trưng cho tang trống bê tông */}
      <path
        d="M15 33c-4.4 0-8-3.6-8-8s3.6-8 8-8c3.1 0 5.8 1.8 7.1 4.4"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M33 15c4.4 0 8 3.6 8 8s-3.6 8-8 8c-3.1 0-5.8-1.8-7.1-4.4"
        fill="none"
        stroke="url(#tsgRed)"
        strokeWidth="3.4"
        strokeLinecap="round"
      />

      {/* Mũi tên hướng vận chuyển */}
      <path d="M24 19.5v9" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" opacity="0.85" />
      <path d="M20.5 25.5 24 29l3.5-3.5" fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </svg>
  );
}

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Logo size={34} />
      <div className="leading-none">
        <p className="text-[15px] font-extrabold tracking-tight text-foreground">
          TSG<span className="text-destructive">-</span>TNT
        </p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Bê tông · Vận hành
        </p>
      </div>
    </div>
  );
}
