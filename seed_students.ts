import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Generating 10 mock students...");
  
  const subject = await prisma.subject.findFirst({ orderBy: { id: 'desc' } });
  if (!subject) throw new Error("No subjects found");

  const pwd = "$2a$12$Kk0XWq5q3X/E/.9sL/S31OT9D3qBq4Q2Fh3GZ0HwT5.2C3Y5V9r32";
  
  const mockNames = [
    "สมชาย สมปอง", "มะลิ ทะลุแป้ง", "สมรักษ์ คำสิงห์", "ประยุทธ์ สุขสบาย",
    "สมควร รักเรียน", "มานี ใจดี", "ปิติ ขยัน", "ชูใจ ร่าเริง", 
    "วีระ ใจกล้า", "วิชา ตั้งใจ"
  ];

  for (let i = 0; i < mockNames.length; i++) {
    const student = await prisma.user.create({
      data: {
        name: mockNames[i],
        username: `mock${i+1000}`,
        password: pwd,
        role: "STUDENT",
        level: i % 2 === 0 ? "ปวช.1" : "ปวช.2",
      }
    });

    console.log(`Created student: ${student.name}`);

    // Randomize absences
    let absences = 0;
    if (i < 3) absences = 4; // 3 students have 4 absences (ขร.)
    else if (i < 6) absences = 3; // 3 students have 3 absences (เสี่ยง)
    else if (i < 8) absences = 2; // 2 students have 2
    else absences = 1;

    for (let j = 0; j < absences; j++) {
      const d = new Date();
      d.setDate(d.getDate() - j - 1);
      await prisma.attendance.create({
        data: {
          studentId: student.id,
          subjectId: subject.id,
          status: "ABSENT",
          type: "class",
          timestamp: d
        }
      });
    }

    // Add some Assembly absences to trigger มผ. for a few
    if (i % 3 === 0) {
      for (let j = 0; j < 5; j++) {
        const d = new Date();
        d.setDate(d.getDate() - j - 1);
        await prisma.attendance.create({
          data: {
            studentId: student.id,
            status: "ABSENT",
            type: "assembly",
            timestamp: d
          }
        });
      }
    }
  }

  console.log("Mock data inserted successfully!");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
