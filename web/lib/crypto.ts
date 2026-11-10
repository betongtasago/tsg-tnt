import crypto from "crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY chưa được cấu hình");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY phải là base64 của đúng 32 byte");
  }
  return key;
}

/**
 * Mã hóa chuỗi nhạy cảm (RTSP URL, Telegram bot token).
 * Định dạng đầu ra: v1:<iv_b64>:<tag_b64>:<ciphertext_b64>
 */
export function encryptSecret(plain: string): string {
  if (!plain) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

/** Giải mã chuỗi đã mã hóa bằng encryptSecret. */
export function decryptSecret(payload: string | null | undefined): string {
  if (!payload) return "";
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Định dạng dữ liệu mã hóa không hợp lệ");
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

/** Ẩn bớt token khi hiển thị: chỉ giữ 4 ký tự cuối. */
export function maskSecret(plain: string): string {
  if (!plain) return "";
  if (plain.length <= 8) return "••••••••";
  return `••••••••${plain.slice(-4)}`;
}

/** So sánh token agent theo thời gian hằng số. */
export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
