import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BellRing,
  Cctv,
  FileCheck2,
  History,
  LayoutDashboard,
  Settings,
  Truck,
  Users,
  UsersRound,
  IdCard,
} from "lucide-react";
import type { ModuleKey } from "@/lib/rbac";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  module: ModuleKey;
  group: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard, module: "production", group: "Vận hành" },
  { href: "/reports", label: "Báo cáo sản xuất", icon: BarChart3, module: "production", group: "Vận hành" },
  { href: "/drivers", label: "Bảng tài / Tài xế", icon: Users, module: "drivers", group: "Vận hành" },
  { href: "/vehicles", label: "Quản lý phương tiện", icon: Truck, module: "vehicles", group: "Vận hành" },
  { href: "/documents", label: "Đăng kiểm – Bảo hiểm", icon: FileCheck2, module: "documents", group: "Hồ sơ" },
  { href: "/licenses", label: "Giấy phép lái xe", icon: IdCard, module: "documents", group: "Hồ sơ" },
  { href: "/cameras", label: "AI Camera giám sát", icon: Cctv, module: "cameras", group: "Giám sát" },
  { href: "/telegram", label: "Thông báo Telegram", icon: BellRing, module: "telegram", group: "Giám sát" },
  { href: "/users", label: "Quản lý người dùng", icon: UsersRound, module: "users", group: "Hệ thống" },
  { href: "/audit", label: "Nhật ký thao tác", icon: History, module: "settings", group: "Hệ thống" },
  { href: "/settings", label: "Cài đặt hệ thống", icon: Settings, module: "settings", group: "Hệ thống" },
];

export const NAV_GROUPS = ["Vận hành", "Hồ sơ", "Giám sát", "Hệ thống"];

export const MOBILE_NAV: NavItem[] = [
  NAV_ITEMS[0],
  NAV_ITEMS[1],
  NAV_ITEMS[3],
  NAV_ITEMS[6],
  NAV_ITEMS[8],
];
