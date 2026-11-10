import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export const metadata = { title: "Đăng nhập — TSG-TNT" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="flex min-h-screen">
      {/* Panel thương hiệu */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#0b2d5c] p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.13]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #4a90e2 0, transparent 45%), radial-gradient(circle at 80% 70%, #d7263d 0, transparent 40%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <Logo size={44} />
          <div>
            <p className="text-lg font-extrabold tracking-tight">
              TSG<span className="text-red-400">-</span>TNT
            </p>
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/60">
              Bê tông · Vận hành
            </p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-3xl font-bold leading-tight tracking-tight">
            Hệ thống quản lý vận hành nhà máy bê tông
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            Báo cáo sản xuất, tài xế, phương tiện, hồ sơ đăng kiểm và AI camera giám sát —
            tất cả trong một nền tảng duy nhất.
          </p>
          <ul className="mt-6 space-y-2 text-[13px] text-white/75">
            {[
              "Số liệu sản xuất tập trung, đồng bộ nhiều thiết bị",
              "Cảnh báo tự động đăng kiểm, bảo hiểm, giấy phép lái xe",
              "AI nhận diện phương tiện qua camera IP nội bộ",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11px] text-white/40">
          © {new Date().getFullYear()} CTCP SX KD DV Bê tông TSG-TNT
        </p>
      </div>

      {/* Form đăng nhập */}
      <div className="flex w-full flex-col items-center justify-center bg-background px-5 py-10 lg:w-1/2">
        <div className="w-full max-w-[380px]">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <Logo size={40} />
            <div>
              <p className="text-base font-extrabold tracking-tight">
                TSG<span className="text-destructive">-</span>TNT
              </p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Bê tông · Vận hành
              </p>
            </div>
          </div>

          <h2 className="text-xl font-bold tracking-tight">Đăng nhập hệ thống</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Dùng tài khoản nội bộ do quản trị viên cấp.
          </p>

          <LoginForm nextPath={searchParams.next} />
        </div>
      </div>
    </div>
  );
}
