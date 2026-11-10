import { unstable_cache } from "next/cache";
import { prisma } from "./db";

/**
 * Danh mục trạm và khách hàng gần như không đổi nhưng bị truy vấn ở hầu hết
 * các trang. Mỗi lần truy vấn tới Neon mất ~250ms, nên cache lại 5 phút.
 * Dữ liệu danh mục đổi thì revalidate qua revalidateTag("ref-data").
 */
export const REF_TAG = "ref-data";

export const getStations = unstable_cache(
  async () => prisma.station.findMany({ where: { isActive: true }, orderBy: { code: "asc" } }),
  ["ref-stations"],
  { revalidate: 300, tags: [REF_TAG] }
);

export const getCustomers = unstable_cache(
  async () => prisma.customer.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ["ref-customers"],
  { revalidate: 300, tags: [REF_TAG] }
);

export const getAllStations = unstable_cache(
  async () => prisma.station.findMany({ orderBy: { code: "asc" } }),
  ["ref-stations-all"],
  { revalidate: 300, tags: [REF_TAG] }
);
