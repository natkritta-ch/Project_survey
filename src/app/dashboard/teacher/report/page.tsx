import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { redirect } from "next/navigation";
import prisma from "../../../../lib/prisma";
import Link from "next/link";
import StatusEditor from "./StatusEditor";
import ClientSearchBox from "./ClientSearchBox";
import { CheckCircle2, AlertTriangle, XCircle, Users, BarChart3, ListChecks } from "lucide-react";

import ExportXlsxBtn from "../../../../components/ExportXlsxBtn";
import ClientSelectAutoSubmit from "./ClientSelectAutoSubmit";
import ClientInputAutoSubmit from "./ClientInputAutoSubmit";
import ClientCheckboxAutoSubmit from "./ClientCheckboxAutoSubmit";

export const dynamic = 'force-dynamic';

export default async function TeacherReportPage({ searchParams }: { searchParams: { view?: string, subjectId?: string, level?: string, date?: string, status?: string, failed?: string, search?: string, assemblyStart?: string, assemblyEnd?: string } }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "TEACHER") {
    redirect("/login");
  }

  const teacherId = (session?.user as any)?.id;
  const viewMode = searchParams.view || "summary"; // 'summary' หรือ 'logs'
  const activeSubjectId = searchParams.subjectId || "assembly";
  const activeLevel = searchParams.level || "all";
  const activeDate = searchParams.date || "";
  const activeStatus = searchParams.status || "all";
  const showOnlyFailed = searchParams.failed === "true";
  const activeSearch = searchParams.search || "";

  // ดึงวิชาที่อาจารย์คนนี้สอน (จะว่างเปล่าก็ไม่เป็นไร เป็นส่วนหนึ่งของสิทธิ์การมองเห็น)
  const mySubjects = await prisma.subject.findMany({ where: { teacherId, deletedAt: null }, orderBy: { name: 'asc' } });
  const subjects = mySubjects;

  // หาระดับชั้นทั้งหมดที่มีในระบบเพื่อมาทำ Filter
  const allStudents = await prisma.user.findMany({ where: { role: "STUDENT", deletedAt: null }, select: { level: true } });
  const allLevels = Array.from(new Set(allStudents.map(s => s.level).filter(Boolean))).sort() as string[];

  // --- โลจิกสำหรับการคำนวณหน้า "สรุปผล (Summary Dashboard)" ---
  let summaryData: any[] = [];
  let totalAssemblyDays = 0;
  let subjectDetail: any = null;

  const levelFilter = activeLevel !== "all" ? { level: activeLevel } : {};

  if (isSummaryView(viewMode)) {
    if (activeSubjectId === "assembly") {
      let assemblyDateFilter: any = {};
      if (searchParams.assemblyStart) {
        assemblyDateFilter.gte = new Date(searchParams.assemblyStart);
      }
      if (searchParams.assemblyEnd) {
        const endDate = new Date(searchParams.assemblyEnd);
        endDate.setHours(23, 59, 59, 999);
        assemblyDateFilter.lte = endDate;
      }
      const hasDateFilter = Object.keys(assemblyDateFilter).length > 0;

      // 1. คำนวณวันเข้าแถวทั้งหมด (หาจากจำนวนวันที่เคยมีคนเช็คชื่อเข้าแถวไปแล้ว)
      const rawAssemblyLogs = await prisma.attendance.findMany({
        where: { type: "assembly", subjectId: null, ...(hasDateFilter ? { timestamp: assemblyDateFilter } : {}) },
        select: { timestamp: true }
      });
      // นับว่ามีกี่วัน (ตัดเวลาทิ้ง เอาแต่วันที่)
      const uniqueDates = new Set(rawAssemblyLogs.map(log => new Date(log.timestamp).toISOString().split('T')[0]));
      totalAssemblyDays = uniqueDates.size;

      // 2. ดึงนักเรียนพร้อมประวัติ
      const students = await prisma.user.findMany({
        where: { role: "STUDENT", deletedAt: null, ...levelFilter },
        select: {
          id: true,
          username: true,
          name: true,
          level: true,
          attendances: { 
            where: { type: "assembly", subjectId: null, ...(hasDateFilter ? { timestamp: assemblyDateFilter } : {}) },
            select: { status: true }
          }
        },
        orderBy: { username: 'asc' }
      });

      // 3. ปั้นข้อมูลเข้าตาราง (กฎ ผ. / มผ.)
      summaryData = students.map(st => {
        // Bug #9 fix: นับ LATE ด้วยเหมือน HeadAdminOverview เพื่อให้ตัวเลขสอดคล้องกัน
        const presentCount = st.attendances.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length; 
        const percent = totalAssemblyDays > 0 ? (presentCount / totalAssemblyDays) * 100 : 0;
        
        // เกณฑ์: ผ่านคือ >= 80%
        const isPass = percent >= 80;

        return {
          id: st.id,
          code: st.username,
          name: st.name,
          level: st.level || "-",
          detailStr: `${presentCount} / ${totalAssemblyDays} วัน`,
          percent: Math.round(percent),
          statusConfig: isPass 
            ? { label: "ผ. (ผ่าน)", class: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: <CheckCircle2 className="w-4 h-4 mr-1"/> } 
            : { label: "มผ. (ไม่ผ่าน)", class: "bg-rose-100 text-rose-800 border-rose-200 font-bold shadow-sm", icon: <XCircle className="w-4 h-4 mr-1"/> }
        }
      });
    } else {
      // โหมดวิชา (Subject)
      subjectDetail = subjects.find(s => s.id === activeSubjectId);
      
      // ถ้าอาจารย์ไม่ได้เลือกชั้นปี (all) แต่ตัววิชามีระบุชั้นปีไว้ ให้ฟิลเตอร์ตามวิชาอัตโนมัติ
      let scopedLevelFilter = levelFilter;
      if (activeLevel === "all" && subjectDetail?.level && subjectDetail.level !== "-") {
        scopedLevelFilter = { level: subjectDetail.level };
      }

      const students = await prisma.user.findMany({
        where: { role: "STUDENT", deletedAt: null, ...scopedLevelFilter },
        select: {
          id: true,
          username: true,
          name: true,
          level: true,
          attendances: { 
            where: { subjectId: activeSubjectId },
            select: { status: true }
          }
        },
        orderBy: { username: 'asc' }
      });

      // 3. ปั้นข้อมูลเข้าตาราง (กฎ ขาดครบ 4 ครั้ง = ขร.)
      summaryData = students.map(st => {
        const atts = st.attendances;
        const absents = atts.filter(a => a.status === "ABSENT").length;
        const presents = atts.filter(a => a.status === "PRESENT").length;
        const lates = atts.filter(a => a.status === "LATE").length;
        const leaves = atts.filter(a => a.status === "LEAVE_PERSONAL" || a.status === "LEAVE_SICK").length;
        
        let statusConfig = { label: "ปกติ", class: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: <CheckCircle2 className="w-4 h-4 mr-1"/> };
        
        if (absents >= 4) {
          statusConfig = { label: "ขร. (หมดสิทธิ์สอบ)", class: "bg-rose-100 text-rose-800 border-rose-300 font-bold shadow-md", icon: <XCircle className="w-4 h-4 mr-1"/> };
        } else if (absents === 3) {
          statusConfig = { label: "เตือน (ขาด 3 ครั้ง)", class: "bg-amber-100 text-amber-800 border-amber-300 font-bold", icon: <AlertTriangle className="w-4 h-4 mr-1"/> };
        } else if (absents > 0) {
          statusConfig = { label: `ขาด ${absents} ครั้ง`, class: "bg-orange-50 text-orange-700 border-orange-200", icon: null as any };
        }

        return {
          id: st.id,
          code: st.username,
          name: st.name,
          level: st.level || "-",
          presents, lates, leaves, absents,
          statusConfig
        }
      });
    }
  }

  // --- โลจิกสำหรับการดึงประวัติเพื่อ "แก้ไข (Daily Logs)" ---
  let logs: any[] = [];
  if (!isSummaryView(viewMode)) {
     const logsFilter = activeSubjectId === "assembly" ? { subjectId: null, type: "assembly" } : { subjectId: activeSubjectId };
     const statusFilter = activeStatus !== "all" ? { status: activeStatus } : {};
     
     let dateFilter: any = {};
     if (activeDate) {
       const startOfDay = new Date(activeDate);
       const endOfDay = new Date(activeDate);
       endOfDay.setDate(endOfDay.getDate() + 1);
       dateFilter = { timestamp: { gte: startOfDay, lt: endOfDay } };
     }

     let studentFilter: any = { deletedAt: null };
     if (activeLevel !== "all") {
       studentFilter.level = activeLevel;
     }
     if (activeSearch) {
       studentFilter.OR = [
         { name: { contains: activeSearch } },
         { username: { contains: activeSearch } }
       ];
     }
     const finalStudentFilter = Object.keys(studentFilter).length > 0 ? { student: studentFilter } : {};

     logs = await prisma.attendance.findMany({
        where: { ...logsFilter, ...finalStudentFilter, ...statusFilter, ...dateFilter },
        include: { student: true, subject: true },
        orderBy: { timestamp: 'desc' },
        take: 300 // limit to recent logs to prevent huge payloads
     });
  }

  function isSummaryView(v: string) { return v === "summary"; }

  // Stats for cards
  const totalStudents = summaryData.length;
  const criticalStudents = activeSubjectId === "assembly" 
    ? summaryData.filter(s => s.percent < 80).length 
    : summaryData.filter(s => s.absents >= 4).length;
  const warningStudents = activeSubjectId !== "assembly" ? summaryData.filter(s => s.absents === 3).length : 0;

  // Filter for UI viewing
  let finalSummaryData = summaryData;
  if (showOnlyFailed) {
    if (activeSubjectId === "assembly") {
      finalSummaryData = summaryData.filter(s => s.percent < 80);
    } else {
      finalSummaryData = summaryData.filter(s => s.absents >= 4);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-4 md:p-8 dark:bg-slate-900 font-sans">
      
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard/teacher" className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition mb-4">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          กลับหน้าหลักอาจารย์
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">รายงานและสรุปผล (Reporting Dashboard)</h1>
            <p className="text-slate-600 dark:text-slate-400">ระบบคัดกรองอัตโนมัติ ผ./มผ. และแจ้งเตือนนักเรียนติด ขร. ตามชั้นปีและรายวิชา</p>
          </div>
          
          {/* View Switcher Tabs */}
          <div className="flex bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-lg p-1">
            <Link href={`?view=summary&subjectId=${activeSubjectId}&level=${activeLevel}`} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center transition ${isSummaryView(viewMode) ? 'bg-indigo-50 text-indigo-700 shadow-sm dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'}`}>
              <BarChart3 className="w-4 h-4 mr-2" /> สรุปประเมินผล
            </Link>
            <Link href={`?view=logs&subjectId=${activeSubjectId}&level=${activeLevel}`} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center transition ${!isSummaryView(viewMode) ? 'bg-indigo-50 text-indigo-700 shadow-sm dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'}`}>
              <ListChecks className="w-4 h-4 mr-2" /> ดู/แก้ไขรายวัน
            </Link>
          </div>
        </div>
      </div>

      {/* Control Panel (Glassmorphism Bento block) */}
      <div className="bg-white/80 backdrop-blur-md dark:bg-slate-800/80 p-5 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 mb-8 border-l-4 border-l-indigo-500">
        <form method="GET" action="/dashboard/teacher/report" className="flex flex-wrap gap-5 items-end">
          <input type="hidden" name="view" value={viewMode} />
          
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-1 block">วิชา / กิจกรรม</label>
            <ClientSelectAutoSubmit name="subjectId" defaultValue={activeSubjectId} className="block w-full rounded-xl border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-2.5 border bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white transition">
              <option value="assembly" className="font-bold text-indigo-700">📣 เช็คแถวหน้าเสาธง (Assembly)</option>
              {(() => {
                const levels = Array.from(new Set(subjects.map(s => s.level || "ไม่ระบุชั้นปี"))).sort();
                return levels.map(lvl => (
                  <optgroup key={lvl} label={`📌 ระดับชั้น: ${lvl}`} className="bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 font-bold">
                    {subjects.filter(s => (s.level || "ไม่ระบุชั้นปี") === lvl).map(s => (
                      <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium">
                        [{s.code || "-"}] {s.name}
                      </option>
                    ))}
                  </optgroup>
                ));
              })()}
            </ClientSelectAutoSubmit>
          </div>

          {activeSubjectId === "assembly" && (
            <div className="w-48">
              <label className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-1 block">ตัวกรองชั้นปี</label>
              <ClientSelectAutoSubmit name="level" defaultValue={activeLevel} className="block w-full rounded-xl border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-2.5 border bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white transition">
                <option value="all">-- ทุกชั้นปี --</option>
                {allLevels.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
              </ClientSelectAutoSubmit>
            </div>
          )}

          {activeSubjectId === "assembly" && isSummaryView(viewMode) && (
            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-1 block">ช่วงวันที่ตัดรอบ (Assembly)</label>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <ClientInputAutoSubmit type="date" name="assemblyStart" defaultValue={searchParams.assemblyStart || ""} className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-[13px] outline-none w-[130px] min-w-0" />
                <span className="text-xs text-slate-400 font-bold">ถึง</span>
                <ClientInputAutoSubmit type="date" name="assemblyEnd" defaultValue={searchParams.assemblyEnd || ""} className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-[13px] outline-none w-[130px] min-w-0" />
              </div>
            </div>
          )}

          {!isSummaryView(viewMode) && (
            <>
              <div className="w-[140px]">
                <label className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-1 block">สถานะ</label>
                <ClientSelectAutoSubmit name="status" defaultValue={activeStatus} className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-[13px] px-3 py-2 border bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white transition">
                  <option value="all">-- ทุกสถานะ --</option>
                  <option value="PRESENT">🟢 มาเรียน</option>
                  <option value="LATE">🟠 มาสาย</option>
                  <option value="ABSENT">🔴 ขาดเรียน</option>
                  <option value="LEAVE_PERSONAL">🔵 ลากิจ</option>
                  <option value="LEAVE_SICK">🟣 ลาป่วย</option>
                </ClientSelectAutoSubmit>
              </div>
              <div className="w-[150px]">
                <label className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-1 block">เลือกวันที่</label>
                <ClientInputAutoSubmit type="date" name="date" defaultValue={activeDate} className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-[13px] px-2 py-2 border bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white transition min-w-0" />
              </div>
            </>
          )}

          <div className="flex gap-2">
            {/* 
            <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition shadow-md hover:shadow-lg flex items-center">
              ยืนยัน
            </button> 
            */}
            
            {isSummaryView(viewMode) && (
               <label className="flex items-center px-4 py-2.5 bg-white text-rose-600 border border-slate-200 rounded-xl cursor-pointer hover:bg-rose-50 transition whitespace-nowrap shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700">
                 <ClientCheckboxAutoSubmit name="failed" value="true" defaultChecked={showOnlyFailed} className="mr-2 rounded text-rose-600 focus:ring-rose-500 w-4 h-4" />
                 <span className="text-sm font-bold">เปิดดูเฉพาะคนติด {activeSubjectId === "assembly" ? "มผ." : "ขร."}</span>
               </label>
            )}

            {!isSummaryView(viewMode) && (activeDate || activeStatus !== "all") && (
              <a href={`/dashboard/teacher/report?view=logs&subjectId=${activeSubjectId}&level=${activeLevel}`} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition flex items-center border border-slate-300 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 text-sm">
                ล้างวัน/สถานะ
              </a>
            )}
          </div>
        </form>
      </div>

      {isSummaryView(viewMode) ? (
        <>
          {/* KPI Cards (Bento) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mr-4 dark:bg-indigo-900/40 dark:text-indigo-400"><Users className="w-6 h-6" /></div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">นักเรียนทั้งหมด (ที่กรอง)</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{totalStudents} <span className="text-sm font-normal text-slate-500">คน</span></h3>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mr-4 dark:bg-rose-900/40 dark:text-rose-400"><XCircle className="w-6 h-6" /></div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">กลุ่มปัญหา ({activeSubjectId === "assembly" ? "ติด มผ." : "มีสิทธิ์ติด ขร."})</p>
                <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400">{criticalStudents} <span className="text-sm font-normal text-slate-500">คน</span></h3>
              </div>
            </div>
            {activeSubjectId !== "assembly" && (
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mr-4 dark:bg-amber-900/40 dark:text-amber-400"><AlertTriangle className="w-6 h-6" /></div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">กลุ่มเสี่ยง (เตือนขาด 3 ครั้ง)</p>
                  <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400">{warningStudents} <span className="text-sm font-normal text-slate-500">คน</span></h3>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center flex-wrap gap-4">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                {activeSubjectId === "assembly" 
                  ? "ตารางผลประเมินการเข้าแถว (เกณฑ์ผ่าน 80%)" 
                  : `ตารางสรุปผลการขาดเรียน วิชา [${subjectDetail?.code || '-'}] ${subjectDetail?.name || ''} (ระดับชั้น: ${subjectDetail?.level || '-'}) (เกณฑ์ ขร. คือขาด 4 ครั้ง)`}
              </h3>
              
              <ExportXlsxBtn 
                filename={activeSubjectId === "assembly" ? "assembly_report.xlsx" : `class_report_${subjectDetail?.code || 'subject'}.xlsx`}
                headers={activeSubjectId === "assembly" 
                  ? ["รหัสนักเรียน", "ชื่อ-นามสกุล", "ชั้นปี", "สถิติการมา (วัน)", "เปอร์เซ็นต์", "สถานะ"]
                  : ["รหัสนักเรียน", "ชื่อ-นามสกุล", "ชั้นปี", "มาเรียน", "สาย", "ลากิจ/ป่วย", "ขาด", "สถานะ"]
                }
                data={finalSummaryData.map((st: any) => 
                  activeSubjectId === "assembly"
                    ? [st.code, st.name, st.level, `${st.presents} / ${totalAssemblyDays}`, `${st.percent}%`, st.statusConfig.label]
                    : [st.code, st.name, st.level, st.presents, st.lates, st.leaves, st.absents, st.statusConfig.label]
                )}
                levelFilter={activeLevel}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold text-slate-500 tracking-wider">รหัส / ชื่อ-สกุล</th>
                    <th className="px-6 py-4 text-center font-bold text-slate-500 tracking-wider">ชั้นปี</th>
                    {activeSubjectId === "assembly" ? (
                      <>
                        <th className="px-6 py-4 text-center font-bold text-slate-500 tracking-wider">สถิติการมา</th>
                        <th className="px-6 py-4 text-center font-bold text-slate-500 tracking-wider">เปอร์เซ็นต์</th>
                      </>
                    ) : (
                      <>
                        <th className="px-3 py-4 text-center font-bold text-emerald-600 tracking-wider">มาเรียน</th>
                        <th className="px-3 py-4 text-center font-bold text-orange-600 tracking-wider">สาย</th>
                        <th className="px-3 py-4 text-center font-bold text-blue-600 tracking-wider">ลากิจ/ป่วย</th>
                        <th className="px-3 py-4 text-center font-bold text-rose-600 tracking-wider bg-rose-50 dark:bg-rose-900/10">ขาด (ครั้ง)</th>
                      </>
                    )}
                    <th className="px-6 py-4 text-center font-bold text-slate-500 tracking-wider w-40">ประเมินผล</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700/50">
                  {finalSummaryData.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-12 text-slate-500">ไม่พบรายชื่อในระบบที่ตรงกับตัวกรอง</td></tr>
                  ) : (
                    finalSummaryData.map((st: any) => (
                      <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-xs text-slate-500">{st.code}</div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{st.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-slate-600 dark:text-slate-400">{st.level}</td>
                        
                        {activeSubjectId === "assembly" ? (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-center font-medium">{st.detailStr}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${st.percent >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                {st.percent}%
                              </span>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-4 text-center font-medium text-emerald-600">{st.presents}</td>
                            <td className="px-3 py-4 text-center font-medium text-orange-600">{st.lates}</td>
                            <td className="px-3 py-4 text-center font-medium text-blue-600">{st.leaves}</td>
                            <td className="px-3 py-4 text-center font-bold text-rose-600 bg-rose-50/50 dark:bg-rose-900/10 text-lg">{st.absents}</td>
                          </>
                        )}
                        
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg border ${st.statusConfig.class} w-full text-sm`}>
                            {st.statusConfig.icon} {st.statusConfig.label}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Logs mode (Edit Daily Status) */
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-3 sm:p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row gap-4 justify-between items-center text-sm">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">ประวัติรายวัน (คลิกเพื่อแก้ไขสถานะ)</h3>
              <span className="text-xs text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded hidden sm:inline-block">แสดงล่าสุด {logs.length} รายการ</span>
            </div>
            
            {/* Search Box - Instant Client Filter */}
            <ClientSearchBox />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-6 py-3 text-left font-bold text-slate-500 tracking-wider">วันเวลา</th>
                  <th className="px-6 py-3 text-left font-bold text-slate-500 tracking-wider">นักเรียน</th>
                  <th className="px-6 py-3 text-left font-bold text-slate-500 tracking-wider">ชั้นปี/วิชา</th>
                  <th className="px-6 py-3 text-center font-bold text-slate-500 tracking-wider relative">แก้ไขสถานะ (Auto Save)</th>
                </tr>
              </thead>
              <tbody id="logs-tbody" className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700/50">
                {logs.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">ไม่มีประวัติการเช็คชื่อสำหรับตัวกรองนี้</td></tr>
                ) : (
                  logs.map((log: any) => (
                    <tr key={log.id} className="log-row hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-700 dark:text-slate-300">
                        {new Date(log.timestamp).toLocaleString("th-TH")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{log.student?.name}</div>
                        <div className="text-xs text-slate-500">{log.student?.username}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">
                          [{log.student?.level || log.subject?.level || "-"}] {log.subject ? log.subject.name : 'เข้าแถวรวม'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {/* Re-use StatusEditor */}
                        <StatusEditor id={log.id} initialStatus={log.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
