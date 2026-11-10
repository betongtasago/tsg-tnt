import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import type { ModuleKey, Permission } from "@/lib/rbac";
import { can } from "@/lib/rbac";

/**
 * Bắt buộc đăng nhập + có quyền trên module. Dùng ở đầu mỗi server page.
 * Ném redirect nếu không đủ điều kiện.
 *
 * Lưu ý: /dashboard chỉ yêu cầu đăng nhập (không kiểm tra quyền module), nên
 * chuyển hướng về đây luôn an toàn — không thể tạo vòng lặp chuyển hướng.
 */
export async function requirePermission(module: ModuleKey, permission: Permission = "view") {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session.role, module, permission)) {
    redirect(`/dashboard?denied=${module}`);
  }
  return session;
}

/** Chỉ cần đăng nhập, không kiểm tra quyền module. */
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
