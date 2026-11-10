import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { can, ROLE_LABELS, DEFAULT_PERMISSIONS, MODULE_LABELS, type ModuleKey, type Permission } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { UsersClient } from "./users-client";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await requirePermission("users", "view");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      fullName: true,
      phone: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: [{ role: "asc" }, { username: "asc" }],
  });

  const roles = Object.keys(ROLE_LABELS) as (keyof typeof ROLE_LABELS)[];

  const matrix = roles.map((role) => ({
    role,
    label: ROLE_LABELS[role],
    perms: (Object.keys(MODULE_LABELS) as ModuleKey[]).map((module) => ({
      module,
      label: MODULE_LABELS[module],
      permissions: (DEFAULT_PERMISSIONS[role]?.[module] ?? []) as Permission[],
    })),
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Quản lý người dùng"
        description="Tài khoản, vai trò và ma trận phân quyền chi tiết theo từng phân hệ"
      />

      <UsersClient
        users={users.map((u) => ({
          id: u.id,
          username: u.username,
          fullName: u.fullName,
          phone: u.phone ?? "",
          role: u.role,
          isActive: u.isActive,
          lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : "",
          createdAt: u.createdAt.toISOString(),
        }))}
        matrix={matrix}
        roleLabels={ROLE_LABELS}
        currentUserId={session.userId}
        canCreate={can(session.role, "users", "create")}
        canUpdate={can(session.role, "users", "update")}
        canDelete={can(session.role, "users", "delete")}
      />
    </div>
  );
}
