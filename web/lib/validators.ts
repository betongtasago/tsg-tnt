import { z } from "zod";

export const driverSchema = z.object({
  code: z.string().min(1, "Nhập mã tài xế").max(20),
  fullName: z.string().min(1, "Nhập họ tên").max(120),
  phone: z.string().max(20).optional().nullable(),
  stationId: z.string().optional().nullable(),
  joinDate: z.string().optional().nullable(),
  status: z.enum(["WORKING", "LEAVE", "RESIGNED"]),
  shift: z.enum(["SANG", "CHIEU", "DEM"]).optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
});

export const vehicleSchema = z.object({
  plate: z.string().min(1, "Nhập biển số").max(20),
  code: z.string().max(20).optional().nullable(),
  type: z.enum(["BON", "TAI", "BOM", "KHAC"]),
  brand: z.string().max(60).optional().nullable(),
  year: z.coerce.number().int().min(1950).max(2100).optional().nullable(),
  capacity: z.coerce.number().min(0).max(1000).optional().nullable(),
  driverId: z.string().optional().nullable(),
  stationId: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "REPAIR", "MAINTENANCE", "SUSPENDED", "RETIRED"]),
  registrationDate: z.string().optional().nullable(),
  registrationExpiry: z.string().optional().nullable(),
  insuranceExpiry: z.string().optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
});

export const documentSchema = z.object({
  entity: z.enum(["VEHICLE", "DRIVER"]),
  docType: z.enum(["DANG_KIEM", "BAO_HIEM_TNDS", "BAO_HIEM_VAT_CHAT", "PHU_HIEU", "GPLX", "KHAC"]),
  vehicleId: z.string().optional().nullable(),
  driverId: z.string().optional().nullable(),
  number: z.string().max(60).optional().nullable(),
  licenseClass: z.string().max(10).optional().nullable(),
  issuedDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
});

export const userSchema = z.object({
  username: z.string().min(3, "Tên đăng nhập tối thiểu 3 ký tự").max(32).regex(/^[a-z0-9._-]+$/, "Chỉ dùng chữ thường, số, dấu chấm, gạch"),
  fullName: z.string().min(1, "Nhập họ tên").max(120),
  phone: z.string().max(20).optional().nullable(),
  role: z.enum(["ADMIN", "BAN_GIAM_DOC", "KE_TOAN", "DIEU_DO", "QUAN_LY_DOI_XE", "BAO_VE"]),
  isActive: z.boolean().optional(),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").max(200).optional(),
});

export const cameraSchema = z.object({
  code: z.string().min(1, "Nhập mã camera").max(30),
  name: z.string().min(1, "Nhập tên camera").max(120),
  location: z.string().max(160).optional().nullable(),
  stationId: z.string().optional().nullable(),
  rtspUrl: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const zoneSchema = z.object({
  cameraId: z.string().min(1),
  name: z.string().min(1, "Nhập tên vùng").max(80),
  points: z.array(z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })).min(3, "Cần ít nhất 3 điểm"),
  direction: z.enum(["IN", "OUT", "BOTH"]),
});

export const telegramSchema = z.object({
  botToken: z.string().max(200).optional().nullable(),
  chatId: z.string().max(60).optional().nullable(),
  enabled: z.boolean(),
  notifyReport: z.boolean(),
  notifyVehicleIn: z.boolean(),
  notifyUnknown: z.boolean(),
  notifyCameraOffline: z.boolean(),
  notifyDocExpiry: z.boolean(),
  notifyDailySummary: z.boolean(),
  dedupeSeconds: z.coerce.number().int().min(10).max(3600),
});

/** Chuyển "yyyy-mm-dd" -> Date (UTC nửa đêm) hoặc null. */
export function dateOrNull(s: string | null | undefined): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}
