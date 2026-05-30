import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { redirect } from "next/navigation";
import prisma from "../../../lib/prisma";
import Link from "next/link";
import StudentEditProfile from "./StudentEditProfile";
import AttendanceHistory from "../../../components/AttendanceHistory";
import StudentGrades from "./StudentGrades";
import TranscriptView from "../../../components/TranscriptView";
import LogoutButton from "../../../components/LogoutButton";
import StudentDashboardClient from "./StudentDashboardClient";

export const dynamic = 'force-dynamic';

export default async function StudentDashboard() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "STUDENT") {
    redirect("/login");
  }

  const userId = (session.user as any).id;

  // ดึงข้อมูลนักเรียนคนนี้
  const myInfo = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      id: true, 
      name: true, 
      username: true, 
      level: true, 
      canEditProfile: true,
      canSubmitGrades: true, // Bug #8: เพิ่ม field นี้
      nickname: true,
      gender: true,
      bloodType: true,
      phone: true,
      email: true,
      isTwoFactorEnabled: true
    }
  });

  if (myInfo && !myInfo.isTwoFactorEnabled) {
    redirect("/dashboard/2fa?forced=true");
  }

  // ดึงประวัติเข้าเรียนของนักเรียนคนนี้
  const attendances = await prisma.attendance.findMany({
    where: { studentId: userId },
    include: { subject: true },
    orderBy: { timestamp: "desc" },
  });

  // ดึงรายชื่อวิชาเพื่อใช้ในตัวกรอง
  const allSubjects = await prisma.subject.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } });
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

  // 2. กรองเฉพาะตารางเรียนของชั้นปีตัวเอง และ ต้องอยู่ในเทอมปัจจุบัน (ถ้ามีข้อมูลเทอมกำหนดไว้)
  const mySchedules = schedules.filter(sc => {
    const subj = sc.subject as any;
    if (!subj) return false;
    const isSameLevel = subj.level === myInfo?.level;
    const isCurrentTerm = currentTerm 
      ? (subj.academicYear === currentTerm.academicYear && subj.term === currentTerm.term)
      : true; // ถ้าไม่ได้เซ็ตเทอมปัจจุบันไว้ ก็โชว์ทั้งหมดไปก่อน
    return isSameLevel && isCurrentTerm;
  });

  // 3. (แก้ปัญหาที่ 2) ดึงรายชื่อวิชาทั้งหมดที่เคยเช็คชื่อไว้ มาใส่ใน Dropdown ตัวกรอง แม้จะหายไปจากตารางเรียนแล้วก็ตาม
  const uniqueSubjectsMap = new Map();
  mySchedules.forEach(sc => {
    if (sc.subject) uniqueSubjectsMap.set(sc.subject.id, sc.subject);
  });
  attendances.forEach(a => {
    if (a.subject && !uniqueSubjectsMap.has(a.subject.id)) {
      uniqueSubjectsMap.set(a.subject.id, a.subject);
    }
  });
  const mySubjects = Array.from(uniqueSubjectsMap.values());

  // Bug #4 fix: include subject เพื่อแสดงข้อมูล term/year ได้ถูกต้อง
  const myGrades = await prisma.grade.findMany({
    where: { studentId: userId },
    include: { subject: true },
    orderBy: [{ subject: { academicYear: 'desc' } }, { subject: { term: 'desc' } }]
  });

  const daysMap: Record<number, string> = {
    1: "วันจันทร์", 2: "วันอังคาร", 3: "วันพุธ", 4: "วันพฤหัสบดี", 5: "วันศุกร์", 6: "วันเสาร์", 7: "วันอาทิตย์"
  };

  const dayColors: Record<number, { bg: string; text: string; itemBg: string }> = {
    1: { bg: "bg-yellow-400 dark:bg-yellow-600", text: "text-yellow-800 dark:text-yellow-100", itemBg: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-800/50" }, // จันทร์
    2: { bg: "bg-pink-400 dark:bg-pink-600", text: "text-pink-900 dark:text-pink-100", itemBg: "bg-pink-50 dark:bg-pink-900/20 border-pink-100 dark:border-pink-800/50" }, // อังคาร
    3: { bg: "bg-green-500 dark:bg-green-700", text: "text-green-900 dark:text-green-100", itemBg: "bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/50" }, // พุธ
    4: { bg: "bg-orange-400 dark:bg-orange-600", text: "text-orange-900 dark:text-orange-100", itemBg: "bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800/50" }, // พฤหัสบดี
    5: { bg: "bg-blue-400 dark:bg-blue-600", text: "text-blue-900 dark:text-blue-100", itemBg: "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50" }, // ศุกร์
    6: { bg: "bg-purple-500 dark:bg-purple-700", text: "text-purple-900 dark:text-purple-100", itemBg: "bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800/50" }, // เสาร์
    7: { bg: "bg-red-500 dark:bg-red-700", text: "text-red-900 dark:text-red-100", itemBg: "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/50" }, // อาทิตย์
  };

  const groupedSchedules = [1, 2, 3, 4, 5, 6, 7]
    .map(day => ({
      day,
      schedules: mySchedules.filter(sc => sc.dayOfWeek === day)
    }))
    .filter(g => g.schedules.length > 0);

  return (
    <StudentDashboardClient 
      session={session}
      myInfo={myInfo}
      attendances={attendances}
      mySubjects={mySubjects}
      mySchedules={mySchedules}
      myGrades={myGrades}
      groupedSchedules={groupedSchedules}
      dayColors={dayColors}
      daysMap={daysMap}
    />
  );
}
