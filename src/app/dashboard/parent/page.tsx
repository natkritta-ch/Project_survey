import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { redirect } from "next/navigation";
import prisma from "../../../lib/prisma";
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

  const childId = parentData?.studentId;
  let childData: any = null;
  let attendances: any[] = [];
  let childGrades: any[] = [];
  let childSubjects: any[] = [];
  let childSchedules: any[] = [];

  if (childId) {
    childData = await prisma.user.findUnique({ where: { id: childId } });
    attendances = await prisma.attendance.findMany({
      where: { studentId: childId },
      include: { subject: true },
      orderBy: { timestamp: "desc" },
    });
    childGrades = await prisma.grade.findMany({
      where: { studentId: childId },
      include: { subject: true }
    });
    const schedules = await prisma.schedule.findMany({
      where: { deletedAt: null },
      include: { subject: true },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    // 1. หาเทอมปัจจุบันอัตโนมัติจากวันที่ปัจจุบัน
    const today = new Date();
    const currentTerm = await prisma.termConfig.findFirst({
      where: { startDate: { lte: today }, endDate: { gte: today } }
    });

    // 2. กรองเฉพาะตารางเรียนของชั้นปีเดียวกับลูก และ ต้องอยู่ในเทอมปัจจุบัน (ถ้ามีข้อมูลเทอมกำหนดไว้)
    childSchedules = schedules.filter((sc: any) => {
      const subj = sc.subject;
      if (!subj) return false;
      const isSameLevel = subj.level === childData?.level;
      const isCurrentTerm = currentTerm 
        ? (subj.academicYear === currentTerm.academicYear && subj.term === currentTerm.term)
        : true; 
      return isSameLevel && isCurrentTerm;
    });
        
      const uniqueSubjectsMap = new Map();
      childSchedules.forEach((sc: any) => {
        if (sc.subject) uniqueSubjectsMap.set(sc.subject.id, sc.subject);
      });
      attendances.forEach(a => {
        if (a.subject && !uniqueSubjectsMap.has(a.subject.id)) {
          uniqueSubjectsMap.set(a.subject.id, a.subject);
        }
      });
      childSubjects = Array.from(uniqueSubjectsMap.values());
    }

  return (
    <ParentDashboardClient 
      session={session}
      parentData={parentData}
      childId={childId}
      childData={childData}
      attendances={attendances}
      childSubjects={childSubjects}
      childSchedules={childSchedules}
      childGrades={childGrades}
    />
  );
}
