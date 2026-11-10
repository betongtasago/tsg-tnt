import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { safeCompare } from "@/lib/crypto";
import { sendTelegram, escapeHtml } from "@/lib/telegram";
import { fmtTime } from "@/lib/utils";

/**
 * Endpoint cho AI Camera Agent (chạy tại nhà máy) đẩy sự kiện lên.
 * Xác thực bằng Bearer token tĩnh (AGENT_API_TOKEN), không dùng session người dùng.
 */

const eventSchema = z.object({
  cameraCode: z.string().min(1),
  detectedAt: z.string().optional(),
  plate: z.string().max(24).optional().nullable(),
  plateConfidence: z.number().min(0).max(1).optional().nullable(),
  vehicleType: z.string().max(32).optional().nullable(),
  direction: z.enum(["IN", "OUT", "UNKNOWN"]).optional(),
  imageUrl: z.string().max(1000).optional().nullable(),
  plateImageUrl: z.string().max(1000).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  /** Bỏ qua kiểm tra chống trùng nếu agent đã tự lọc */
  force: z.boolean().optional(),
});

const heartbeatSchema = z.object({
  heartbeat: z.literal(true),
  cameras: z.array(
    z.object({
      code: z.string(),
      status: z.enum(["ONLINE", "OFFLINE", "UNKNOWN"]),
    })
  ),
});

function unauthorized() {
  return NextResponse.json({ error: "Token agent không hợp lệ" }, { status: 401 });
}

function checkToken(req: Request): boolean {
  const expected = process.env.AGENT_API_TOKEN;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return false;
  return safeCompare(token, expected);
}

/** Chuẩn hóa biển số: bỏ khoảng trắng, chấm, gạch; chuyển hoa. */
function normalizePlate(raw: string): string {
  return raw.replace(/[\s.\-_]/g, "").toUpperCase();
}

export async function POST(req: Request) {
  if (!checkToken(req)) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body không hợp lệ" }, { status: 400 });

  // ---- Heartbeat: cập nhật trạng thái online/offline ----
  const hb = heartbeatSchema.safeParse(body);
  if (hb.success) {
    const results: { code: string; status: string }[] = [];
    for (const cam of hb.data.cameras) {
      const updated = await prisma.camera
        .update({
          where: { code: cam.code },
          data: { status: cam.status, lastSeenAt: new Date() },
        })
        .catch(() => null);
      if (updated) results.push({ code: cam.code, status: cam.status });
    }
    return NextResponse.json({ ok: true, heartbeat: true, updated: results });
  }

  // ---- Sự kiện nhận diện ----
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu sự kiện không hợp lệ" },
      { status: 400 }
    );
  }

  const e = parsed.data;

  const camera = await prisma.camera.findUnique({ where: { code: e.cameraCode } });
  if (!camera) {
    return NextResponse.json({ error: `Không tìm thấy camera ${e.cameraCode}` }, { status: 404 });
  }

  const detectedAt = e.detectedAt ? new Date(e.detectedAt) : new Date();
  const safeDetectedAt = Number.isNaN(detectedAt.getTime()) ? new Date() : detectedAt;

  // Đối chiếu biển số với danh sách phương tiện công ty
  let vehicle = null;
  let plate = e.plate?.trim() || null;
  let matchStatus: "MATCH" | "UNKNOWN" = "UNKNOWN";

  if (plate) {
    const normalized = normalizePlate(plate);
    const allVehicles = await prisma.vehicle.findMany({
      select: { id: true, plate: true },
    });
    vehicle = allVehicles.find((v) => normalizePlate(v.plate) === normalized) ?? null;
    if (vehicle) {
      matchStatus = "MATCH";
      plate = vehicle.plate; // dùng biển số chuẩn trong hệ thống
    }
  }

  // Chống nhận diện trùng lặp: cùng camera + cùng biển số trong khoảng dedupe
  const cfg = await prisma.telegramConfig.findUnique({ where: { id: "singleton" } });
  const dedupeSeconds = cfg?.dedupeSeconds ?? 120;

  if (!e.force) {
    const since = new Date(safeDetectedAt.getTime() - dedupeSeconds * 1000);
    const duplicate = await prisma.detectionEvent.findFirst({
      where: {
        cameraId: camera.id,
        plate: plate,
        detectedAt: { gte: since },
      },
    });
    if (duplicate) {
      return NextResponse.json({
        ok: true,
        deduplicated: true,
        eventId: duplicate.id,
        message: `Bỏ qua sự kiện trùng trong ${dedupeSeconds}s`,
      });
    }
  }

  const event = await prisma.detectionEvent.create({
    data: {
      cameraId: camera.id,
      detectedAt: safeDetectedAt,
      plate,
      plateConfidence: e.plateConfidence ?? null,
      vehicleType: e.vehicleType ?? null,
      direction: e.direction ?? "UNKNOWN",
      matchStatus,
      vehicleId: vehicle?.id ?? null,
      imageUrl: e.imageUrl ?? null,
      plateImageUrl: e.plateImageUrl ?? null,
      note: e.note ?? null,
    },
  });

  // Cập nhật trạng thái camera
  await prisma.camera.update({
    where: { id: camera.id },
    data: { status: "ONLINE", lastSeenAt: new Date() },
  });

  // Gửi Telegram
  const lines = [
    "🚨 <b>TSG-TNT — PHÁT HIỆN PHƯƠNG TIỆN</b>",
    "",
    `• Biển số: <b>${plate ? escapeHtml(plate) : "Chưa xác định"}</b>`,
    `• Thời gian: ${fmtTime(safeDetectedAt)}`,
    `• Camera: ${escapeHtml(camera.name)}`,
    `• Trạng thái: Xe đã ${e.direction === "OUT" ? "ra khỏi" : "vào"} vùng nhận diện`,
    `• Đối chiếu: ${
      matchStatus === "MATCH"
        ? "Xe thuộc danh sách công ty"
        : "Chưa xác định được phương tiện"
    }`,
  ];

  if (e.plateConfidence) {
    lines.push(`• Độ tin cậy OCR: ${Math.round(e.plateConfidence * 100)}%`);
  }

  const notifyType = matchStatus === "MATCH" ? "VEHICLE_IN" : "VEHICLE_UNKNOWN";
  const telegram = await sendTelegram(notifyType, lines.join("\n"), e.imageUrl ?? undefined);

  return NextResponse.json({
    ok: true,
    eventId: event.id,
    matchStatus,
    vehiclePlate: vehicle?.plate ?? null,
    telegram: { sent: telegram.ok, skipped: telegram.skipped ?? false, error: telegram.error ?? null },
  });
}

/** Health check cho agent. */
export async function GET(req: Request) {
  if (!checkToken(req)) return unauthorized();
  return NextResponse.json({ ok: true, service: "tsg-tnt-agent-ingest", time: new Date().toISOString() });
}
