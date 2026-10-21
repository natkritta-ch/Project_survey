import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "../../../lib/prisma";
import { getCurrentTermConfig } from "../../../lib/term";
import TeacherDashboardClient from "./TeacherDashboardClient";
import LogoutButton from "../../../components/LogoutButton";

export default async function TeacherDashboard() {
  const session = await getServerSession(authOptions);
  // Fix #6: รองรับทั้ง TEACHER และ HEAD เพราะ API attendance รองรับ HEAD แล้ว
  const userRole = (session?.user as any)?.role;
  if (userRole !== "TEACHER" && userRole !== "HEAD") {
    redirect("/login");
  }

  const userId = (session.user as any).id;

  // ดึงวิชาที่อาจารย์คนนี้สอน
  const subjects = await prisma.subject.findMany({
    where: { teacherId: userId, deletedAt: null }
  });

  const subjectIds = subjects.map(s => s.id);

  // ดึงตารางเรียนเฉพาะวิชาที่อาจารย์คนนี้สอน (รวมข้อมูลวิชามาด้วยเพื่อให้เห็นระดับชั้น)
  const schedules = await prisma.schedule.findMany({
    where: { subjectId: { in: subjectIds }, deletedAt: null },
    include: { subject: true },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  // สร้าง list ชั้นปีที่มีสอน
  const uniqueLevels = new Set(schedules.map(sc => sc.subject?.level || "ไม่ระบุ"));
  const allLevels = Array.from(uniqueLevels).filter(Boolean) as string[];

  // หาเทอมปัจจุบันอัตโนมัติจากวันที่ปัจจุบัน
  const currentTerm = await getCurrentTermConfig();

  // เปรียบเทียบ TermConfig กับค่า term จริงที่อยู่ในตารางสอน
  let activeTermName = "ทั้งหมด";
  if (currentTerm) {
    const termValue = currentTerm.term;
    const yearValue = currentTerm.academicYear;
    const fullTermName = `${termValue}/${yearValue}`;
    
    const allSubjectTerms = Array.from(new Set(schedules.map(sc => sc.subject?.term).filter(Boolean)));
    
    // ลองหาชื่อที่ตรงกับเทอมเต็มก่อน (เช่น 1/2569) หรือถ้าไม่เจอให้ลองหาแค่เลขเทอม (เช่น 1)
    if (allSubjectTerms.includes(fullTermName)) {
      activeTermName = fullTermName;
    } else {
      const matched = allSubjectTerms.find(t => t === termValue);
      if (matched) activeTermName = matched;
    }
  }

  // 5. ข้อมูลนักเรียนและผู้ปกครอง สำหรับแท็บที่ 3 (เฉพาะชั้นปีที่อาจารย์สอน)
  const rawStudentsWithParents = await prisma.user.findMany({
    where: { 
      role: "STUDENT", 
      level: { in: allLevels },
      deletedAt: null
    },
    select: {
      id: true,
      username: true,
      name: true,
      level: true,
      parentCode: true,
      studentLinks: {
        where: { status: "APPROVED" },
        include: { parent: { select: { name: true, phone: true } } }
      }
    },
    orderBy: [{ level: 'asc' }, { username: 'asc' }]
  });

  const studentsWithParents = rawStudentsWithParents.map(st => ({
    id: st.id,
    username: st.username,
    name: st.name,
    level: st.level,
    parentCode: st.parentCode,
    parentLinks: st.studentLinks
  }));

  // 6. ดึงสถิติการเข้าเรียนในสัปดาห์นี้ (จันทร์-อาทิตย์) เฉพาะวิชาที่อาจารย์สอน
  const todayDate = new Date();
  const currentDay = todayDate.getDay();
  const diff = todayDate.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // หาวันจันทร์
  
  const startOfWeek = new Date(todayDate);
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const weeklyAttendances = await prisma.attendance.findMany({
    where: {
      subjectId: { in: subjectIds },
      timestamp: {
        gte: startOfWeek,
        lte: endOfWeek
      }
    }
  });

  const weeklyStats = {
    totalRecords: weeklyAttendances.length,
    presents: weeklyAttendances.filter(a => a.status === "PRESENT" || a.status === "LATE").length,
    absents: weeklyAttendances.filter(a => a.status === "ABSENT").length,
    leaves: weeklyAttendances.filter(a => a.status === "LEAVE_PERSONAL" || a.status === "LEAVE_SICK").length
  };

  // 7. ดึงคลาสสอนชดเชยของอาจารย์ (แยกคลาสปกติและถังขยะ)
  let makeupClasses: any[] = [];
  let trashedMakeupClasses: any[] = [];
  const msInDay = 24 * 60 * 60 * 1000;

  try {
    makeupClasses = await (prisma as any).makeupClass.findMany({
      where: {
        subjectId: { in: subjectIds },
        deletedAt: null
      },
      include: {
        subject: {
          select: { id: true, name: true, code: true, level: true, room: true }
        }
      },
      orderBy: [{ date: 'desc' }, { startTime: 'asc' }]
    });

    const rawTrashed = await (prisma as any).makeupClass.findMany({
      where: {
        subjectId: { in: subjectIds },
        deletedAt: { not: null }
      },
      include: {
        subject: {
          select: { id: true, name: true, code: true, level: true, room: true }
        }
      },
      orderBy: [{ deletedAt: 'desc' }]
    });

    trashedMakeupClasses = rawTrashed.map((mc: any) => {
      const deletedTime = new Date(mc.deletedAt).getTime();
      const expiryTime = deletedTime + (7 * msInDay);
      const daysRemaining = Math.max(0, Math.ceil((expiryTime - Date.now()) / msInDay));
      return {
        ...mc,
        daysRemaining
      };
    });
  } catch (err) {
    try {
      makeupClasses = await (prisma as any).makeupClass.findMany({
        where: { subjectId: { in: subjectIds } },
        include: { subject: { select: { id: true, name: true, code: true, level: true, room: true } } },
        orderBy: [{ date: 'desc' }, { startTime: 'asc' }]
      });
    } catch {
      makeupClasses = [];
    }
    trashedMakeupClasses = [];
  }

  // 7. ข้อมูลห้องในที่ปรึกษา (Classroom Advisor)
  const currentAcademicYear = currentTerm?.academicYear || String(new Date().getFullYear() + 543);
  let advisoryData: any = null;

  try {
    const advisorAssignments = await (prisma as any).classroomAdvisor.findMany({
      where: {
        academicYear: currentAcademicYear,
        OR: [
          { primaryAdvisorId: userId },
          { coAdvisorId: userId }
        ]
      },
      include: {
        primaryAdvisor: { select: { id: true, name: true, phone: true } },
        coAdvisor: { select: { id: true, name: true, phone: true } }
      }
    });

    if (advisorAssignments && advisorAssignments.length > 0) {
      const advisedLevels = advisorAssignments.map((a: any) => a.level);

      const rawAdvisedStudents = await prisma.user.findMany({
        where: {
          role: "STUDENT",
          level: { in: advisedLevels },
          deletedAt: null
        },
        select: {
          id: true,
          username: true,
          name: true,
          level: true,
          nickname: true,
          phone: true,
          parentCode: true,
          nationalId: true,
          profilePicture: true,
          isTwin: true,
          twinVerified: true,
          twinNote: true,
          studentLinks: {
            where: { status: "APPROVED" },
            include: { parent: { select: { id: true, name: true, phone: true } } }
          },
          attendances: {
            select: {
              id: true,
              type: true,
              status: true,
              timestamp: true,
              subjectId: true,
              subject: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  teacher: {
                    select: { name: true }
                  }
                }
              }
            }
          }
        },
        orderBy: [{ level: 'asc' }, { username: 'asc' }]
      });

      // ดึงรายวิชาทั้งหมดของระดับชั้นที่ครูเป็นที่ปรึกษา เพื่อแมปตารางวิชาให้ครบถ้วน
      const levelSubjects = await prisma.subject.findMany({
        where: {
          level: { in: advisedLevels },
          deletedAt: null
        },
        select: {
          id: true,
          code: true,
          name: true,
          level: true,
          teacher: { select: { name: true } }
        }
      });

      // หาจำนวนวันเข้าแถวหน้าเสาธงทั้งหมดที่มีการบันทึกในระบบของระดับชั้นที่ครูดูแล
      const allClassAssemblyLogs = await prisma.attendance.findMany({
        where: {
          type: "assembly",
          student: { level: { in: advisedLevels }, deletedAt: null }
        },
        select: { timestamp: true }
      });
      const uniqueClassAssemblyDates = new Set(
        allClassAssemblyLogs.map(a => new Date(a.timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }))
      );
      const totalClassAssemblyDays = uniqueClassAssemblyDates.size;

      const processedAdvisedStudents = rawAdvisedStudents.map((st: any) => {
        const atts = st.attendances || [];

        // 1. แยกการเข้าแถวหน้าเสาธง (Assembly)
        const assemblyAtts = atts.filter((a: any) => a.type === "assembly");
        
        // จัดกลุ่มวันเข้าแถวของนักเรียนคนนี้ เพื่อป้องกันการนับซ้ำในวันเดียวกัน
        const studentAssemblyDayMap = new Map<string, string>();
        assemblyAtts.forEach((a: any) => {
          const dStr = new Date(a.timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
          if (!studentAssemblyDayMap.has(dStr)) {
            studentAssemblyDayMap.set(dStr, a.status);
          } else {
            const prev = studentAssemblyDayMap.get(dStr);
            if (prev !== 'PRESENT' && a.status === 'PRESENT') studentAssemblyDayMap.set(dStr, a.status);
            else if (prev === 'ABSENT' && a.status === 'LATE') studentAssemblyDayMap.set(dStr, a.status);
          }
        });

        const assemblyPresents = Array.from(studentAssemblyDayMap.values()).filter(status => ["PRESENT", "LATE"].includes(status)).length;
        const assemblyLeaves = Array.from(studentAssemblyDayMap.values()).filter(status => ["LEAVE_PERSONAL", "LEAVE_SICK"].includes(status)).length;
        
        // ฐานจำนวนวันเข้าแถว: ใช้วันเปิดเช็คแถวของห้อง/ระดับชั้น ถ้าไม่มีให้ใช้วันของนักเรียน
        const effectiveTotalDays = totalClassAssemblyDays > 0 ? totalClassAssemblyDays : studentAssemblyDayMap.size;
        
        // จำนวนวันที่ขาด = วันที่เปิดเช็คทั้งหมด - วันที่มา - วันที่ลา
        const assemblyAbsents = Math.max(0, effectiveTotalDays - assemblyPresents - assemblyLeaves);
        
        // คำนวณเปอร์เซ็นต์จริง
        const hasAssemblyRecords = effectiveTotalDays > 0;
        const assemblyPercent = hasAssemblyRecords ? Math.round((assemblyPresents / effectiveTotalDays) * 100) : 0;
        
        // เสี่ยง ม.ผ. ตามเกณฑ์ สอศ. (เวลาเข้าร่วม < 80% หรือ ขาด >= 4 ครั้ง หรือ ขาด >= 20%)
        const isAssemblyAtRisk = hasAssemblyRecords && (assemblyAbsents >= 4 || (effectiveTotalDays > 0 && (assemblyAbsents / effectiveTotalDays) >= 0.20) || assemblyPercent < 80);

        // 2. แยกวิชาเรียนรายวิชา (Class)
        const classAtts = atts.filter((a: any) => a.type === "class");
        const relevantSubjects = levelSubjects.filter((s: any) => s.level === st.level);
        
        // รวบรวมวิชาทั้งหมดที่เด็กเคยเช็คชื่อ หรือมีในหลักสูตรระดับชั้นนี้
        const subjectMap = new Map<string, any>();
        relevantSubjects.forEach((s: any) => {
          subjectMap.set(s.id, {
            id: s.id,
            code: s.code,
            name: s.name,
            teacherName: s.teacher?.name || "ไม่ระบุอาจารย์",
            total: 0,
            presents: 0,
            absents: 0,
            leaves: 0,
            percent: 0,
            isAtRisk: false
          });
        });

        classAtts.forEach((a: any) => {
          if (!a.subjectId) return;
          if (!subjectMap.has(a.subjectId)) {
            subjectMap.set(a.subjectId, {
              id: a.subjectId,
              code: a.subject?.code || "-",
              name: a.subject?.name || "วิชาทั่วไป",
              teacherName: a.subject?.teacher?.name || "ไม่ระบุอาจารย์",
              total: 0,
              presents: 0,
              absents: 0,
              leaves: 0,
              percent: 0,
              isAtRisk: false
            });
          }
          const item = subjectMap.get(a.subjectId);
          item.total += 1;
          if (["PRESENT", "LATE"].includes(a.status)) item.presents += 1;
          else if (a.status === "ABSENT") item.absents += 1;
          else if (["LEAVE_PERSONAL", "LEAVE_SICK"].includes(a.status)) item.leaves += 1;
        });

        // คำนวณเปอร์เซ็นต์และเกณฑ์ เสี่ยง ข.ร. แต่ละวิชา
        const subjectsSummary = Array.from(subjectMap.values()).map((s: any) => {
          const pct = s.total > 0 ? Math.round((s.presents / s.total) * 100) : 0;
          const isAtRisk = s.total > 0 && (s.absents >= 4 || (s.absents / s.total) >= 0.20 || pct < 80);
          return {
            ...s,
            percent: pct,
            isAtRisk
          };
        }).sort((a: any, b: any) => {
          // 1. วิชาที่ เสี่ยง ข.ร. ขึ้นบนสุดเสมอ
          if (a.isAtRisk && !b.isAtRisk) return -1;
          if (!a.isAtRisk && b.isAtRisk) return 1;
          // 2. วิชาที่มีการบันทึกเวลาเรียนแล้ว (total > 0) ขึ้นก่อนวิชาที่ยังไม่เริ่มเช็คชื่อ
          if (a.total > 0 && b.total === 0) return -1;
          if (a.total === 0 && b.total > 0) return 1;
          // 3. เรียงตามเปอร์เซ็นต์เวลาน้อยไปมาก (ขาดเยอะสุดขึ้นก่อน)
          if (a.percent !== b.percent) return a.percent - b.percent;
          // 4. ใครมีจำนวนครั้งที่ขาดมากกว่าขึ้นก่อน
          if (a.absents !== b.absents) return b.absents - a.absents;
          return a.code.localeCompare(b.code);
        });

        const atRiskSubjects = subjectsSummary.filter((s: any) => s.isAtRisk);

        // ภาพรวมทั้งหมด (เข้าแถว + ทุกวิชา)
        const totalAll = atts.length;
        const presentsAll = atts.filter((a: any) => ["PRESENT", "LATE"].includes(a.status)).length;
        const absentsAll = atts.filter((a: any) => a.status === "ABSENT").length;
        const leavesAll = atts.filter((a: any) => ["LEAVE_PERSONAL", "LEAVE_SICK"].includes(a.status)).length;
        const percentAll = totalAll > 0 ? Math.round((presentsAll / totalAll) * 100) : 100;

        return {
          id: st.id,
          name: st.name,
          username: st.username,
          level: st.level || "",
          nickname: st.nickname,
          phone: st.phone,
          parentCode: st.parentCode,
          nationalId: st.nationalId,
          profilePicture: st.profilePicture,
          isTwin: Boolean(st.isTwin),
          twinVerified: Boolean(st.twinVerified),
          twinNote: st.twinNote,
          parents: (st.studentLinks || []).map((l: any) => ({
            id: l.parent?.id,
            name: l.parent?.name || "ผู้ปกครอง",
            phone: l.parent?.phone || null
          })),
          assemblySummary: {
            total: effectiveTotalDays,
            presents: assemblyPresents,
            absents: assemblyAbsents,
            leaves: assemblyLeaves,
            percent: assemblyPercent,
            isAtRisk: isAssemblyAtRisk // เสี่ยง ม.ผ.
          },
          subjectsSummary,
          hasSubjectRisk: atRiskSubjects.length > 0, // เสี่ยง ข.ร.
          atRiskSubjectCount: atRiskSubjects.length,
          atRiskSubjectNames: atRiskSubjects.map((s: any) => s.name),
          attendanceSummary: {
            total: totalAll,
            presents: presentsAll,
            absents: absentsAll,
            leaves: leavesAll,
            percent: percentAll,
            isAtRisk: isAssemblyAtRisk || atRiskSubjects.length > 0
          }
        };
      });

      advisoryData = {
        academicYear: currentAcademicYear,
        assignments: advisorAssignments.map((a: any) => ({
          level: a.level,
          isPrimary: a.primaryAdvisorId === userId,
          coAdvisorName: a.primaryAdvisorId === userId ? a.coAdvisor?.name : a.primaryAdvisor?.name
        })),
        students: processedAdvisedStudents
      };
    }
  } catch (err) {
    console.error("Error fetching advisory data:", err);
    advisoryData = null;
  }

  // เตรียมรายชื่อวิชาสำหรับ Modal สร้างคลาสสอนชดเชย
  const simpleSubjects = subjects.map(s => ({
    id: s.id,
    name: s.name,
    code: s.code,
    level: s.level,
    lateThresholdMin: s.lateThresholdMin
  }));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row dark:bg-gray-900 font-sans">
      <TeacherDashboardClient 
        schedules={schedules} 
        allLevels={allLevels} 
        initialTerm={activeTermName} 
        sessionName={session?.user?.name}
        studentsWithParents={studentsWithParents}
        weeklyStats={weeklyStats}
        subjects={simpleSubjects}
        initialMakeupClasses={makeupClasses}
        initialTrashedMakeupClasses={trashedMakeupClasses}
        advisoryData={advisoryData}
      />
    </div>
  );
}
