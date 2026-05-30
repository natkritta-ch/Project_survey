const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const student = await prisma.user.findUnique({ where: { username: '66020329' } });
  if (!student) return console.log("Student not found");

  const subjects = await prisma.subject.findMany({ take: 3 });
  if (subjects.length === 0) return console.log("No subjects found to add attendance");

  console.log(`Adding attendance for ${student.name} (${student.username})...`);

  const statuses = ["PRESENT", "PRESENT", "PRESENT", "ABSENT", "LATE"];
  
  // เพิ่มประวัติย้อนหลัง 10 วัน
  for (let i = 0; i < 10; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i); 

    // กิจกรรมหน้าเสาธง (Assembly)
    await prisma.attendance.create({
      data: {
        studentId: student.id,
        type: "assembly",
        status: statuses[Math.floor(Math.random() * statuses.length)],
        timestamp: new Date(d.setHours(8, 0, 0, 0))
      }
    });

    // วิชาเรียนต่างๆ (Classes)
    for (const sub of subjects) {
      await prisma.attendance.create({
        data: {
          studentId: student.id,
          subjectId: sub.id,
          type: "class",
          status: statuses[Math.floor(Math.random() * statuses.length)],
          timestamp: new Date(d.setHours(10 + Math.floor(Math.random()*4), 0, 0, 0))
        }
      });
    }
  }

  console.log("✅ Added attendance history for student 66020329 successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
