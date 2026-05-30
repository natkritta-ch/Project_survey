const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find the target student
  const student = await prisma.user.findFirst({
    where: { username: "66020329" }
  });

  if (!student) {
    console.log("Student 66020329 not found. Please ensure this user exists.");
    return;
  }

  // Create some dummy subjects if we don't have enough
  const term1Subjects = [
    { code: "20000-1101", name: "ภาษาไทยพื้นฐาน", credit: 2.0, level: "ปวช.1", academicYear: "2566", term: "1", group: "ก.1" },
    { code: "20000-1201", name: "ภาษาอังกฤษในชีวิตจริง", credit: 2.0, level: "ปวช.1", academicYear: "2566", term: "1", group: "ก.1" },
    { code: "20000-1401", name: "คณิตศาสตร์พื้นฐานอาชีพ", credit: 2.0, level: "ปวช.1", academicYear: "2566", term: "1", group: "ก.1" },
    { code: "20204-2001", name: "คอมพิวเตอร์และสารสนเทศเพื่องานอาชีพ", credit: 3.0, level: "ปวช.1", academicYear: "2566", term: "1", group: "ก.1" }
  ];

  const term2Subjects = [
    { code: "20000-1102", name: "ภาษาไทยเพื่ออาชีพ", credit: 2.0, level: "ปวช.1", academicYear: "2566", term: "2", group: "ก.1" },
    { code: "20000-1202", name: "ภาษาอังกฤษฟัง-พูด", credit: 2.0, level: "ปวช.1", academicYear: "2566", term: "2", group: "ก.1" },
    { code: "20204-2002", name: "โปรแกรมระบบปฏิบัติการ", credit: 3.0, level: "ปวช.1", academicYear: "2566", term: "2", group: "ก.1" },
    { code: "20204-2003", name: "คณิตศาสตร์คอมพิวเตอร์", credit: 2.0, level: "ปวช.1", academicYear: "2566", term: "2", group: "ก.1" }
  ];

  const gradesData = [
    // Term 1 Grades
    { code: "20000-1101", grade: 3.5 },
    { code: "20000-1201", grade: 4.0 },
    { code: "20000-1401", grade: 3.0 },
    { code: "20204-2001", grade: 4.0 },
    // Term 2 Grades
    { code: "20000-1102", grade: 3.5 },
    { code: "20000-1202", grade: 3.0 },
    { code: "20204-2002", grade: 4.0 },
    { code: "20204-2003", grade: 2.5 }
  ];

  console.log("Upserting dummy subjects...");
  const dbSubjects = [];
  for (const subj of [...term1Subjects, ...term2Subjects]) {
    const s = await prisma.subject.upsert({
      where: { 
        code_academicYear_term: {
          code: subj.code,
          academicYear: subj.academicYear,
          term: subj.term
        }
      },
      update: { ...subj },
      create: { ...subj }
    });
    dbSubjects.push(s);
  }

  console.log("Upserting grades for student 66020329...");
  for (const gd of gradesData) {
    const subject = dbSubjects.find(s => s.code === gd.code);
    if (subject) {
      await prisma.grade.upsert({
        where: {
          studentId_subjectId: {
            studentId: student.id,
            subjectId: subject.id
          }
        },
        update: { grade: gd.grade },
        create: {
          studentId: student.id,
          subjectId: subject.id,
          grade: gd.grade
        }
      });
    }
  }

  console.log("Grades successfully generated! Please check the web UI.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
