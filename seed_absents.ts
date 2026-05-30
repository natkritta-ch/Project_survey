import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Starting mock data generation for 'ขร.'...");
  
  const subject = await prisma.subject.findFirst({ 
    orderBy: { id: 'desc' } 
  });
  if (!subject) throw new Error("No subjects found");

  // Get two students
  const students = await prisma.user.findMany({ 
    where: { role: "STUDENT" },
    take: 2
  });
  
  if (students.length === 0) throw new Error("No students found");

  const student1 = students[0];
  
  // Create 4 'ABSENT' attendance records for this student and subject (Trigger ขร.)
  console.log(`Inserting 4 ABSENT records for Student ${student1.name} in Subject ${subject.name} to trigger ขร.`);
  
  for (let i = 0; i < 4; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i - 1); // past 4 days
    await prisma.attendance.create({
      data: {
        studentId: student1.id,
        subjectId: subject.id,
        status: "ABSENT",
        type: "class",
        timestamp: d
      }
    });
  }

  if (students.length > 1) {
    const student2 = students[1];
    // Create 3 'ABSENT' attendance records for student 2 (Trigger Warning / เสี่ยง)
    console.log(`Inserting 3 ABSENT records for Student ${student2.name} in Subject ${subject.name} to trigger เสี่ยง ขร.`);
    for (let i = 0; i < 3; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i - 5);
      await prisma.attendance.create({
        data: {
          studentId: student2.id,
          subjectId: subject.id,
          status: "ABSENT",
          type: "class",
          timestamp: d
        }
      });
    }
  }

  console.log("Mock data inserted successfully!");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
