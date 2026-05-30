import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Looking for teacher1...");
  let teacher = await prisma.user.findUnique({
    where: { username: 'teacher1' }
  });

  if (!teacher) {
    teacher = await prisma.user.findFirst({ where: { role: 'TEACHER' } });
  }

  if (!teacher) throw new Error("No teachers found to mock data");

  // Update name to ครูอังคนา
  teacher = await prisma.user.update({
    where: { id: teacher.id },
    data: { name: 'ครูอังคนา สอนดี' }
  });

  console.log("Teacher Updated TO:", teacher.name);

  // We want to make sure she has at least 5 subjects
  let subjects = await prisma.subject.findMany({
    where: { teacherId: teacher.id }
  });

  if (subjects.length < 5) {
     console.log("Creating additional subjects for her...");
     const subjectsToCreate = [
       "คณิตศาสตร์ประยุกต์ 1",
       "คณิตศาสตร์อุตสาหกรรม",
       "สถิติเบื้องต้น",
       "แคลคูลัส 1",
       "วิทยาศาสตร์ประยุกต์"
     ];
     
     let needed = 5 - subjects.length;
     for (let i = 0; i < needed; i++) {
        const subj = await prisma.subject.create({
           data: {
             name: subjectsToCreate[i % subjectsToCreate.length] + ' ' + (i+1),
             code: "MATH-" + Math.floor(Math.random() * 9000 + 1000),
             level: i % 2 === 0 ? "ปวช.1" : "ปวส.1",
             group: "ก.1",
             academicYear: "2569",
             term: "1",
             teacherId: teacher.id
           }
        });
        subjects.push(subj);
     }
  }

  // Ensure we have some test students
  const students = await prisma.user.findMany({ 
    where: { role: 'STUDENT', deletedAt: null }, 
    take: 12 
  });

  console.log(`Seeding attendance for ${subjects.slice(0, 5).length} subjects...`);

  // Target exactly 5 subjects to seed
  const targetSubjects = subjects.slice(0, 5);

  for (const subject of targetSubjects) {
     console.log(`Seeding subject: ${subject.name}...`);
     
     // 8 days of class
     for (let dayOffset = 0; dayOffset < 8; dayOffset++) {
       const date = new Date();
       date.setDate(date.getDate() - (dayOffset * 3)); // every 3 days 
       
       for (let sIdx = 0; sIdx < students.length; sIdx++) {
          const student = students[sIdx];
          
          let status = "PRESENT";
          
          // Force some specific ขร. and เสี่ยง scenarios
          if (sIdx === 0 && dayOffset < 4) {
             // Student 0 gets 4 ABSENTs in every class -> ติด ขร.
             status = "ABSENT"; 
          } else if (sIdx === 1 && dayOffset < 3) {
             // Student 1 gets 3 ABSENTs -> เสี่ยง
             status = "ABSENT";
          } else if (sIdx === 2 && dayOffset < 2) {
             // Student 2 gets 2 ABSENTs
             status = "ABSENT";
          } else {
             // Random
             const rand = Math.random();
             if (rand > 0.85) status = "ABSENT";
             else if (rand > 0.75) status = "LATE";
             else if (rand > 0.65) status = "LEAVE_PERSONAL";
             else if (rand > 0.6) status = "LEAVE_SICK";
          }

          // Don't add duplicate logs for same day
          const existing = await prisma.attendance.findFirst({
            where: {
               studentId: student.id,
               subjectId: subject.id,
               timestamp: {
                  gte: new Date(date.setHours(0,0,0,0)),
                  lte: new Date(date.setHours(23,59,59,999))
               }
            }
          });

          if (!existing) {
             await prisma.attendance.create({
                data: {
                   studentId: student.id,
                   subjectId: subject.id,
                   status,
                   type: "class",
                   timestamp: date
                }
             });
          }
       }
     }
  }

  console.log("Seeding complete for ครูอังคนา!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
