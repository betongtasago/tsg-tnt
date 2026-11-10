import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const VN = "Asia/Ho_Chi_Minh";

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: VN,
  }).format(date);
}

export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: VN,
  }).format(date);
}

export function fmtTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: VN,
  }).format(date);
}

export function fmtNum(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

export function fmtInt(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("vi-VN").format(n);
}

/** Chuỗi ngày dạng yyyy-mm-dd theo giờ VN, dùng cho input type=date. */
export function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: VN,
  }).format(date);
}

export function todayInput(): string {
  return toDateInput(new Date());
}

/**
 * Các thành phần ngày theo giờ Việt Nam, không phụ thuộc múi giờ của server.
 * Vercel chạy UTC, nên dùng getFullYear()/getDate() trực tiếp sẽ lệch 7 giờ
 * mỗi ngày — đúng khoảng thời gian quan trọng nhất của ca đêm.
 */
export function vnParts(d: Date | string | null | undefined) {
  const date = typeof d === "string" ? new Date(d) : (d ?? new Date());
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: VN,
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** Chuỗi yyyy-mm-dd của hôm nay theo giờ VN. */
export function vnToday(): string {
  return toDateInput(new Date());
}

/** Mốc 00:00 giờ VN của một ngày, trả về Date UTC tương ứng. */
export function vnStartOfDay(d: Date | string): Date {
  const { year, month, day } = vnParts(d);
  return new Date(Date.UTC(year, month - 1, day) - 7 * 3600 * 1000);
}

/** Mốc 00:00 giờ VN của ngày đầu tháng chứa d. */
export function vnStartOfMonth(d: Date | string): Date {
  const { year, month } = vnParts(d);
  return new Date(Date.UTC(year, month - 1, 1) - 7 * 3600 * 1000);
}

/** Cộng/trừ số ngày trên một Date, giữ nguyên giờ. */
export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

/** Số ngày còn lại tới hạn. Âm nghĩa là đã quá hạn. Tính theo ngày lịch VN. */
export function daysUntil(d: Date | string | null | undefined): number | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return null;
  const a = vnParts(date);
  const b = vnParts(new Date());
  const A = Date.UTC(a.year, a.month - 1, a.day);
  const B = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((A - B) / 86400000);
}

export type ExpiryLevel = "expired" | "d3" | "d7" | "d15" | "d30" | "ok" | "none";

export function expiryLevel(d: Date | string | null | undefined): ExpiryLevel {
  const days = daysUntil(d);
  if (days === null) return "none";
  if (days < 0) return "expired";
  if (days <= 3) return "d3";
  if (days <= 7) return "d7";
  if (days <= 15) return "d15";
  if (days <= 30) return "d30";
  return "ok";
}

export const EXPIRY_LABEL: Record<ExpiryLevel, string> = {
  expired: "Đã hết hạn",
  d3: "Còn ≤ 3 ngày",
  d7: "Còn ≤ 7 ngày",
  d15: "Còn ≤ 15 ngày",
  d30: "Còn ≤ 30 ngày",
  ok: "Còn hiệu lực",
  none: "Chưa cập nhật",
};

export const EXPIRY_TONE: Record<ExpiryLevel, "danger" | "warning" | "success" | "muted"> = {
  expired: "danger",
  d3: "danger",
  d7: "warning",
  d15: "warning",
  d30: "warning",
  ok: "success",
  none: "muted",
};

export const SHIFT_LABEL: Record<string, string> = {
  SANG: "Ca sáng",
  CHIEU: "Ca chiều",
  DEM: "Ca đêm",
};

export const REPORT_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Bản nháp",
  SUBMITTED: "Đã gửi",
  APPROVED: "Đã duyệt",
};

export const VEHICLE_TYPE_LABEL: Record<string, string> = {
  BON: "Xe bồn",
  TAI: "Xe tải",
  BOM: "Xe bơm",
  KHAC: "Khác",
};

export const VEHICLE_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Đang hoạt động",
  REPAIR: "Đang sửa chữa",
  MAINTENANCE: "Đang bảo dưỡng",
  SUSPENDED: "Tạm ngưng",
  RETIRED: "Ngừng sử dụng",
};

export const DRIVER_STATUS_LABEL: Record<string, string> = {
  WORKING: "Đang làm việc",
  LEAVE: "Nghỉ phép",
  RESIGNED: "Nghỉ việc",
};

export const DOC_TYPE_LABEL: Record<string, string> = {
  DANG_KIEM: "Đăng kiểm",
  BAO_HIEM_TNDS: "Bảo hiểm TNDS",
  BAO_HIEM_VAT_CHAT: "Bảo hiểm vật chất",
  PHU_HIEU: "Phù hiệu vận tải",
  GPLX: "Giấy phép lái xe",
  KHAC: "Giấy tờ khác",
};

export const MATCH_LABEL: Record<string, string> = {
  MATCH: "Thuộc danh sách công ty",
  UNKNOWN: "Chưa xác định",
};

export const DIRECTION_LABEL: Record<string, string> = {
  IN: "Xe vào",
  OUT: "Xe ra",
  UNKNOWN: "Không rõ",
};
