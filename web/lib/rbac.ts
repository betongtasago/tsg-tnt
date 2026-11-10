import type { Role } from "@prisma/client";

export type ModuleKey =
  | "production"
  | "drivers"
  | "vehicles"
  | "documents"
  | "cameras"
  | "telegram"
  | "users"
  | "settings";

export type Permission = "view" | "create" | "update" | "delete" | "export";

export const MODULE_LABELS: Record<ModuleKey, string> = {
  production: "Báo cáo sản xuất",
  drivers: "Tài xế / Bảng tài",
  vehicles: "Phương tiện",
  documents: "Đăng kiểm – Bảo hiểm – GPLX",
  cameras: "AI Camera giám sát",
  telegram: "Thông báo Telegram",
  users: "Quản lý người dùng",
  settings: "Cài đặt hệ thống",
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Quản trị hệ thống",
  BAN_GIAM_DOC: "Ban Giám đốc",
  KE_TOAN: "Kế toán",
  DIEU_DO: "Điều độ",
  QUAN_LY_DOI_XE: "Quản lý đội xe",
  BAO_VE: "Bảo vệ",
};

const ALL: Permission[] = ["view", "create", "update", "delete", "export"];
const VIEW_ONLY: Permission[] = ["view"];
const VIEW_EXPORT: Permission[] = ["view", "export"];

/**
 * Ma trận phân quyền mặc định. Có thể ghi đè từng dòng trong bảng RolePermission.
 */
export const DEFAULT_PERMISSIONS: Record<Role, Partial<Record<ModuleKey, Permission[]>>> = {
  ADMIN: {
    production: ALL,
    drivers: ALL,
    vehicles: ALL,
    documents: ALL,
    cameras: ALL,
    telegram: ALL,
    users: ALL,
    settings: ALL,
  },
  BAN_GIAM_DOC: {
    production: VIEW_EXPORT,
    drivers: VIEW_EXPORT,
    vehicles: VIEW_EXPORT,
    documents: VIEW_EXPORT,
    cameras: VIEW_EXPORT,
    telegram: VIEW_ONLY,
    users: [],
    settings: [],
  },
  KE_TOAN: {
    production: ["view", "create", "update", "export"],
    drivers: VIEW_ONLY,
    vehicles: VIEW_ONLY,
    documents: VIEW_EXPORT,
    cameras: VIEW_ONLY,
    telegram: [],
    users: [],
    settings: [],
  },
  DIEU_DO: {
    production: ["view", "create", "update", "export"],
    drivers: ["view", "create", "update", "export"],
    vehicles: ["view", "create", "update", "export"],
    documents: VIEW_EXPORT,
    cameras: VIEW_ONLY,
    telegram: [],
    users: [],
    settings: [],
  },
  QUAN_LY_DOI_XE: {
    production: VIEW_ONLY,
    drivers: ["view", "create", "update", "export"],
    vehicles: ["view", "create", "update", "export"],
    documents: ["view", "create", "update", "export"],
    cameras: VIEW_ONLY,
    telegram: VIEW_ONLY,
    users: [],
    settings: [],
  },
  BAO_VE: {
    production: [],
    drivers: VIEW_ONLY,
    vehicles: VIEW_ONLY,
    documents: [],
    cameras: VIEW_ONLY,
    telegram: [],
    users: [],
    settings: [],
  },
};

export function can(role: Role, module: ModuleKey, permission: Permission): boolean {
  const perms = DEFAULT_PERMISSIONS[role]?.[module] ?? [];
  return perms.includes(permission);
}

/** Danh sách module mà vai trò được phép xem — dùng để dựng sidebar. */
export function visibleModules(role: Role): ModuleKey[] {
  return (Object.keys(MODULE_LABELS) as ModuleKey[]).filter((m) => can(role, m, "view"));
}
