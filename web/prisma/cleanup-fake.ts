import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. Xoa camera gia + su kien gia + vung nhan dien
  const delEvents = await prisma.detectionEvent.deleteMany({});
  const delZones = await prisma.detectionZone.deleteMany({});
  const delCams = await prisma.camera.deleteMany({});
  console.log(`Da xoa: ${delEvents.count} su kien, ${delZones.count} vung, ${delCams.count} camera gia`);

  // 2. Tao du lieu mau cho bang theo doi tai xe thang 11/2026
  const year = 2026;
  const month = 11;
  const drivers = await prisma.driver.findMany({
    where: { status: { not: "RESIGNED" } },
    include: { vehicles: { select: { plate: true }, take: 1 } },
    orderBy: { code: "asc" },
  });

  let created = 0;
  for (const d of drivers) {
    const seedNum = Number(d.code.replace(/\D/g, "")) || 1;
    await prisma.driverMonthLog.upsert({
      where: { driverId_year_month: { driverId: d.id, year, month } },
      create: {
        driverId: d.id,
        year,
        month,
        driverCode: d.code,
        driverName: d.fullName,
        vehiclePlate: d.vehicles[0]?.plate ?? null,
        taiNgay: null,
        timeValue: null,
        leaveRepair: null,
        note: null,
        lan1: 0,
        lan2: 0,
        lan3: 0,
        odometer: 13000 + seedNum * 137,
        tireDate: new Date(Date.UTC(2026, 9, ((seedNum * 3) % 28) + 1)),
      },
      update: {},
    });
    created++;
  }
  console.log(`Da tao ${created} dong bang tai thang ${month}/${year}`);

  const camCount = await prisma.camera.count();
  const evCount = await prisma.detectionEvent.count();
  console.log(`Con lai: ${camCount} camera, ${evCount} su kien`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
