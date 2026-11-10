import { PrismaClient, Role, Shift, VehicleType, VehicleStatus, DriverStatus, DocType, DocEntity, ReportStatus, CameraStatus, MatchStatus, Direction } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const VN_TZ_OFFSET_MS = 7 * 60 * 60 * 1000;

function d(y: number, m: number, day: number): Date {
  return new Date(Date.UTC(y, m - 1, day));
}

function daysFromNow(n: number): Date {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  now.setUTCDate(now.getUTCDate() + n);
  return now;
}

async function main() {
  console.log("→ Bắt đầu tạo dữ liệu mẫu TSG-TNT…");

  // ---------- Người dùng ----------
  const passwordHash = await bcrypt.hash("TsgTnt@2026", 10);

  const users = [
    { username: "admin", fullName: "Nguyễn Văn Quản Trị", role: Role.ADMIN, phone: "0901000001" },
    { username: "giamdoc", fullName: "Trần Thanh Hùng", role: Role.BAN_GIAM_DOC, phone: "0901000002" },
    { username: "ketoan", fullName: "Lê Viết Thành", role: Role.KE_TOAN, phone: "0901000003" },
    { username: "dieudo", fullName: "Phạm Minh Điều", role: Role.DIEU_DO, phone: "0901000004" },
    { username: "doixe", fullName: "Võ Quốc Đội", role: Role.QUAN_LY_DOI_XE, phone: "0901000005" },
    { username: "baove", fullName: "Đặng Văn Bảo", role: Role.BAO_VE, phone: "0901000006" },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: { fullName: u.fullName, role: u.role, phone: u.phone, passwordHash },
      create: { ...u, passwordHash },
    });
  }
  console.log(`  ✓ ${users.length} tài khoản`);

  // ---------- Trạm trộn ----------
  const stationData = [
    { code: "TNT1", name: "Trạm trộn TNT1", address: "KCN Tân Tạo, TP.HCM" },
    { code: "TNT2", name: "Trạm trộn TNT2", address: "Bình Chánh, TP.HCM" },
    { code: "TSG-TN", name: "Trạm TSG Tây Ninh", address: "Trảng Bàng, Tây Ninh" },
  ];

  const stations: Record<string, string> = {};
  for (const s of stationData) {
    const rec = await prisma.station.upsert({
      where: { code: s.code },
      update: { name: s.name, address: s.address },
      create: s,
    });
    stations[s.code] = rec.id;
  }
  console.log(`  ✓ ${stationData.length} trạm trộn`);

  // ---------- Khách hàng ----------
  const customerData = [
    { code: "KH001", name: "Công trình Chung cư An Phú", contact: "Nguyễn Hữu An", phone: "0912000001" },
    { code: "KH002", name: "Nhà xưởng KCN Tân Thuận", contact: "Trần Bảo Long", phone: "0912000002" },
    { code: "KH003", name: "Cầu đường Bình Lợi", contact: "Lê Văn Cầu", phone: "0912000003" },
    { code: "KH004", name: "Kho bãi Logistics Cát Lái", contact: "Phạm Thị Kho", phone: "0912000004" },
    { code: "KH005", name: "Trường học Tây Ninh", contact: "Võ Minh Trường", phone: "0912000005" },
  ];

  const customers: Record<string, string> = {};
  for (const c of customerData) {
    const rec = await prisma.customer.upsert({
      where: { code: c.code },
      update: { name: c.name, contact: c.contact, phone: c.phone },
      create: c,
    });
    customers[c.code] = rec.id;
  }
  console.log(`  ✓ ${customerData.length} khách hàng`);

  // ---------- Tài xế ----------
  const driverData = [
    { code: "TX001", fullName: "Nguyễn Văn Hải", phone: "0938111001", station: "TNT1", status: DriverStatus.WORKING, shift: Shift.SANG, join: d(2021, 3, 15) },
    { code: "TX002", fullName: "Trần Quốc Dũng", phone: "0938111002", station: "TNT1", status: DriverStatus.WORKING, shift: Shift.SANG, join: d(2020, 7, 1) },
    { code: "TX003", fullName: "Lê Hoàng Nam", phone: "0938111003", station: "TNT1", status: DriverStatus.WORKING, shift: Shift.CHIEU, join: d(2022, 1, 10) },
    { code: "TX004", fullName: "Phạm Văn Tú", phone: "0938111004", station: "TNT2", status: DriverStatus.WORKING, shift: Shift.SANG, join: d(2019, 11, 20) },
    { code: "TX005", fullName: "Võ Minh Tuấn", phone: "0938111005", station: "TNT2", status: DriverStatus.WORKING, shift: Shift.CHIEU, join: d(2023, 4, 5) },
    { code: "TX006", fullName: "Đặng Văn Sơn", phone: "0938111006", station: "TNT2", status: DriverStatus.LEAVE, shift: Shift.SANG, join: d(2021, 9, 12) },
    { code: "TX007", fullName: "Bùi Xuân Trường", phone: "0938111007", station: "TSG-TN", status: DriverStatus.WORKING, shift: Shift.SANG, join: d(2022, 6, 18) },
    { code: "TX008", fullName: "Hồ Văn Lộc", phone: "0938111008", station: "TSG-TN", status: DriverStatus.WORKING, shift: Shift.DEM, join: d(2020, 2, 28) },
    { code: "TX009", fullName: "Ngô Tấn Phát", phone: "0938111009", station: "TNT1", status: DriverStatus.RESIGNED, shift: null, join: d(2018, 5, 9) },
    { code: "TX010", fullName: "Dương Chí Cường", phone: "0938111010", station: "TNT2", status: DriverStatus.WORKING, shift: Shift.DEM, join: d(2023, 8, 22) },
  ];

  const drivers: Record<string, string> = {};
  for (const dr of driverData) {
    const rec = await prisma.driver.upsert({
      where: { code: dr.code },
      update: {
        fullName: dr.fullName,
        phone: dr.phone,
        stationId: stations[dr.station],
        status: dr.status,
        shift: dr.shift,
        joinDate: dr.join,
      },
      create: {
        code: dr.code,
        fullName: dr.fullName,
        phone: dr.phone,
        stationId: stations[dr.station],
        status: dr.status,
        shift: dr.shift,
        joinDate: dr.join,
      },
    });
    drivers[dr.code] = rec.id;
  }
  console.log(`  ✓ ${driverData.length} tài xế`);

  // ---------- Phương tiện ----------
  const vehicleData = [
    { plate: "51C-123.45", code: "BON01", type: VehicleType.BON, brand: "Hyundai", year: 2021, capacity: 10, driver: "TX001", station: "TNT1", status: VehicleStatus.ACTIVE, regExp: daysFromNow(210), insExp: daysFromNow(120) },
    { plate: "51C-234.56", code: "BON02", type: VehicleType.BON, brand: "Hyundai", year: 2020, capacity: 10, driver: "TX002", station: "TNT1", status: VehicleStatus.ACTIVE, regExp: daysFromNow(25), insExp: daysFromNow(60) },
    { plate: "51C-345.67", code: "BON03", type: VehicleType.BON, brand: "Isuzu", year: 2019, capacity: 9, driver: "TX003", station: "TNT1", status: VehicleStatus.REPAIR, regExp: daysFromNow(12), insExp: daysFromNow(90) },
    { plate: "51C-456.78", code: "BON04", type: VehicleType.BON, brand: "Hino", year: 2022, capacity: 12, driver: "TX004", station: "TNT2", status: VehicleStatus.ACTIVE, regExp: daysFromNow(300), insExp: daysFromNow(200) },
    { plate: "51C-567.89", code: "BON05", type: VehicleType.BON, brand: "Hino", year: 2022, capacity: 12, driver: "TX005", station: "TNT2", status: VehicleStatus.ACTIVE, regExp: daysFromNow(-8), insExp: daysFromNow(15) },
    { plate: "51C-678.90", code: "BON06", type: VehicleType.BON, brand: "Daewoo", year: 2018, capacity: 9, driver: "TX006", station: "TNT2", status: VehicleStatus.MAINTENANCE, regExp: daysFromNow(45), insExp: daysFromNow(30) },
    { plate: "70C-111.22", code: "BON07", type: VehicleType.BON, brand: "Hyundai", year: 2023, capacity: 10, driver: "TX007", station: "TSG-TN", status: VehicleStatus.ACTIVE, regExp: daysFromNow(160), insExp: daysFromNow(140) },
    { plate: "70C-222.33", code: "BON08", type: VehicleType.BON, brand: "Hyundai", year: 2023, capacity: 10, driver: "TX008", station: "TSG-TN", status: VehicleStatus.ACTIVE, regExp: daysFromNow(6), insExp: daysFromNow(6) },
    { plate: "51C-999.88", code: "BOM01", type: VehicleType.BOM, brand: "Putzmeister", year: 2021, capacity: null, driver: null, station: "TNT1", status: VehicleStatus.ACTIVE, regExp: daysFromNow(75), insExp: daysFromNow(55) },
    { plate: "51C-777.66", code: "TAI01", type: VehicleType.TAI, brand: "Isuzu", year: 2017, capacity: null, driver: "TX010", station: "TNT2", status: VehicleStatus.SUSPENDED, regExp: daysFromNow(2), insExp: daysFromNow(2) },
  ];

  const vehicles: Record<string, string> = {};
  for (const v of vehicleData) {
    const rec = await prisma.vehicle.upsert({
      where: { plate: v.plate },
      update: {
        code: v.code,
        type: v.type,
        brand: v.brand,
        year: v.year,
        capacity: v.capacity,
        driverId: v.driver ? drivers[v.driver] : null,
        stationId: stations[v.station],
        status: v.status,
        registrationExpiry: v.regExp,
        insuranceExpiry: v.insExp,
      },
      create: {
        plate: v.plate,
        code: v.code,
        type: v.type,
        brand: v.brand,
        year: v.year,
        capacity: v.capacity,
        driverId: v.driver ? drivers[v.driver] : null,
        stationId: stations[v.station],
        status: v.status,
        registrationDate: daysFromNow(-300),
        registrationExpiry: v.regExp,
        insuranceExpiry: v.insExp,
      },
    });
    vehicles[v.plate] = rec.id;
  }
  console.log(`  ✓ ${vehicleData.length} phương tiện`);

  // ---------- Hồ sơ giấy tờ ----------
  await prisma.document.deleteMany({});

  const docRows: Array<{
    entity: DocEntity;
    docType: DocType;
    vehiclePlate?: string;
    driverCode?: string;
    number: string;
    licenseClass?: string;
    issued: Date;
    expiry: Date;
  }> = [];

  for (const v of vehicleData) {
    docRows.push({
      entity: DocEntity.VEHICLE,
      docType: DocType.DANG_KIEM,
      vehiclePlate: v.plate,
      number: `DK-${v.code}`,
      issued: daysFromNow(-300),
      expiry: v.regExp,
    });
    docRows.push({
      entity: DocEntity.VEHICLE,
      docType: DocType.BAO_HIEM_TNDS,
      vehiclePlate: v.plate,
      number: `BH-${v.code}`,
      issued: daysFromNow(-300),
      expiry: v.insExp,
    });
    docRows.push({
      entity: DocEntity.VEHICLE,
      docType: DocType.PHU_HIEU,
      vehiclePlate: v.plate,
      number: `PH-${v.code}`,
      issued: daysFromNow(-200),
      expiry: daysFromNow(Math.floor(Math.random() * 120) + 5),
    });
  }

  const licenseExpiry = [400, 25, 900, 5, 700, 3, 1200, 60, 800, 15];
  driverData.forEach((dr, i) => {
    docRows.push({
      entity: DocEntity.DRIVER,
      docType: DocType.GPLX,
      driverCode: dr.code,
      number: `GPLX-${dr.code}`,
      licenseClass: i % 3 === 0 ? "C" : i % 3 === 1 ? "B2" : "D",
      issued: d(2019, 6, 1),
      expiry: daysFromNow(licenseExpiry[i] ?? 365),
    });
  });

  for (const row of docRows) {
    await prisma.document.create({
      data: {
        entity: row.entity,
        docType: row.docType,
        vehicleId: row.vehiclePlate ? vehicles[row.vehiclePlate] : null,
        driverId: row.driverCode ? drivers[row.driverCode] : null,
        number: row.number,
        licenseClass: row.licenseClass ?? null,
        issuedDate: row.issued,
        expiryDate: row.expiry,
      },
    });
  }
  console.log(`  ✓ ${docRows.length} hồ sơ giấy tờ`);

  // ---------- Lịch sử phân công xe ----------
  await prisma.vehicleDriverHistory.deleteMany({});
  for (const v of vehicleData) {
    if (!v.driver) continue;
    await prisma.vehicleDriverHistory.create({
      data: {
        driverId: drivers[v.driver],
        vehicleId: vehicles[v.plate],
        fromDate: daysFromNow(-180),
        note: "Phân công hiện tại",
      },
    });
  }

  // ---------- Báo cáo sản xuất ----------
  await prisma.productionReport.deleteMany({});

  const grades = ["M200", "M250", "M300", "M350"];
  const supervisors = ["Lê Viết Thành", "Trần Thanh Hùng", "Phạm Minh Điều"];
  const stationCodes = ["TNT1", "TNT2", "TSG-TN"];
  const customerCodes = ["KH001", "KH002", "KH003", "KH004", "KH005"];

  let reportCount = 0;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const reportDate = new Date(today);
    reportDate.setUTCDate(reportDate.getUTCDate() - dayOffset);

    // Mỗi ngày có 1-3 dòng báo cáo
    const rowsToday = 1 + Math.floor(Math.random() * 3);

    for (let r = 0; r < rowsToday; r++) {
      const stationCode = stationCodes[Math.floor(Math.random() * stationCodes.length)];
      const customerCode = customerCodes[Math.floor(Math.random() * customerCodes.length)];
      const shift = [Shift.SANG, Shift.CHIEU, Shift.DEM][Math.floor(Math.random() * 3)];
      const grade = grades[Math.floor(Math.random() * grades.length)];
      const planned = [60, 80, 100, 120, 150][Math.floor(Math.random() * 5)];
      const actual = Math.round((planned * (0.72 + Math.random() * 0.42)) * 10) / 10;
      const truckCount = 3 + Math.floor(Math.random() * 5);
      const tripCount = Math.max(1, Math.round(actual / (8 + Math.random() * 4)));

      const status =
        dayOffset === 0 ? ReportStatus.DRAFT : dayOffset <= 2 ? ReportStatus.SUBMITTED : ReportStatus.APPROVED;

      try {
        await prisma.productionReport.create({
          data: {
            reportDate,
            shift,
            stationId: stations[stationCode],
            customerId: customers[customerCode],
            grade,
            slump: [12, 14, 16, 18][Math.floor(Math.random() * 4)],
            plannedVolume: planned,
            actualVolume: actual,
            truckCount,
            tripCount,
            startTime: shift === Shift.SANG ? "07:00" : shift === Shift.CHIEU ? "13:00" : "21:00",
            endTime: shift === Shift.SANG ? "11:30" : shift === Shift.CHIEU ? "17:30" : "01:30",
            supervisorName: supervisors[Math.floor(Math.random() * supervisors.length)],
            incidentNote:
              Math.random() > 0.88 ? "Xe BON03 vào xưởng sửa, điều xe từ TNT2 sang hỗ trợ." : null,
            status,
            submittedAt: status === ReportStatus.DRAFT ? null : reportDate,
            approvedAt: status === ReportStatus.APPROVED ? reportDate : null,
          },
        });
        reportCount++;
      } catch {
        // bỏ qua bản ghi trùng khóa duy nhất
      }
    }
  }
  console.log(`  ✓ ${reportCount} dòng báo cáo sản xuất`);

  // ---------- Camera ----------
  // KHÔNG tạo camera giả. Camera thật do người dùng thêm qua giao diện
  // (AI Camera giám sát → Thêm camera) và do Agent kết nối RTSP thật.
  const existingCams = await prisma.camera.count();
  console.log(`  ✓ ${existingCams} camera (không tạo dữ liệu giả)`);

  // ---------- Cấu hình Telegram ----------
  await prisma.telegramConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      botTokenEnc: null,
      chatId: null,
      enabled: false,
      dedupeSeconds: 120,
    },
  });

  // ---------- Cài đặt hệ thống ----------
  const settings = [
    { key: "company.name", value: "CÔNG TY CỔ PHẦN SX KD DV BÊ TÔNG TSG TNT" },
    { key: "company.shortName", value: "TSG-TNT" },
    { key: "company.address", value: "KCN Tân Tạo, Quận Bình Tân, TP. Hồ Chí Minh" },
    { key: "company.phone", value: "028 3750 0000" },
    { key: "report.autoSendTime", value: "17:30" },
    { key: "report.autoSendEnabled", value: "false" },
    { key: "camera.imageRetentionDays", value: "30" },
    { key: "alert.warningDays", value: "30,15,7,3" },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log(`  ✓ ${settings.length} cài đặt hệ thống`);

  console.log("\n✅ Hoàn tất. Đăng nhập: admin / TsgTnt@2026");
}

main()
  .catch((e) => {
    console.error("❌ Seed thất bại:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
