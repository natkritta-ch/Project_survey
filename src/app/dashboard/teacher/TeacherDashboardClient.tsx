"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search, Filter, Camera, Clock, Calendar, Users, MapPin, Home, LogOut, Phone, ShieldCheck, Menu, X, BarChart, Settings, CalendarPlus, Trash2, Sparkles, BookOpen, ChevronDown, FileCheck, RotateCcw, AlertTriangle, RefreshCw, Key, Copy, Check, GraduationCap, CheckCircle2, ShieldAlert } from "lucide-react";
import { signOut } from "next-auth/react";
import { showSuccess, showError, showWarning, showInfo, showToast, showConfirm, showPromptNumber } from "@/lib/alerts";
import TeacherAdvisoryView from "./TeacherAdvisoryView";

export default function TeacherDashboardClient({ 
  schedules, 
  allLevels, 
  initialTerm, 
  sessionName, 
  studentsWithParents = [], 
  weeklyStats,
  subjects = [],
  initialMakeupClasses = [],
  initialTrashedMakeupClasses = [],
  advisoryData = null
}: any) {
  const [activeTab, setActiveTab] = useState("overview");
  const [filterTerm, setFilterTerm] = useState(initialTerm || "ทั้งหมด");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [studentParentSearch, setStudentParentSearch] = useState("");
  const [studentParentLevelFilter, setStudentParentLevelFilter] = useState("ทั้งหมด");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast("คัดลอกรหัสเรียบร้อยแล้ว", "success");
    setTimeout(() => {
      setCopiedCode((prev) => (prev === code ? null : prev));
    }, 2000);
  };

  // ล็อกการเลื่อนหน้าจอข้างหลังเมื่อเปิดเมนูมือถือ
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // State สำหรับคลาสสอนชดเชย
  const [makeupClasses, setMakeupClasses] = useState<any[]>(initialMakeupClasses || []);
  const [trashedMakeupClasses, setTrashedMakeupClasses] = useState<any[]>(initialTrashedMakeupClasses || []);
  const [isTrashLoading, setIsTrashLoading] = useState(false);
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

  const fetchTrashedMakeupClasses = async () => {
    try {
      setIsTrashLoading(true);
      const res = await fetch('/api/makeup-classes?trashed=true');
      const data = await res.json();
      if (res.ok && data.success) {
        setTrashedMakeupClasses(data.makeupClasses || []);
      }
    } catch (e) {
      console.error("Failed to fetch trashed makeup classes", e);
    } finally {
      setIsTrashLoading(false);
    }
  };

  const handleDeleteMakeup = async (id: string, name?: string) => {
    const target = makeupClasses.find((m: any) => m.id === id);
    if (target?.hasAttendance) {
      showWarning("ไม่สามารถลบได้", `คลาสสอนชดเชยนี้ผ่านการเปิดสแกนเช็คชื่อแล้ว (มีประวัติเข้าเรียน ${target.attendanceCount || 0} คน) จึงไม่สามารถลบได้เพื่อป้องกันข้อมูลเวลาเรียนสูญหาย`);
      return;
    }

    const ok = await showConfirm({
      title: "ย้ายคลาสสอนชดเชยไปที่ถังขยะ?",
      text: `ต้องการย้ายคลาส "${name || 'นี้'}" ไปเก็บในถังขยะใช่หรือไม่? (สามารถกู้คืนได้ภายใน 7 วัน)`,
      confirmText: "ย้ายไปถังขยะ",
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
      const data = await res.json();
      if (res.ok && data.success) {
        const target = makeupClasses.find(m => m.id === id);
        setMakeupClasses(prev => prev.filter(m => m.id !== id));
        if (target) {
          setTrashedMakeupClasses(prev => [
            { ...target, deletedAt: new Date().toISOString(), daysRemaining: 7 },
            ...prev
          ]);
        }
        showToast("ย้ายคลาสสอนชดเชยไปที่ถังขยะเรียบร้อย (กู้คืนได้ใน 7 วัน)", "success");
      } else {
        showError("เกิดข้อผิดพลาด", data.message || "ไม่สามารถลบคลาสได้");
      }
    } catch (err: any) {
      showError("เกิดข้อผิดพลาดในการเชื่อมต่อ", err.message);
    }
  };

  const handleRestoreMakeup = async (id: string, name?: string) => {
    const ok = await showConfirm({
      title: "ยืนยันกู้คืนคลาสสอนชดเชย?",
      text: `ต้องการกู้คืนคลาส "${name || ''}" กลับสู่ตารางการสอนใช่หรือไม่?`,
      confirmText: "กู้คืน",
      icon: "question"
    });
    if (!ok) return;

    setIsTrashLoading(true);
    try {
      const res = await fetch('/api/makeup-classes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'restore' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTrashedMakeupClasses(prev => prev.filter(m => m.id !== id));
        if (data.makeupClass) {
          setMakeupClasses(prev => [data.makeupClass, ...prev]);
        }
        showToast("กู้คืนคลาสสอนชดเชยสำเร็จ", "success");
      } else {
        showError("เกิดข้อผิดพลาด", data.message || "ไม่สามารถกู้คืนได้");
      }
    } catch (err: any) {
      showError("เกิดข้อผิดพลาดในการเชื่อมต่อ", err.message);
    } finally {
      setIsTrashLoading(false);
    }
  };

  const handlePermanentDeleteMakeup = async (id: string, name?: string) => {
    const ok = await showConfirm({
      title: "⚠️ ยืนยันลบถาวร?",
      text: `คุณแน่ใจหรือไม่ที่จะลบคลาส "${name || ''}" อย่างถาวร?\n(ข้อมูลจะถูกลบออกจากระบบและไม่สามารถกู้คืนได้!)`,
      confirmText: "ลบถาวร",
      cancelText: "ยกเลิก",
      isDanger: true
    });
    if (!ok) return;

    setIsTrashLoading(true);
    try {
      const res = await fetch('/api/makeup-classes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, permanent: true })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTrashedMakeupClasses(prev => prev.filter(m => m.id !== id));
        showToast("ลบคลาสสอนชดเชยถาวรแล้ว", "success");
      } else {
        showError("เกิดข้อผิดพลาด", data.message || "ไม่สามารถลบถาวรได้");
      }
    } catch (err: any) {
      showError("เกิดข้อผิดพลาดในการเชื่อมต่อ", err.message);
    } finally {
      setIsTrashLoading(false);
    }
  };

  const handleRestoreAllMakeup = async () => {
    if (trashedMakeupClasses.length === 0) return;
    const ok = await showConfirm({
      title: "ยืนยันกู้คืนทั้งหมด?",
      text: `ต้องการกู้คืนคลาสสอนชดเชยทั้งหมด ${trashedMakeupClasses.length} รายการกลับสู่ตารางการสอนใช่หรือไม่?`,
      confirmText: "กู้คืนทั้งหมด",
      icon: "question"
    });
    if (!ok) return;

    setIsTrashLoading(true);
    try {
      const res = await fetch('/api/makeup-classes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore-all' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const activeRes = await fetch('/api/makeup-classes');
        const activeData = await activeRes.json();
        if (activeData.success) {
          setMakeupClasses(activeData.makeupClasses || []);
        }
        setTrashedMakeupClasses([]);
        showToast("กู้คืนคลาสสอนชดเชยทั้งหมดสำเร็จ", "success");
      } else {
        showError("เกิดข้อผิดพลาด", data.message || "ไม่สามารถกู้คืนทั้งหมดได้");
      }
    } catch (err: any) {
      showError("เกิดข้อผิดพลาดในการเชื่อมต่อ", err.message);
    } finally {
      setIsTrashLoading(false);
    }
  };

  const handleClearAllTrashMakeup = async () => {
    if (trashedMakeupClasses.length === 0) return;
    const ok = await showConfirm({
      title: "⚠️ ล้างถังขยะคลาสชดเชยทั้งหมด?",
      text: `คุณแน่ใจหรือไม่ที่จะลบถาวรทุกรายการในถังขยะ (${trashedMakeupClasses.length} รายการ)?\nการกระทำนี้ไม่สามารถย้อนกลับหรือกู้คืนได้!`,
      confirmText: "ลบถาวรทั้งหมด",
      cancelText: "ยกเลิก",
      isDanger: true
    });
    if (!ok) return;

    setIsTrashLoading(true);
    try {
      const res = await fetch('/api/makeup-classes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk-delete-permanent' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTrashedMakeupClasses([]);
        showToast("ล้างถังขยะเรียบร้อยแล้ว", "success");
      } else {
        showError("เกิดข้อผิดพลาด", data.message || "ไม่สามารถล้างถังขยะได้");
      }
    } catch (err: any) {
      showError("เกิดข้อผิดพลาดในการเชื่อมต่อ", err.message);
    } finally {
      setIsTrashLoading(false);
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
    if (filterTerm !== "ทั้งหมด" && (sc.subject?.term || "-") !== filterTerm) return false;
    return true;
  });

  const daysMap: Record<number, string> = {
    1: "วันจันทร์", 2: "วันอังคาร", 3: "วันพุธ", 4: "วันพฤหัสบดี", 5: "วันศุกร์", 6: "วันเสาร์", 7: "วันอาทิตย์"
  };

  const pendingTwinsCount = useMemo(() => {
    if (!advisoryData?.students) return 0;
    return advisoryData.students.filter((s: any) => s.isTwin && !s.twinVerified).length;
  }, [advisoryData]);

  const isAdvisor = !!(advisoryData && advisoryData.assignments && advisoryData.assignments.length > 0);

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
        fixed md:static inset-y-0 left-0 z-50 bg-indigo-900 text-white w-64 flex-shrink-0 flex flex-col transition-transform duration-300
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
          {/* 1. ภาพรวมวันนี้ */}
          <button
            type="button"
            onClick={() => handleTabClick("overview")}
            className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium text-sm text-left
              ${activeTab === "overview" 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                : 'text-indigo-200 hover:bg-indigo-800/50 hover:text-white'
              }`}
          >
            <div className="flex items-center gap-3">
              <Home className="w-5 h-5" /> ภาพรวมวันนี้
            </div>
          </button>

          {/* 2. ตารางสอนทั้งหมด */}
          <button
            type="button"
            onClick={() => handleTabClick("schedule")}
            className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium text-sm text-left
              ${activeTab === "schedule" 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                : 'text-indigo-200 hover:bg-indigo-800/50 hover:text-white'
              }`}
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5" /> ตารางสอนทั้งหมด
            </div>
          </button>

          {/* 3. รายงานการเข้าเรียน */}
          <Link 
            href="/dashboard/teacher/report" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-indigo-200 hover:bg-indigo-800/50 hover:text-white transition-all font-medium text-sm"
          >
            <BarChart className="w-5 h-5" /> รายงานการเข้าเรียน
          </Link>

          {/* 4. ห้องในที่ปรึกษาของฉัน (แสดงเมื่อได้รับการแต่งตั้งเป็นที่ปรึกษา) */}
          {isAdvisor && (
            <button
              type="button"
              onClick={() => handleTabClick("advisees")}
              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium text-sm text-left
                ${activeTab === "advisees" 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                  : 'text-indigo-200 hover:bg-indigo-800/50 hover:text-white'
                }`}
            >
              <div className="flex items-center gap-3">
                <GraduationCap className="w-5 h-5" /> ห้องในที่ปรึกษาของฉัน
              </div>
              {pendingTwinsCount > 0 && (
                <span className="bg-rose-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full leading-none">
                  {pendingTwinsCount}
                </span>
              )}
            </button>
          )}
        </nav>

        {/* เมนูด้านล่าง: ถังขยะคลาสชดเชย & ออกจากระบบ */}
        <div className="p-3 border-t border-indigo-800/50 flex flex-col gap-1.5 bg-indigo-950/20">
          <button
            type="button"
            onClick={() => {
              handleTabClick("trash");
              fetchTrashedMakeupClasses();
            }}
            className={`flex items-center justify-between px-4 py-2.5 rounded-xl transition-all font-medium text-sm text-left
              ${activeTab === "trash" 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                : 'text-indigo-200 hover:bg-indigo-800/50 hover:text-white'
              }`}
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-5 h-5 text-indigo-300" /> ถังขยะคลาสชดเชย
            </div>
            {trashedMakeupClasses.length > 0 && (
              <span className="bg-rose-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full leading-none">
                {trashedMakeupClasses.length}
              </span>
            )}
          </button>

          <button 
            type="button"
            onClick={async () => {
              try {
                await signOut({ redirect: false, callbackUrl: '/login' });
              } catch (e) {
                console.error("Logout error:", e);
              }
              window.location.href = "/login";
            }}
            className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl text-red-300 hover:bg-red-900/30 hover:text-red-200 transition-all font-medium text-sm"
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
                          {mc.hasAttendance ? (
                            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              เช็คชื่อแล้ว ({mc.attendanceCount} คน)
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-200/70 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">
                              สอนชดเชย
                            </span>
                          )}
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
                            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1 shadow-sm transition ${
                              mc.hasAttendance 
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                                : "bg-amber-600 hover:bg-amber-700 text-white"
                            }`}
                          >
                            <Camera className="w-4 h-4" />
                            {mc.hasAttendance ? "สแกนเช็คชื่อเพิ่มเติม" : "สแกนเช็คชื่อ"}
                          </Link>
                          {mc.hasAttendance ? (
                            <div 
                              className="p-2 text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800/60 rounded-xl cursor-not-allowed flex items-center justify-center"
                              title="คลาสนี้เช็คชื่อแล้ว (ไม่สามารถลบได้ เพื่อรักษาประวัติเวลาเรียน)"
                            >
                              <ShieldAlert className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                          ) : (
                            <button
                              onClick={() => handleDeleteMakeup(mc.id, mc.subject?.name)}
                              className="p-2 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-xl transition"
                              title="ลบคลาสนี้"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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
                  <Calendar className="w-5 h-5 text-indigo-500" /> ตารางสอนเทอมนี้
                </h3>
              </div>
              
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 w-full md:w-auto">
                <Search className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-500">เทอม:</span>
                <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)} className="bg-transparent border-none text-sm font-bold text-gray-900 dark:text-white focus:ring-0 cursor-pointer outline-none">
                  <option value="ทั้งหมด">ทั้งหมด</option>
                  {allTerms.map((t: string) => <option key={t} value={t}>เทอม {t}</option>)}
                </select>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <CalendarPlus className="w-5 h-5 text-amber-500" />
                  รายการคลาสสอนชดเชยทั้งหมด ({makeupClasses.length})
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveTab("trash");
                      fetchTrashedMakeupClasses();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700/70 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition border border-gray-200 dark:border-gray-600"
                    title="เปิดหน้าถังขยะคลาสสอนชดเชย"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500" />
                    ถังขยะ {trashedMakeupClasses.length > 0 && (
                      <span className="bg-rose-500 text-white rounded-full px-1.5 py-0.5 text-[10px] font-mono leading-none">
                        {trashedMakeupClasses.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => openMakeupModal()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm transition"
                  >
                    <CalendarPlus className="w-4 h-4" />
                    เพิ่มคลาสสอนชดเชย
                  </button>
                </div>
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
                        <div className="flex items-center justify-between mt-1 mb-1">
                          <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                            {mc.subject?.name}
                          </h4>
                          {mc.hasAttendance ? (
                            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              เช็คชื่อแล้ว ({mc.attendanceCount} คน)
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full shrink-0">
                              ยังไม่เช็คชื่อ
                            </span>
                          )}
                        </div>
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
                            className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition ${
                              mc.hasAttendance 
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                                : "bg-amber-600 hover:bg-amber-700 text-white"
                            }`}
                          >
                            <Camera className="w-3.5 h-3.5" />
                            {mc.hasAttendance ? "สแกนเพิ่มเติม" : "สแกน"}
                          </Link>
                          {mc.hasAttendance ? (
                            <div
                              className="p-1.5 text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800/60 rounded-lg cursor-not-allowed flex items-center justify-center"
                              title="คลาสนี้เช็คชื่อแล้ว (มีประวัติเข้าเรียน ไม่สามารถลบได้)"
                            >
                              <ShieldAlert className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                          ) : (
                            <button
                              onClick={() => handleDeleteMakeup(mc.id, mc.subject?.name)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition"
                              title="ย้ายไปถังขยะ (กู้คืนได้ภายใน 7 วัน)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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
        {activeTab === "students" && (() => {
          const filteredStudents = studentsWithParents.filter((st: any) => {
            const matchesLevel = studentParentLevelFilter === "ทั้งหมด" || st.level === studentParentLevelFilter;
            if (!matchesLevel) return false;
            if (!studentParentSearch.trim()) return true;

            const q = studentParentSearch.toLowerCase().trim();
            const matchName = st.name?.toLowerCase().includes(q);
            const matchUsername = st.username?.toLowerCase().includes(q);
            const matchCode = st.parentCode?.toLowerCase().includes(q);
            const matchParent = st.parentLinks?.some((link: any) => 
              link.parent?.name?.toLowerCase().includes(q) || 
              link.parent?.phone?.includes(q)
            );

            return matchName || matchUsername || matchCode || matchParent;
          });

          const totalCount = studentsWithParents.length;
          const linkedCount = studentsWithParents.filter((st: any) => st.parentLinks && st.parentLinks.length > 0).length;
          const unlinkedCount = totalCount - linkedCount;

          return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                      <Users className="w-6 h-6" />
                    </span>
                    รายชื่อนักเรียนและรหัสผู้ปกครอง
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    ข้อมูลติดต่อผู้ปกครองและรหัสผูกบัญชี (Parent Code) ของนักเรียนในระดับชั้นที่คุณสอน สามารถคัดลอกส่งให้ผู้ปกครองได้ทันที
                  </p>
                </div>

                {/* Quick Summary Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm text-xs font-medium text-gray-700 dark:text-gray-300">
                    นักเรียนทั้งหมด: <span className="font-bold text-indigo-600 dark:text-indigo-400">{totalCount}</span> คน
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    ผูกผู้ปกครองแล้ว: <span className="font-bold">{linkedCount}</span> คน
                  </div>
                  {unlinkedCount > 0 && (
                    <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-medium text-amber-700 dark:text-amber-300">
                      ยังไม่ผูกผู้ปกครอง: <span className="font-bold">{unlinkedCount}</span> คน
                    </div>
                  )}
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={studentParentSearch}
                    onChange={(e) => setStudentParentSearch(e.target.value)}
                    placeholder="ค้นหาชื่อนักเรียน, รหัส นร., รหัสผู้ปกครอง, หรือชื่อ/เบอร์ผู้ปกครอง..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  />
                  {studentParentSearch && (
                    <button
                      onClick={() => setStudentParentSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      ล้าง
                    </button>
                  )}
                </div>

                {allLevels.length > 1 && (
                  <div className="w-full sm:w-48">
                    <select
                      value={studentParentLevelFilter}
                      onChange={(e) => setStudentParentLevelFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="ทั้งหมด">ทุกระดับชั้น ({allLevels.length})</option>
                      {allLevels.map((lvl: string) => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              {/* Table */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                    <thead className="bg-gray-50/80 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-6 py-4 text-left font-bold text-gray-500 dark:text-gray-400 tracking-wider">รหัสนักเรียน</th>
                        <th className="px-6 py-4 text-left font-bold text-gray-500 dark:text-gray-400 tracking-wider">ชื่อ-นามสกุล</th>
                        <th className="px-6 py-4 text-center font-bold text-gray-500 dark:text-gray-400 tracking-wider">ระดับชั้น</th>
                        <th className="px-6 py-4 text-left font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                          <span className="inline-flex items-center gap-1.5">
                            <Key className="w-4 h-4 text-indigo-500" />
                            รหัสผูกผู้ปกครอง (Parent Code)
                          </span>
                        </th>
                        <th className="px-6 py-4 text-left font-bold text-gray-500 dark:text-gray-400 tracking-wider">ผู้ปกครองที่เชื่อมโยง</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <Users className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                            ไม่พบข้อมูลนักเรียนที่ตรงกับเงื่อนไขการค้นหา
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((st: any) => (
                          <tr key={st.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/80 transition">
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400 font-mono font-medium">
                              {st.username}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900 dark:text-white">
                              {st.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                {st.level || "ไม่ระบุ"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {st.parentCode ? (
                                <button
                                  type="button"
                                  onClick={() => handleCopyCode(st.parentCode)}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs hover:border-indigo-400 transition shadow-sm group"
                                  title="คลิกเพื่อคัดลอกรหัสให้ผู้ปกครอง"
                                >
                                  <Key className="w-3.5 h-3.5 text-indigo-500" />
                                  <span className="tracking-wider">{st.parentCode}</span>
                                  {copiedCode === st.parentCode ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition" />
                                  )}
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-gray-400 italic">
                                  ยังไม่มีรหัส
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {st.parentLinks && st.parentLinks.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {st.parentLinks.map((link: any, idx: number) => (
                                    <div 
                                      key={idx} 
                                      className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-xl border border-emerald-200/70 dark:border-emerald-800/60"
                                    >
                                      <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                      <span className="font-medium text-emerald-900 dark:text-emerald-300 text-xs">
                                        {link.parent.name}
                                      </span>
                                      {link.parent.phone && (
                                        <a 
                                          href={`tel:${link.parent.phone}`} 
                                          className="inline-flex items-center gap-1 ml-1 text-xs bg-white dark:bg-gray-800 px-2 py-0.5 rounded-lg text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 border border-emerald-200 dark:border-emerald-700 transition"
                                          title={`โทรหา ${link.parent.name}`}
                                        >
                                          <Phone className="w-3 h-3" /> {link.parent.phone}
                                        </a>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-lg border border-amber-200/60 dark:border-amber-900/50">
                                  ยังไม่มีผู้ปกครองผูกรหัส
                                </span>
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
          );
        })()}

        {/* Tab 4: Trashed Makeup Classes */}
        {activeTab === "trash" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                    <Trash2 className="w-6 h-6" />
                  </span>
                  ถังขยะคลาสสอนชดเชย
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  คลาสสอนชดเชยที่ถูกลบ สามารถตรวจสอบ กู้คืนกลับสู่ตารางสอน หรือลบถาวรได้
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchTrashedMakeupClasses}
                  disabled={isTrashLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
                  title="รีเฟรชข้อมูล"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTrashLoading ? 'animate-spin text-indigo-500' : ''}`} />
                  รีเฟรช
                </button>
                {trashedMakeupClasses.length > 0 && (
                  <>
                    <button
                      onClick={handleRestoreAllMakeup}
                      disabled={isTrashLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold transition disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      กู้คืนทั้งหมด ({trashedMakeupClasses.length})
                    </button>
                    <button
                      onClick={handleClearAllTrashMakeup}
                      disabled={isTrashLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 rounded-xl text-xs font-bold transition disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      ล้างถังขยะทั้งหมด
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Warning Alert Banner (7 Days Auto Cleanup) */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 p-4 rounded-r-xl shadow-sm">
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-0.5">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    ระบบถังขยะอัตโนมัติ (เก็บข้อมูล 7 วัน)
                  </h3>
                  <div className="mt-1 text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                    <p>
                      คลาสสอนชดเชยที่ถูกลบจะถูกพักไว้ในถังขยะเป็นเวลา <strong className="font-semibold underline">7 วัน</strong> หากเลยกำหนดเวลาระบบจะลบข้อมูลออกจากฐานข้อมูลโดยอัตโนมัติอย่างถาวร หากต้องการนำคลาสกลับมาใช้สอน สามารถกดปุ่ม <strong className="text-emerald-700 dark:text-emerald-400 font-semibold">&ldquo;กู้คืน&rdquo;</strong> ได้ตลอดเวลา
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Content List */}
            {trashedMakeupClasses.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700/50 rounded-full flex items-center justify-center text-gray-400">
                  <Trash2 className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-gray-800 dark:text-white mb-1">
                  ไม่มีคลาสสอนชดเชยในถังขยะ
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  เมื่อคุณลบคลาสสอนชดเชยจากหน้าหลัก รายการจะถูกย้ายมาพักไว้ที่นี่เพื่อให้คุณสามารถกู้คืนได้ภายใน 7 วัน
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-6 py-3.5 text-left font-bold text-gray-500 uppercase tracking-wider text-xs">วิชา</th>
                        <th className="px-6 py-3.5 text-left font-bold text-gray-500 uppercase tracking-wider text-xs">วันที่และเวลาสอน</th>
                        <th className="px-6 py-3.5 text-left font-bold text-gray-500 uppercase tracking-wider text-xs">หมายเหตุ</th>
                        <th className="px-6 py-3.5 text-center font-bold text-gray-500 uppercase tracking-wider text-xs">สถานะถังขยะ</th>
                        <th className="px-6 py-3.5 text-right font-bold text-gray-500 uppercase tracking-wider text-xs">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {trashedMakeupClasses.map((mc: any) => {
                        const dateFormatted = new Date(mc.date).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        });
                        const deletedDateFormatted = mc.deletedAt 
                          ? new Date(mc.deletedAt).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : "-";

                        const daysLeft = mc.daysRemaining !== undefined ? mc.daysRemaining : 7;
                        const isExpiringSoon = daysLeft <= 2;

                        return (
                          <tr key={mc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/80 transition">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-0.5 rounded">
                                  {mc.subject?.code}
                                </span>
                                <div>
                                  <div className="font-semibold text-gray-900 dark:text-white">
                                    {mc.subject?.name}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    ระดับชั้น: {mc.subject?.level || "-"}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium text-gray-900 dark:text-gray-200">
                                {dateFormatted}
                              </div>
                              <div className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-mono font-semibold">
                                <Clock className="w-3 h-3" />
                                {mc.startTime} - {mc.endTime} น.
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                                {mc.remark || "-"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center whitespace-nowrap">
                              <div className="flex flex-col items-center gap-1">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  isExpiringSoon
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                }`}>
                                  <Clock className="w-3 h-3" />
                                  {daysLeft <= 0 ? 'หมดเวลาวันนี้' : `เหลือกู้คืนอีก ${daysLeft} วัน`}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  ลบเมื่อ: {deletedDateFormatted}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleRestoreMakeup(mc.id, mc.subject?.name)}
                                  disabled={isTrashLoading}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition disabled:opacity-50"
                                  title="กู้คืนกลับสู่ตารางสอน"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  กู้คืน
                                </button>
                                <button
                                  onClick={() => handlePermanentDeleteMakeup(mc.id, mc.subject?.name)}
                                  disabled={isTrashLoading}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-xs font-bold transition disabled:opacity-50"
                                  title="ลบถาวร ไม่สามารถกู้คืนได้"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  ลบถาวร
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Advisees (ห้องในที่ปรึกษาของฉัน) */}
        {activeTab === "advisees" && advisoryData && (
          <TeacherAdvisoryView advisoryData={advisoryData} />
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

      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-xs"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
