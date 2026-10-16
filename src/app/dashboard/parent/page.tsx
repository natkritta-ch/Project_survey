import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { redirect } from "next/navigation";
import prisma from "../../../lib/prisma";
import { getCurrentTermConfig } from "../../../lib/term";
import AttendanceHistory from "../../../components/AttendanceHistory";
import TranscriptView from "../../../components/TranscriptView";
import LogoutButton from "../../../components/LogoutButton";
import ParentDashboardClient from "./ParentDashboardClient";

export const dynamic = 'force-dynamic';

export default async function ParentDashboard() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "PARENT") {
    redirect("/login");
  }

  const userId = (session.user as any).id;

  const parentData = await prisma.user.findUnique({
    where: { id: userId }
  });

  const parentLinks = await prisma.parentStudentLink.findMany({
    where: { parentId: userId },
    include: { student: true }
  });

  const childrenData = parentLinks.map(link => ({
    ...link.student,
    linkStatus: link.status
  }));

  const approvedChildren = childrenData.filter((c: any) => c.linkStatus === "APPROVED");
  
  // เตรียมเก็บข้อมูลของลูกทุกคนที่ผ่านการอนุมัติ
  let allAttendances: any = {};
  let allGrades: any = {};
  let allSubjects: any = {};
  let allSchedules: any = {};

  if (approvedChildren.length > 0) {
    const currentTerm = await getCurrentTermConfig();

    const schedules = await prisma.schedule.findMany({
      where: { deletedAt: null },
      include: { subject: true },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    for (const child of approvedChildren) {
      const childId = child.id;
      allAttendances[childId] = await prisma.attendance.findMany({
        where: { studentId: childId },
        include: { subject: true },
        orderBy: { timestamp: "desc" },
      });
      allGrades[childId] = await prisma.grade.findMany({
        where: { studentId: childId },
        include: { subject: true }
      });

      const childSchedules = schedules.filter((sc: any) => {
        const subj = sc.subject;
        if (!subj) return false;
        const isSameLevel = subj.level === child.level;
        const isCurrentTerm = currentTerm 
          ? (subj.academicYear === currentTerm.academicYear && subj.term === currentTerm.term)
          : true; 
        return isSameLevel && isCurrentTerm;
      });

      const uniqueSubjectsMap = new Map();
      childSchedules.forEach((sc: any) => {
        if (sc.subject) uniqueSubjectsMap.set(sc.subject.id, sc.subject);
      });
      allAttendances[childId].forEach((a: any) => {
        if (a.subject && !uniqueSubjectsMap.has(a.subject.id)) {
          uniqueSubjectsMap.set(a.subject.id, a.subject);
        }
      });
      allSubjects[childId] = Array.from(uniqueSubjectsMap.values());
      allSchedules[childId] = childSchedules;
    }
  }

  return (
    <ParentDashboardClient 
      session={session}
      parentData={parentData}
      childrenData={childrenData}
      allAttendances={allAttendances}
      allSubjects={allSubjects}
      allSchedules={allSchedules}
      allGrades={allGrades}
    />
  );
}
