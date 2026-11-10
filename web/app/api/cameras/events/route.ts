import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!can(session.role, "cameras", "view")) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const plate = searchParams.get("plate")?.trim();
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const cameraId = searchParams.get("cameraId");

  const where: Record<string, unknown> = {};
  if (plate) where.plate = { contains: plate, mode: "insensitive" };
  if (cameraId) where.cameraId = cameraId;
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.gte = new Date(`${from}T00:00:00`);
    if (to) range.lte = new Date(`${to}T23:59:59`);
    where.detectedAt = range;
  }

  const events = await prisma.detectionEvent.findMany({
    where,
    select: {
      id: true,
      detectedAt: true,
      plate: true,
      plateConfidence: true,
      vehicleType: true,
      direction: true,
      matchStatus: true,
      imageUrl: true,
      imageMime: true,
      note: true,
      camera: { select: { name: true, code: true } },
      vehicle: { select: { plate: true, code: true } },
    },
    orderBy: { detectedAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ events });
}
