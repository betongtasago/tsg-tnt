import { z } from "zod";

const dateOrNull = z
  .string()
  .optional()
  .nullable()
  .transform((v) => {
    if (!v || v.trim() === "") return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  });

const numOrNull = z
  .union([z.number(), z.string()])
  .optional()
  .nullable()
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  });

/** Một dòng trong bảng theo dõi tài xế tháng */
export const monthLogRowSchema = z.object({
  driverId: z.string().min(1),
  taiNgay: numOrNull,
  timeValue: numOrNull,
  leaveRepair: z.string().max(200).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  lan1: z.coerce.number().int().min(0).max(99).default(0),
  lan2: z.coerce.number().int().min(0).max(99).default(0),
  lan3: z.coerce.number().int().min(0).max(99).default(0),
  odometer: numOrNull,
  tireDate: dateOrNull,
});

export const monthLogBulkSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  rows: z.array(monthLogRowSchema).max(500),
});

export type MonthLogRowInput = z.infer<typeof monthLogRowSchema>;
