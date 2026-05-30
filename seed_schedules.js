const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const level = "ปวช.1";
  const academicYear = "2567";
  const term = "1";

  const subjectDataList = [
    { code: "TH101", name: "ภาษาไทยพื้นฐาน", level, academicYear, term },
    { code: "EN101", name: "ภาษาอังกฤษเพื่อการสื่อสาร", level, academicYear, term },
    { code: "MA101", name: "คณิตศาสตร์อุตสาหกรรม", level, academicYear, term },
    { code: "SC101", name: "วิทยาศาสตร์เพื่อพัฒนาทักษะชีวิต", level, academicYear, term },
    { code: "PE101", name: "พลศึกษาเพื่อพัฒนาสุขภาพ", level, academicYear, term },
    { code: "IT101", name: "คอมพิวเตอร์และสารสนเทศ", level, academicYear, term },
    { code: "DR101", name: "เขียนแบบเทคนิคเบื้องต้น", level, academicYear, term },
    { code: "EL101", name: "งานไฟฟ้าเบื้องต้น", level, academicYear, term },
    { code: "AU101", name: "พื้นฐานงานช่างยนต์", level, academicYear, term },
    { code: "WE101", name: "งานเชื่อมเบื้องต้น", level, academicYear, term },
    { code: "AC101", name: "การบัญชีเบื้องต้น", level, academicYear, term },
    { code: "LA101", name: "กฎหมายแรงงาน", level, academicYear, term },
    { code: "TY101", name: "การพิมพ์ไทยด้วยคอมพิวเตอร์", level, academicYear, term },
    { code: "SC001", name: "กิจกรรมลูกเสือวิสามัญ", level, academicYear, term },
    { code: "CI101", name: "หน้าที่พลเมืองและศีลธรรม", level, academicYear, term },
  ];

  const subjects = {};

  // Create Subjects if not exist
  for (const s of subjectDataList) {
    let subject = await prisma.subject.findFirst({
      where: { code: s.code, academicYear: s.academicYear, term: s.term }
    });
    if (!subject) {
      subject = await prisma.subject.create({ data: s });
    }
    subjects[s.code] = subject;
  }

  const scheduleDataList = [
    // จันทร์ (1)
    { subjectId: subjects["TH101"].id, dayOfWeek: 1, startTime: "08:30", endTime: "10:30" },
    { subjectId: subjects["MA101"].id, dayOfWeek: 1, startTime: "10:30", endTime: "12:30" },
    { subjectId: subjects["IT101"].id, dayOfWeek: 1, startTime: "13:30", endTime: "15:30" },
    { subjectId: subjects["PE101"].id, dayOfWeek: 1, startTime: "15:30", endTime: "17:30" },
    
    // อังคาร (2)
    { subjectId: subjects["EN101"].id, dayOfWeek: 2, startTime: "08:30", endTime: "10:30" },
    { subjectId: subjects["SC101"].id, dayOfWeek: 2, startTime: "10:30", endTime: "12:30" },
    { subjectId: subjects["DR101"].id, dayOfWeek: 2, startTime: "13:30", endTime: "16:30" },

    // พุธ (3)
    { subjectId: subjects["EL101"].id, dayOfWeek: 3, startTime: "08:30", endTime: "11:30" },
    { subjectId: subjects["AU101"].id, dayOfWeek: 3, startTime: "12:30", endTime: "15:30" },
    { subjectId: subjects["SC001"].id, dayOfWeek: 3, startTime: "15:30", endTime: "17:30" },

    // พฤหัสบดี (4)
    { subjectId: subjects["WE101"].id, dayOfWeek: 4, startTime: "08:30", endTime: "10:30" },
    { subjectId: subjects["AC101"].id, dayOfWeek: 4, startTime: "10:30", endTime: "12:30" },
    { subjectId: subjects["TY101"].id, dayOfWeek: 4, startTime: "13:30", endTime: "15:30" },

    // ศุกร์ (5)
    { subjectId: subjects["LA101"].id, dayOfWeek: 5, startTime: "08:30", endTime: "10:30" },
    { subjectId: subjects["CI101"].id, dayOfWeek: 5, startTime: "10:30", endTime: "12:30" },
    { subjectId: subjects["EN101"].id, dayOfWeek: 5, startTime: "13:30", endTime: "15:30" },
  ];

  // Remove existing schedules for these subjects to avoid duplicates if re-run
  for (const sName in subjects) {
    const sId = subjects[sName].id;
    await prisma.schedule.deleteMany({ where: { subjectId: sId } });
  }

  // Create new schedules
  for (const sch of scheduleDataList) {
    await prisma.schedule.create({ data: sch });
  }

  console.log("Seeding complete. 15 subjects and a full week schedule populated for ปวช.1");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
