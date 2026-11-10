import { prisma } from "./db";
import type { SessionPayload } from "./session";

type AuditInput = {
  action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGIN_FAILED" | "LOGOUT" | "EXPORT" | "SEND";
  module: string;
  entityId?: string | null;
  detail?: unknown;
  ip?: string | null;
};

/** Ghi nhật ký thao tác. Không bao giờ ném lỗi ra ngoài luồng nghiệp vụ. */
export async function writeAudit(
  session: SessionPayload | null,
  input: AuditInput
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: session?.userId ?? null,
        action: input.action,
        module: input.module,
        entityId: input.entityId ?? null,
        detail: (input.detail ?? undefined) as never,
        ip: input.ip ?? null,
      },
    });
  } catch (err) {
    console.error("[audit] không ghi được nhật ký:", err);
  }
}

export function clientIp(req: Request): string | null {
  const h = req.headers;
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null
  );
}
