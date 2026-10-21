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
              timestamp: true
            }
          }
        },
        orderBy: [{ level: 'asc' }, { username: 'asc' }]
      });

      const processedAdvisedStudents = rawAdvisedStudents.map((st: any) => {
        const atts = st.attendances || [];
        const total = atts.length;
        const presents = atts.filter((a: any) => ["PRESENT", "LATE"].includes(a.status)).length;
        const absents = atts.filter((a: any) => a.status === "ABSENT").length;
        const leaves = atts.filter((a: any) => ["LEAVE_PERSONAL", "LEAVE_SICK"].includes(a.status)).length;
        const percent = total > 0 ? Math.round((presents / total) * 100) : 100;
        const isAtRisk = total > 0 ? (absents >= 4 || (absents / total) >= 0.20) : false;

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
          attendanceSummary: {
            total,
            presents,
            absents,
            leaves,
            percent,
            isAtRisk
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
