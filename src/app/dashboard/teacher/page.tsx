import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "../../../lib/prisma";
import TeacherDashboardClient from "./TeacherDashboardClient";
import LogoutButton from "../../../components/LogoutButton";

export default async function TeacherDashboard() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "TEACHER") {
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
  const today = new Date();
  const currentTerm = await prisma.termConfig.findFirst({
    where: { startDate: { lte: today }, endDate: { gte: today } }
  });

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col p-8 dark:bg-gray-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">แดชบอร์ดอาจารย์</h1>
          <p className="text-gray-600 dark:text-gray-400">เข้าสู่หน้าระบบสแกนชื่อ, ดูรายงานสรุป และตารางสอนของคุณ</p>
        </div>
        <div className="w-full md:w-auto text-sm text-gray-500 bg-white dark:bg-gray-800 px-5 py-3 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:items-end gap-2">
          <div className="text-left md:text-right">ผู้ใช้งาน: <span className="font-semibold text-indigo-600 dark:text-indigo-400 text-base">{session?.user?.name}</span></div>
          <div className="flex flex-col md:items-end gap-1.5">
            <a href="/dashboard/2fa" className="inline-flex items-center text-blue-500 hover:text-blue-600 dark:text-blue-400 underline text-xs transition">
              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              ความปลอดภัย (2FA)
            </a>
            <LogoutButton />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/dashboard/teacher/scan?type=assembly" className="bg-blue-600 p-6 rounded-xl shadow-sm text-white flex flex-col items-center justify-center cursor-pointer hover:bg-blue-700 transition">
          <h3 className="font-bold text-2xl mb-2">เปิดกล้องสแกนชื่อเข้าแถว</h3>
          <p className="text-blue-100">เช็คชื่อกิจกรรมหน้าเสาธงหรือเข้าแถวตอนเช้าสำหรับทุกชั้นปี</p>
        </Link>
        <Link href="/dashboard/teacher/report" className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-bold text-2xl mb-2 text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-7 h-7 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                ประวัติรายงานรายวิชา
              </h3>
              <p className="text-gray-500 dark:text-gray-400">ดูสถิติการเข้าเรียนของนักเรียนแยกตามรายวิชา</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </div>
          </div>
        </Link>
      </div>

      {/* ตารางสอนแบบสัปดาห์ */}
      <TeacherDashboardClient schedules={schedules} allLevels={allLevels} initialTerm={activeTermName} />
    </div>
  );
}
