import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

/** Trả ảnh JPEG của một sự kiện nhận diện. Ảnh nằm trong DB nên phải qua quyền xem camera. */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return new NextResponse("Chưa đăng nhập", { status: 401 });
  if (!can(session.role, "cameras", "view")) {
    return new NextResponse("Không có quyền", { status: 403 });
  }

  const event = await prisma.detectionEvent.findUnique({
    where: { id: params.id },
    select: { imageData: true, imageMime: true },
  });

  if (!event?.imageData) {
    return new NextResponse("Không có ảnh", { status: 404 });
  }

  return new NextResponse(new Uint8Array(event.imageData), {
    status: 200,
    headers: {
      "Content-Type": event.imageMime ?? "image/jpeg",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
