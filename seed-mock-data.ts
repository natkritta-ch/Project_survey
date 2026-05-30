import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const level = "ปวช.1";
  const academicYear = "2569";
  const term = "1";
  const group = "ก.1,2";
  const room = "Computer";

  console.log("Starting to seed subjects and schedules...");

  // create subjects
  const subjectsData = [
    { code: "CS101", name: "วิทยาการคอมพิวเตอร์พื้นฐาน", level, group, room, academicYear, term },
    { code: "MATH101", name: "คณิตศาสตร์ประยุกต์ 1", level, group, room: "สถ.1", academicYear, term },
    { code: "ENG101", name: "ภาษาอังกฤษเพื่อการสื่อสาร", level, group, room: "อังกฤษ 1", academicYear, term },
    { code: "PHY101", name: "ฟิสิกส์พื้นฐาน", level, group, room, academicYear, term },
    { code: "PROG101", name: "การเขียนโปรแกรมเบื้องต้น", level, group, room: "Computer", academicYear, term },
    { code: "WEB101", name: "การพัฒนาเว็บไซต์", level, group, room: "Computer", academicYear, term },
    { code: "DB101", name: "ระบบฐานข้อมูลเบื้องต้น", level, group, room: "Computer", academicYear, term },
    { code: "NW101", name: "เครือข่ายคอมพิวเตอร์เบื้องต้น", level, group, room: "Computer", academicYear, term },
    { code: "SA101", name: "การวิเคราะห์และออกแบบระบบ", level, group, room: "Computer", academicYear, term },
    { code: "HIS101", name: "ประวัติศาสตร์ชาติไทย", level, group, room: "สถ.2", academicYear, term },
    { code: "PE101", name: "พลศึกษา", level, group, room: "สนามฟุตบอล", academicYear, term },
    { code: "THAI101", name: "ภาษาไทยเพื่ออาชีพ", level, group, room: "สถ.3", academicYear, term },
    { code: "LIFE101", name: "ทักษะชีวิต", level, group, room: "สถ.4", academicYear, term },
    { code: "ENG102", name: "ภาษาอังกฤษในชีวิตประจำวัน", level, group, room: "อังกฤษ 2", academicYear, term },
  ];

  const createdSubjects = [];
  for (const s of subjectsData) {
    const existing = await prisma.subject.findFirst({ where: { code: s.code, academicYear, term } });
    if (!existing) {
      createdSubjects.push(await prisma.subject.create({ data: s }));
      console.log(`Created subject: ${s.code}`);
    } else {
      createdSubjects.push(existing);
      console.log(`Subject exists: ${s.code}`);
    }
  }

  // Clear existing schedules for these subjects just in case to prevent duplicates during multiple runs
  await prisma.schedule.deleteMany({
    where: {
      subjectId: {
        in: createdSubjects.map(s => s.id)
      }
    }
  });
  console.log("Cleared old schedules for these subjects.");

  // Create schedule mapping
  // Day 1 to 5
  let subjectIndex = 0;
  for (let day = 1; day <= 5; day++) {
    // 3 - 4 subjects per day
    let startHour = 8;
    const subjectsPerDay = day % 2 === 0 ? 3 : 4; // Alternate 3 or 4 classes a day
    for (let i = 0; i < subjectsPerDay; i++) {
        if (subjectIndex >= createdSubjects.length) {
            subjectIndex = 0; // loop back
        }
        const subj = createdSubjects[subjectIndex];
        const startStr = `${startHour.toString().padStart(2, '0')}:00`;
        const duration = 2; // Every class is 2 hours for simplicity
        const endHour = startHour + duration;
        const endStr = `${endHour.toString().padStart(2, '0')}:00`;

        await prisma.schedule.create({
            data: {
                subjectId: subj.id,
                dayOfWeek: day,
                startTime: startStr,
                endTime: endStr
            }
        });
        console.log(`Scheduled ${subj.code} on day ${day} at ${startStr}-${endStr}`);

        startHour = endHour;
        // Optionally add lunch break if startHour is 12
        if (startHour === 12) {
            startHour += 1;
        }

        subjectIndex++;
    }
  }

  console.log("Mock data inserted successfully.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
