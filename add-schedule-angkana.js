const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const teacher = await prisma.user.findUnique({ where: { username: 'teacher1' } });
  if (!teacher) return console.log("Teacher not found");

  const subjects = await prisma.subject.findMany({ where: { teacherId: teacher.id } });
  if (subjects.length === 0) return console.log("No subjects found for teacher1");

  console.log(`Found ${subjects.length} subjects. Adding schedules...`);

  // เคลียร์ตารางสอนเก่าถ้ามี
  await prisma.schedule.deleteMany({
    where: { subjectId: { in: subjects.map(s => s.id) } }
  });

  // สร้างตารางเรียนจำลองในแต่ละวัน
  const times = [
    { dayOfWeek: 1, startTime: "08:00", endTime: "10:00" }, // จันทร์
    { dayOfWeek: 2, startTime: "13:00", endTime: "16:00" }, // อังคาร
    { dayOfWeek: 3, startTime: "10:00", endTime: "12:00" }, // พุธ
    { dayOfWeek: 4, startTime: "08:00", endTime: "10:00" }, // พฤหัส
    { dayOfWeek: 5, startTime: "13:00", endTime: "15:00" }, // ศุกร์
  ];

  for (let i = 0; i < subjects.length; i++) {
    const t = times[i % times.length];
    await prisma.schedule.create({
      data: {
        subjectId: subjects[i].id,
        dayOfWeek: t.dayOfWeek,
        startTime: t.startTime,
        endTime: t.endTime
      }
    });
    console.log(`Scheduled ${subjects[i].name} on Day ${t.dayOfWeek} at ${t.startTime}-${t.endTime}`);
  }
  console.log("✅ เพิ่มตารางสอนให้ครูอังคนาเรียบร้อยแล้ว!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
