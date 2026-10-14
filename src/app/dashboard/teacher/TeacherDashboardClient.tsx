"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Filter, Camera, Clock, Calendar, Users, MapPin, Home, LogOut, Phone, ShieldCheck, Menu, X, BarChart, Settings, CalendarPlus, Trash2, Sparkles, BookOpen, ChevronDown } from "lucide-react";
import { signOut } from "next-auth/react";
import { showSuccess, showError, showWarning, showInfo, showToast, showConfirm, showPromptNumber } from "@/lib/alerts";

export default function TeacherDashboardClient({ 
  schedules, 
  allLevels, 
  initialTerm, 
  sessionName, 
  studentsWithParents, 
  weeklyStats,
  subjects = [],
  initialMakeupClasses = []
}: any) {
  const [activeTab, setActiveTab] = useState("overview");
  const [filterLevel, setFilterLevel] = useState("ทั้งหมด");
  const [filterTerm, setFilterTerm] = useState(initialTerm || "ทั้งหมด");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // State สำหรับคลาสสอนชดเชย
  const [makeupClasses, setMakeupClasses] = useState<any[]>(initialMakeupClasses || []);
  const [isMakeupModalOpen, setIsMakeupModalOpen] = useState(false);
  const [makeupSubjectId, setMakeupSubjectId] = useState(subjects[0]?.id || "");
  const [isMakeupSubjectDropdownOpen, setIsMakeupSubjectDropdownOpen] = useState(false);
  const [makeupSubjectSearch, setMakeupSubjectSearch] = useState("");
  const [makeupDate, setMakeupDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [makeupStartTime, setMakeupStartTime] = useState("");
  const [makeupEndTime, setMakeupEndTime] = useState("");
  const [makeupRemark, setMakeupRemark] = useState("");
  const [isSubmittingMakeup, setIsSubmittingMakeup] = useState(false);

  const openMakeupModal = (subId?: string) => {
    setMakeupSubjectId(subId || subjects[0]?.id || "");
    setMakeupDate(new Date().toISOString().split("T")[0]);
    const now = new Date();
    const startH = String(now.getHours()).padStart(2, '0');
    const startM = String(now.getMinutes()).padStart(2, '0');
    setMakeupStartTime(`${startH}:${startM}`);
    const endH = String((now.getHours() + 2) % 24).padStart(2, '0');
    setMakeupEndTime(`${endH}:${startM}`);
    setMakeupRemark("สอนชดเชย");
    setIsMakeupModalOpen(true);
  };

  const handleCreateMakeup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!makeupSubjectId || !makeupDate || !makeupStartTime || !makeupEndTime) {
      return showWarning("กรุณากรอกข้อมูลให้ครบถ้วน", "โปรดระบุวิชา วันที่ และเวลาสอนชดเชย");
    }

    setIsSubmittingMakeup(true);
    try {
      const res = await fetch('/api/makeup-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: makeupSubjectId,
          date: makeupDate,
          startTime: makeupStartTime,
          endTime: makeupEndTime,
          remark: makeupRemark
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess("สร้างคลาสสอนชดเชยสำเร็จ!", "เพิ่มคลาสลงในรายการสอนชดเชยเรียบร้อยแล้ว");
        setMakeupClasses(prev => [data.makeupClass, ...prev]);
        setIsMakeupModalOpen(false);
      } else {
        showError("เกิดข้อผิดพลาด", data.message || "ไม่สามารถสร้างคลาสชดเชยได้");
      }
    } catch (err: any) {
      showError("เกิดข้อผิดพลาดในการเชื่อมต่อ", err.message);
    } finally {
      setIsSubmittingMakeup(false);
    }
  };

  const handleDeleteMakeup = async (id: string) => {
    const ok = await showConfirm({
      title: "ยืนยันการลบคลาสชดเชย?",
      text: "คุณต้องการลบคลาสสอนชดเชยนี้ใช่หรือไม่?",
      confirmText: "ลบคลาส",
      cancelText: "ยกเลิก",
      isDanger: true,
    });
    if (!ok) return;
    try {
      const res = await fetch('/api/makeup-classes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setMakeupClasses(prev => prev.filter(m => m.id !== id));
        showToast("ลบคลาสสอนชดเชยเรียบร้อยแล้ว", "success");
      } else {
        const data = await res.json();
        showError("เกิดข้อผิดพลาด", data.message);
      }
    } catch (err: any) {
      showError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  };

  const handleEditThreshold = async (subjectId: string, currentVal: number) => {
    const num = await showPromptNumber({
      title: "ตั้งค่าเวลาอนุโลมสาย",
      text: "ระบุจำนวนนาทีหลังจากเริ่มคาบที่อนุโลมให้นักเรียนเช็คชื่อแล้วเป็นสถานะ 'สาย' (นาที)",
      defaultValue: currentVal || 15,
      min: 0,
      max: 180,
    });
    if (num === null) return;
    try {
      const res = await fetch("/api/subjects/late-threshold", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, lateThresholdMin: num })
      });
      if (res.ok) {
        showSuccess("บันทึกการตั้งค่าสำเร็จ!", `ตั้งค่าเวลาสายเป็น ${num} นาที เรียบร้อยแล้ว`);
        setTimeout(() => window.location.reload(), 1200);
      } else {
        const data = await res.json();
        showError("เกิดข้อผิดพลาด", data.message);
      }
    } catch (e) {
      showError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  };

  const today = new Date();
  const currentDayOfWeek = today.getDay() === 0 ? 7 : today.getDay(); // 1=Mon, ..., 7=Sun
  
  const todaysSchedules = schedules.filter((sc: any) => sc.dayOfWeek === currentDayOfWeek).sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));

  const allTerms = Array.from(new Set(schedules.map((sc: any) => sc.subject?.term || "-"))).sort();

  const displaySchedules = schedules.filter((sc: any) => {
    if (filterLevel !== "ทั้งหมด" && (sc.subject?.level || "ไม่ระบุ") !== filterLevel) return false;
    if (filterTerm !== "ทั้งหมด" && (sc.subject?.term || "-") !== filterTerm) return false;
    return true;
  });

  const daysMap: Record<number, string> = {
    1: "วันจันทร์", 2: "วันอังคาร", 3: "วันพุธ", 4: "วันพฤหัสบดี", 5: "วันศุกร์", 6: "วันเสาร์", 7: "วันอาทิตย์"
  };

  const tabs = [
    { id: "overview", label: "ภาพรวมวันนี้", icon: <Home className="w-5 h-5" /> },
    { id: "schedule", label: "ตารางสอนทั้งหมด", icon: <Calendar className="w-5 h-5" /> },
    { id: "students", label: "รายชื่อนักเรียนและผู้ปกครอง", icon: <Users className="w-5 h-5" /> }
  ];

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-indigo-600 text-white p-4 flex justify-between items-center sticky top-0 z-40 shadow-md">
        <h1 className="font-bold text-lg flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" /> ระบบอาจารย์
        </h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-1 hover:bg-indigo-500 rounded">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed md:static inset-0 z-30 bg-indigo-900 text-white w-64 flex-shrink-0 flex flex-col transition-transform duration-300
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 hidden md:block">
          <h1 className="font-bold text-xl flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-400" /> ระบบอาจารย์
          </h1>
        </div>
        
        <div className="p-6 border-b border-indigo-800/50 mt-16 md:mt-0 bg-indigo-950/30">
          <p className="text-xs text-indigo-300 uppercase tracking-wider mb-1 font-semibold">ผู้ใช้งาน</p>
          <div className="font-medium truncate">{sessionName}</div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1.5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm text-left
                ${activeTab === tab.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                  : 'text-indigo-200 hover:bg-indigo-800/50 hover:text-white'
                }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
          
          <div className="my-4 border-t border-indigo-800/50" />
          
          <Link href="/dashboard/teacher/report" className="flex items-center gap-3 px-4 py-3 rounded-xl text-indigo-200 hover:bg-indigo-800/50 hover:text-white transition-all font-medium text-sm">
            <BarChart className="w-5 h-5" /> รายงานการเข้าเรียน
          </Link>
        </nav>

        <div className="p-4 border-t border-indigo-800/50">
          <button 
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-300 hover:bg-red-900/30 hover:text-red-200 transition-all font-medium text-sm"
          >
            <LogOut className="w-5 h-5" /> ออกจากระบบ
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 h-screen overflow-y-auto bg-gray-50 dark:bg-gray-900 md:p-8 p-4">
        
        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">ภาพรวมวันนี้ ({daysMap[currentDayOfWeek]})</h2>
                <p className="text-sm text-gray-500">จัดการการเรียนการสอนและเช็คชื่อนักเรียน</p>
              </div>
              <button
                onClick={() => openMakeupModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-bold text-sm shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02] shrink-0"
              >
                <CalendarPlus className="w-5 h-5" />
                สร้างคลาสสอนชดเชย
              </button>
            </div>
            
            {/* สรุปสถิติสัปดาห์นี้ */}
            {weeklyStats && (
              <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">สรุปการสอนสัปดาห์นี้</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col">
                    <span className="text-gray-500 dark:text-gray-400 text-xs font-bold mb-1">บันทึกทั้งหมด</span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{weeklyStats.totalRecords} <span className="text-sm font-normal text-gray-500">ครั้ง</span></span>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 shadow-sm flex flex-col">
                    <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-1">มาเรียน / สาย</span>
                    <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{weeklyStats.presents} <span className="text-sm font-normal opacity-70">ครั้ง</span></span>
                  </div>
                  <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-2xl border border-rose-100 dark:border-rose-800/50 shadow-sm flex flex-col">
                    <span className="text-rose-600 dark:text-rose-400 text-xs font-bold mb-1">ขาดเรียน</span>
                    <span className="text-2xl font-bold text-rose-700 dark:text-rose-300">{weeklyStats.absents} <span className="text-sm font-normal opacity-70">ครั้ง</span></span>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/50 shadow-sm flex flex-col">
                    <span className="text-blue-600 dark:text-blue-400 text-xs font-bold mb-1">ลาป่วย / ลากิจ</span>
                    <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">{weeklyStats.leaves} <span className="text-sm font-normal opacity-70">ครั้ง</span></span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Link href="/dashboard/teacher/scan?type=assembly" className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-md text-white flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1">
                <div className="bg-white/20 p-3 rounded-full mb-3">
                  <Camera className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-xl mb-1">สแกนชื่อเข้าแถว (Assembly)</h3>
                <p className="text-blue-100 text-sm text-center">เช็คชื่อกิจกรรมหน้าเสาธงตอนเช้า</p>
              </Link>
              
              <Link href="/dashboard/teacher/report" className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all flex items-center group">
                <div className="flex-1">
                  <h3 className="font-bold text-xl mb-1 text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">ประวัติรายงานและการขาดเรียน</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">ดูสถิติ ติดตามนักเรียนกลุ่มเสี่ยง (ขร./มผ.)</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <BarChart className="w-6 h-6" />
                </div>
              </Link>
            </div>

            {/* แสดงคลาสสอนชดเชยของวันนี้ ถ้ามี */}
            {(() => {
              const todayStr = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Bangkok',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
              }).format(today);

              const todaysMakeups = makeupClasses.filter((mc: any) => {
                const mcDateStr = new Date(mc.date).toISOString().split('T')[0];
                return mcDateStr === todayStr;
              });

              if (todaysMakeups.length === 0) return null;

              return (
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-amber-900 dark:text-amber-200 mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    คลาสสอนชดเชยวันนี้ (Make-up Classes)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {todaysMakeups.map((mc: any) => (
                      <div key={mc.id} className="bg-amber-50/80 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-800/80 p-5 rounded-2xl shadow-sm flex flex-col relative">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded font-bold">
                            {mc.subject?.code}
                          </span>
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-200/70 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">
                            สอนชดเชย
                          </span>
                        </div>
                        <div className="font-bold text-base text-gray-900 dark:text-white mb-2">
                          {mc.subject?.name}
                        </div>
                        <div className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 mb-2">
                          <Clock className="w-3.5 h-3.5" />
                          {mc.startTime} - {mc.endTime} น.
                        </div>
                        {mc.remark && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 italic">
                            หมายเหตุ: {mc.remark}
                          </p>
                        )}
                        <div className="mt-auto pt-3 border-t border-amber-200 dark:border-amber-800/50 flex gap-2">
                          <Link 
                            href={`/dashboard/teacher/scan?type=class&subjectId=${mc.subjectId}`}
                            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1 shadow-sm transition"
                          >
                            <Camera className="w-4 h-4" />
                            สแกนเช็คชื่อ
                          </Link>
                          <button
                            onClick={() => handleDeleteMakeup(mc.id)}
                            className="p-2 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-xl transition"
                            title="ลบคลาสนี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">ตารางสอนของคุณวันนี้</h3>
            {todaysSchedules.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 text-center text-gray-500 dark:text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>วันนี้ไม่มีคาบสอน พักผ่อนให้เต็มที่ครับ!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {todaysSchedules.map((sc: any) => (
                  <div key={sc.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col relative overflow-hidden">
                    <div className="text-[10px] font-mono text-gray-500 dark:text-gray-400 mb-1 bg-gray-100 dark:bg-gray-800 w-fit px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                      {sc.subject?.code}
                    </div>
                    <div className="font-bold text-base text-gray-900 dark:text-white mb-3">
                      {sc.subject?.name}
                    </div>
                    
                    <div className="flex flex-col gap-2 mt-auto">
                      <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 w-fit px-2 py-1 rounded-md">
                        <Clock className="w-3.5 h-3.5" />
                        {sc.startTime} - {sc.endTime}
                      </div>
                      
                      <div className="flex gap-2">
                        <span className="text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700">
                          {sc.subject?.level || "-"} {sc.subject?.group ? `(${sc.subject.group})` : ""}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                          <MapPin className="w-3 h-3" />
                          {sc.subject?.room || "ไม่ระบุห้อง"}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => handleEditThreshold(sc.subject?.id, sc.subject?.lateThresholdMin)} className="text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 bg-amber-50/50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer w-fit">
                          <Settings className="w-3 h-3" />
                          อนุโลมสาย: {sc.subject?.lateThresholdMin || 15} นาที
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                      <Link href={`/dashboard/teacher/scan?type=class&subjectId=${sc.subject?.id}`} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3 rounded-xl font-bold shadow-sm transition-colors flex gap-1.5 items-center justify-center text-xs">
                        <Camera className="w-4 h-4" />
                        สแกนเช็คชื่อ
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Schedule */}
        {activeTab === "schedule" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6 gap-5">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-500" /> ตารางสอนสัปดาห์นี้
                </h3>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 flex-1 md:flex-none">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-500">ชั้นปี:</span>
                  <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="bg-transparent border-none text-sm font-bold text-gray-900 dark:text-white focus:ring-0 cursor-pointer w-full outline-none">
                    <option value="ทั้งหมด">ทั้งหมด</option>
                    {allLevels.map((l: string) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 flex-1 md:flex-none">
                  <Search className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-500">เทอม:</span>
                  <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)} className="bg-transparent border-none text-sm font-bold text-gray-900 dark:text-white focus:ring-0 cursor-pointer w-full outline-none">
                    <option value="ทั้งหมด">ทั้งหมด</option>
                    {allTerms.map((t: string) => <option key={t} value={t}>เทอม {t}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map(day => {
                const daySchedules = displaySchedules.filter((sc: any) => sc.dayOfWeek === day).sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
                return (
                  <div key={day} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-full">
                    <div className="bg-gray-50 dark:bg-gray-800/80 p-3 text-center border-b border-gray-200 dark:border-gray-700 flex justify-center items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500" />
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm">{daysMap[day]}</h4>
                    </div>
                    <div className="p-3 flex-1 flex flex-col gap-3">
                      {daySchedules.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-6 text-gray-400 opacity-60">
                          <Calendar className="w-8 h-8 mb-2" />
                          <span className="text-xs font-medium tracking-wider uppercase">ว่าง</span>
                        </div>
                      ) : (
                        daySchedules.map((sc: any) => (
                          <div key={sc.id} className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 flex flex-col">
                            <div className="font-bold text-sm text-gray-900 dark:text-white mb-2 leading-snug">{sc.subject?.name}</div>
                            <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 mb-2">
                              <Clock className="w-3.5 h-3.5" />
                              {sc.startTime} - {sc.endTime}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span className="text-[10px] font-bold bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">{sc.subject?.level}</span>
                              <button onClick={() => handleEditThreshold(sc.subject?.id, sc.subject?.lateThresholdMin)} className="text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer w-fit">
                                <Settings className="w-2.5 h-2.5" />
                                อนุโลม: {sc.subject?.lateThresholdMin || 15} นาที
                              </button>
                            </div>
                            <Link href={`/dashboard/teacher/scan?type=class&subjectId=${sc.subject?.id}`} className="mt-3 w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-300 py-1.5 rounded-lg font-bold transition-colors flex items-center justify-center text-xs">
                              สแกน
                            </Link>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* รายการคลาสสอนชดเชยทั้งหมด */}
            <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <CalendarPlus className="w-5 h-5 text-amber-500" />
                  รายการคลาสสอนชดเชยทั้งหมด
                </h3>
                <button
                  onClick={() => openMakeupModal()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm transition"
                >
                  <CalendarPlus className="w-4 h-4" />
                  เพิ่มคลาสสอนชดเชย
                </button>
              </div>

              {makeupClasses.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  ยังไม่มีรายการคลาสสอนชดเชยในระบบ
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {makeupClasses.map((mc: any) => {
                    const dateFormatted = new Date(mc.date).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    });

                    return (
                      <div key={mc.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 flex flex-col">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 px-2 py-0.5 rounded-full">
                            {dateFormatted}
                          </span>
                          <span className="text-[10px] font-mono text-gray-500">
                            {mc.subject?.code}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">
                          {mc.subject?.name}
                        </h4>
                        <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mb-2">
                          <Clock className="w-3.5 h-3.5" />
                          {mc.startTime} - {mc.endTime} น.
                        </div>
                        {mc.remark && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 italic">
                            {mc.remark}
                          </p>
                        )}
                        <div className="mt-auto pt-2 border-t border-gray-100 dark:border-gray-800 flex gap-2">
                          <Link
                            href={`/dashboard/teacher/scan?type=class&subjectId=${mc.subjectId}`}
                            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-1.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            สแกน
                          </Link>
                          <button
                            onClick={() => handleDeleteMakeup(mc.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition"
                            title="ลบคลาสนี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Students & Parents */}
        {activeTab === "students" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">รายชื่อนักเรียนและผู้ปกครอง</h2>
            <p className="text-gray-500 mb-6">ข้อมูลติดต่อผู้ปกครองของนักเรียนในระดับชั้นที่คุณสอน</p>
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-4 text-left font-bold text-gray-500 tracking-wider">รหัสนักเรียน</th>
                      <th className="px-6 py-4 text-left font-bold text-gray-500 tracking-wider">ชื่อ-นามสกุล</th>
                      <th className="px-6 py-4 text-center font-bold text-gray-500 tracking-wider">ชั้นปี</th>
                      <th className="px-6 py-4 text-left font-bold text-gray-500 tracking-wider">ผู้ปกครอง (เบอร์โทร)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {studentsWithParents.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-8 text-gray-500">ไม่มีนักเรียนในระดับชั้นที่คุณสอน</td></tr>
                    ) : (
                      studentsWithParents.map((st: any) => (
                        <tr key={st.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/80 transition">
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-mono">{st.username}</td>
                          <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900 dark:text-white">{st.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-gray-600 dark:text-gray-400">{st.level}</td>
                          <td className="px-6 py-4">
                            {st.parentLinks && st.parentLinks.length > 0 ? (
                              <div className="flex flex-col gap-2">
                                {st.parentLinks.map((link: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-900/50 w-fit">
                                    <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                    <span className="font-medium text-blue-900 dark:text-blue-300">{link.parent.name}</span>
                                    {link.parent.phone && (
                                      <a href={`tel:${link.parent.phone}`} className="flex items-center gap-1 ml-2 text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded text-gray-600 dark:text-gray-300 hover:text-blue-600 border border-gray-200 dark:border-gray-700 transition">
                                        <Phone className="w-3 h-3" /> {link.parent.phone}
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 italic text-xs">ยังไม่มีผู้ปกครองเชื่อมโยง</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Modal: สร้างคลาสสอนชดเชย */}
      {isMakeupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsMakeupModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                <CalendarPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">สร้างคลาสสอนชดเชย</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">กำหนดเวลาเพื่อเปิดสิทธิ์สแกนเช็คชื่อนอกตารางเรียนปกติ (ก่อน 30 น. - หลังเลิก 30 น.)</p>
              </div>
            </div>

            <form onSubmit={handleCreateMakeup} className="space-y-4">
              <div className="relative">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">วิชาที่ต้องการสอนชดเชย</label>
                {isMakeupSubjectDropdownOpen && (
                  <div className="fixed inset-0 z-40" onClick={() => setIsMakeupSubjectDropdownOpen(false)}></div>
                )}

                <div className="relative z-40">
                  <div
                    onClick={() => setIsMakeupSubjectDropdownOpen(!isMakeupSubjectDropdownOpen)}
                    className={`flex items-center justify-between w-full rounded-xl border text-sm py-2.5 px-3 cursor-pointer bg-white dark:bg-gray-900 transition-colors ${
                      isMakeupSubjectDropdownOpen 
                        ? 'border-amber-500 ring-2 ring-amber-500/20' 
                        : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <BookOpen className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className={makeupSubjectId ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-400'}>
                        {makeupSubjectId
                          ? (() => {
                              const s = subjects.find((x: any) => x.id === makeupSubjectId);
                              return s ? `[${s.code}] ${s.name} (${s.level || "ไม่ระบุ"})` : "-- เลือกวิชา --";
                            })()
                          : "-- เลือกวิชา --"}
                      </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${isMakeupSubjectDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {isMakeupSubjectDropdownOpen && (
                    <div className="absolute w-full mt-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-50 animate-in fade-in zoom-in-95">
                      <div className="p-2 sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 z-10 shadow-sm">
                        <div className="relative">
                          <input
                            type="text"
                            value={makeupSubjectSearch}
                            onChange={e => setMakeupSubjectSearch(e.target.value)}
                            placeholder="พิมพ์ค้นหารหัส หรือชื่อวิชา..."
                            className="w-full pl-8 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:bg-gray-700 dark:text-white"
                            autoFocus
                          />
                          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
                        </div>
                      </div>

                      <div className="py-1 divide-y divide-gray-50 dark:divide-gray-700/50">
                        {subjects
                          .filter((s: any) => {
                            if (!makeupSubjectSearch) return true;
                            const q = makeupSubjectSearch.toLowerCase();
                            return s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || (s.level && s.level.toLowerCase().includes(q));
                          })
                          .map((s: any) => (
                            <div
                              key={s.id}
                              onClick={() => {
                                setMakeupSubjectId(s.id);
                                setIsMakeupSubjectDropdownOpen(false);
                                setMakeupSubjectSearch("");
                              }}
                              className={`p-2.5 text-xs cursor-pointer transition-colors flex items-center justify-between hover:bg-amber-50 dark:hover:bg-amber-950/40 ${
                                makeupSubjectId === s.id 
                                  ? 'bg-amber-50 text-amber-900 font-semibold border-l-2 border-amber-500 dark:bg-amber-950/60 dark:text-amber-200' 
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              <div>
                                <span className="font-semibold text-gray-900 dark:text-white mr-1.5">[{s.code}]</span>
                                <span>{s.name}</span>
                              </div>
                              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded shrink-0">
                                {s.level || "-"}
                              </span>
                            </div>
                          ))
                        }

                        {subjects.filter((s: any) => {
                          if (!makeupSubjectSearch) return true;
                          const q = makeupSubjectSearch.toLowerCase();
                          return s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || (s.level && s.level.toLowerCase().includes(q));
                        }).length === 0 && (
                          <div className="p-3 text-center text-xs text-gray-400 italic">
                            ไม่พบวิชาที่ค้นหา
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">วันที่สอนชดเชย</label>
                <input
                  type="date"
                  value={makeupDate}
                  onChange={e => setMakeupDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-900 text-sm py-2.5 px-3 focus:ring-2 focus:ring-amber-500 outline-none"
                  required
                />
              </div>

              {/* Quick Fill Button */}
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-3 rounded-xl flex items-center justify-between">
                <div className="text-xs text-amber-800 dark:text-amber-300">
                  <span className="font-bold">เริ่มสอนทันที?</span> ตั้งเวลาเริ่มตอนนี้และสิ้นสุดในอีก 2 ชม.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const startH = String(now.getHours()).padStart(2, '0');
                    const startM = String(now.getMinutes()).padStart(2, '0');
                    setMakeupStartTime(`${startH}:${startM}`);
                    const endH = String((now.getHours() + 2) % 24).padStart(2, '0');
                    setMakeupEndTime(`${endH}:${startM}`);
                    setMakeupDate(new Date().toISOString().split("T")[0]);
                  }}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  ด่วนตอนนี้
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">เวลาเริ่ม (HH:mm)</label>
                  <input
                    type="time"
                    value={makeupStartTime}
                    onChange={e => setMakeupStartTime(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-900 text-sm py-2.5 px-3 focus:ring-2 focus:ring-amber-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">เวลาสิ้นสุด (HH:mm)</label>
                  <input
                    type="time"
                    value={makeupEndTime}
                    onChange={e => setMakeupEndTime(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-900 text-sm py-2.5 px-3 focus:ring-2 focus:ring-amber-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">หมายเหตุ (ถ้ามี)</label>
                <input
                  type="text"
                  value={makeupRemark}
                  onChange={e => setMakeupRemark(e.target.value)}
                  placeholder="เช่น สอนชดเชยวันหยุด, คาบติวพิเศษ"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-900 text-sm py-2.5 px-3 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMakeupModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMakeup}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition disabled:opacity-50"
                >
                  {isSubmittingMakeup ? "กำลังบันทึก..." : "ยืนยันสร้างคลาสชดเชย"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
