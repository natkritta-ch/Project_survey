"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  GraduationCap, 
  ArrowRight, 
  Calendar, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Sparkles,
  Info,
  ChevronRight
} from "lucide-react";
import { advanceAcademicTerm, clearOldGraduates } from "./actions";
import { showSuccess, showError, showConfirm } from "@/lib/alerts";

/**
 * คำนวณวันสิ้นสุดภาคเรียน: นับจากวันเปิดเทอมไป 19 สัปดาห์ และลงวันศุกร์ของสัปดาห์ที่ 19
 */
export function calculate19thWeekFriday(startDateStr: string): string {
  if (!startDateStr) return "";
  const parts = startDateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return "";
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime())) return "";

  const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
  // หาวันศุกร์ของสัปดาห์ที่ 1
  let daysToFirstFriday = 5 - dayOfWeek;
  if (dayOfWeek === 6) {
    // ถ้าเริ่มวันเสาร์ นับสัปดาห์ที่ 1 ไปศุกร์ถัดไป (6 วัน)
    daysToFirstFriday = 6;
  } else if (dayOfWeek === 0) {
    // ถ้าเริ่มวันอาทิตย์ นับไปวันศุกร์ของสัปดาห์ที่จะถึง (5 วัน)
    daysToFirstFriday = 5;
  }

  // วันศุกร์ของสัปดาห์ที่ 19 = วันศุกร์สัปดาห์ที่ 1 + (18 สัปดาห์ * 7 วัน = 126 วัน)
  const targetDate = new Date(date);
  targetDate.setDate(date.getDate() + daysToFirstFriday + 18 * 7);

  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, "0");
  const d = String(targetDate.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface HeadProgressionProps {
  users: any[];
  termConfigs: any[];
  setActiveTab: (tab: string) => void;
}

export default function HeadProgressionManagement({ users, termConfigs, setActiveTab }: HeadProgressionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [lastActionResult, setLastActionResult] = useState<any>(null);

  // คำนวณปี พ.ศ. ปัจจุบัน
  const currentBEYear = new Date().getFullYear() + 543;

  // หา TermConfig ปัจจุบัน
  const activeTermConfig = useMemo(() => {
    return termConfigs.find(t => t.isCurrent) || termConfigs[0] || null;
  }, [termConfigs]);

  const currentTerm = activeTermConfig?.term || "1";
  const currentYear = activeTermConfig?.academicYear || String(currentBEYear);

  // คำนวณสถานะถัดไป (Next State) แบบอัตโนมัติ (State Machine)
  const isCurrentlyTerm1 = currentTerm === "1";
  const nextTerm = isCurrentlyTerm1 ? "2" : "1";
  const nextYear = isCurrentlyTerm1 ? currentYear : String(parseInt(currentYear, 10) + 1);
  const willPromoteLevels = !isCurrentlyTerm1; // ถ้าอยู่เทอม 2 ต่อไปจะเป็นเทอม 1 พร้อมเลื่อนชั้นปี

  // คำนวณวันเริ่มต้น - สิ้นสุดค่าเริ่มต้นของเทอมใหม่ (+19 สัปดาห์ ลงวันศุกร์อัตโนมัติ)
  const defaultDates = useMemo(() => {
    const ceYear = parseInt(nextYear, 10) - 543;
    const start = nextTerm === "2" ? `${ceYear}-11-01` : `${ceYear}-05-16`;
    const autoEnd = calculate19thWeekFriday(start);
    const fallbackEnd = nextTerm === "2" ? `${ceYear + 1}-03-15` : `${ceYear}-10-10`;
    return {
      start,
      end: autoEnd || fallbackEnd
    };
  }, [nextTerm, nextYear]);

  const [inputStartDate, setInputStartDate] = useState(defaultDates.start);
  const [inputEndDate, setInputEndDate] = useState(defaultDates.end);
  const [promoteAdvisors, setPromoteAdvisors] = useState(true);
  const [cloneSubjectsAndSchedules, setCloneSubjectsAndSchedules] = useState(true);

  useEffect(() => {
    setInputStartDate(defaultDates.start);
    setInputEndDate(defaultDates.end);
  }, [defaultDates]);

  // เมื่อเปลี่ยนวันเปิดเทอม ให้คำนวณวันปิดเทอมเป็นวันศุกร์ของสัปดาห์ที่ 19 ให้อัตโนมัติ (แต่ยังคงแก้ไขเองได้)
  const handleStartDateChange = (newStart: string) => {
    setInputStartDate(newStart);
    if (newStart) {
      const autoEnd = calculate19thWeekFriday(newStart);
      if (autoEnd) {
        setInputEndDate(autoEnd);
      }
    }
  };

  // สถิตินักเรียนปัจจุบันตามระดับชั้น
  const activeStudents = useMemo(() => {
    return users.filter(u => u.role === "STUDENT" && !u.deletedAt);
  }, [users]);

  const studentCounts = useMemo(() => {
    const counts: Record<string, number> = {
      "ปวช.1": 0,
      "ปวช.2": 0,
      "ปวช.3": 0,
      "ปวส.1": 0,
      "ปวส.2": 0,
      "ปวส.1(ม.6)": 0,
      "ปวส.2(ม.6)": 0,
      "จบการศึกษา": 0,
    };
    activeStudents.forEach(s => {
      const lvl = s.level || "ไม่ระบุ";
      counts[lvl] = (counts[lvl] || 0) + 1;
    });
    return counts;
  }, [activeStudents]);

  // จัดการกดปุ่มดำเนินการ
  const handleExecuteProgression = async () => {
    if (!inputStartDate || !inputEndDate) {
      showError("ข้อมูลไม่ครบถ้วน", "กรุณาระบุวันเปิดและวันปิดภาคเรียนใหม่");
      return;
    }

    if (new Date(inputStartDate) >= new Date(inputEndDate)) {
      showError("วันที่ไม่ถูกต้อง", "วันเปิดภาคเรียนต้องมาก่อนวันปิดภาคเรียน");
      return;
    }

    setIsLoading(true);
    try {
      const res = await advanceAcademicTerm({
        nextTerm,
        nextYear,
        startDate: inputStartDate,
        endDate: inputEndDate,
        promoteLevels: willPromoteLevels,
        promoteAdvisors: willPromoteLevels ? promoteAdvisors : false,
        cloneSubjectsAndSchedules: willPromoteLevels ? cloneSubjectsAndSchedules : false
      });

      setShowConfirmModal(false);
      setLastActionResult(res);
      let successMsg = willPromoteLevels
        ? `ระบบปรับเข้าสู่ภาคเรียนที่ ${nextTerm}/${nextYear} และเลื่อนระดับชั้นนักเรียนเรียบร้อยแล้ว`
        : `ระบบปรับเข้าสู่ภาคเรียนที่ ${nextTerm}/${nextYear} เรียบร้อยแล้ว (นักเรียนคงชั้นปีเดิม)`;
      if (res.clonedSubjectsCount > 0 || res.clonedSchedulesCount > 0) {
        successMsg += ` พร้อมคัดลอกรายวิชาอัตโนมัติ ${res.clonedSubjectsCount} วิชา และตารางสอน ${res.clonedSchedulesCount} คาบ`;
      }
      showSuccess(
        "ปรับเปลี่ยนภาคเรียนสำเร็จ!",
        successMsg
      );
    } catch (err: any) {
      showError("เกิดข้อผิดพลาด", err.message || "ไม่สามารถดำเนินการได้");
    } finally {
      setIsLoading(false);
    }
  };

  // ล้างข้อมูลคนจบการศึกษา > 3 ปี
  const handleClearOldGraduates = async () => {
    const ok = await showConfirm({
      title: "ยืนยันการล้างข้อมูลเก่า?",
      text: "ต้องการลบข้อมูลนักเรียนที่มีสถานะ 'จบการศึกษา' เกินกว่า 3 ปี ออกจากฐานข้อมูลใช่หรือไม่? (การกระทำนี้ไม่สามารถย้อนกลับได้)",
      confirmText: "ล้างข้อมูลถาวร",
      isDanger: true
    });

    if (ok) {
      setIsLoading(true);
      try {
        await clearOldGraduates();
        showSuccess("ล้างข้อมูลสำเร็จ", "ลบข้อมูลผู้จบการศึกษาเก่าเกิน 3 ปีเรียบร้อยแล้ว");
      } catch (err: any) {
        showError("เกิดข้อผิดพลาด", err.message || "ไม่สามารถลบข้อมูลได้");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <GraduationCap className="w-6 h-6" />
            </span>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">จัดการภาคเรียนและเลื่อนชั้นเรียน</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            ควบคุมการเปิด-ปิดภาคเรียน การสลับตารางสอนตามเทอม และการเลื่อนระดับชั้นปีนักเรียนทั้งระบบ
          </p>
        </div>

        {/* Quick status badge */}
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <Clock className="w-5 h-5 text-indigo-500" />
          <div className="text-left">
            <span className="text-xs text-gray-400 block font-medium">ภาคเรียนปัจจุบัน</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              เทอม {currentTerm} / {currentYear}
            </span>
          </div>
        </div>
      </div>

      {/* กล่องสรุปผลการเปลี่ยนเทอมล่าสุด (ถ้าเพิ่งกดสำเร็จ) */}
      {lastActionResult && (
        <div className="p-5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-start gap-4 animate-in slide-in-from-top-4 duration-300 shadow-sm">
          <div className="p-2 bg-emerald-500 text-white rounded-xl shrink-0 mt-0.5">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-base">
              ดำเนินการปรับภาคเรียนสำเร็จแล้ว!
            </h4>
            <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
              ปัจจุบันระบบปรับเข้าสู่ <strong>ภาคเรียนที่ {lastActionResult.nextTerm} / {lastActionResult.nextYear}</strong> เรียบร้อยแล้ว
              {lastActionResult.promoteLevels ? (
                <> (มีการเลื่อนระดับชั้นนักเรียนทั้งหมด <strong>{lastActionResult.totalPromoted}</strong> คน)</>
              ) : (
                <> (นักเรียนทุกคนคงระดับชั้นปีเดิม เพื่อศึกษาต่อในเทอม 2)</>
              )}
            </p>
          </div>
          <button 
            onClick={() => setLastActionResult(null)}
            className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 text-sm font-semibold px-2 py-1"
          >
            ปิด
          </button>
        </div>
      )}

      {/* Grid: 1. Current State vs Next State */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* State 1: สถานะปัจจุบัน */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">
                สถานะปัจจุบัน (Current State)
              </span>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>

            <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
              ภาคเรียนที่ {currentTerm} / {currentYear}
            </h3>

            {activeTermConfig?.startDate && activeTermConfig?.endDate ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-6">
                <Calendar className="w-4 h-4 text-gray-400" />
                {new Date(activeTermConfig.startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                {" - "}
                {new Date(activeTermConfig.endDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            ) : (
              <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1 mb-6">
                <AlertTriangle className="w-4 h-4" /> ยังไม่ได้ตั้งช่วงวันเปิด-ปิดภาคเรียน
              </p>
            )}

            <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                สถิตินักเรียนที่กำลังศึกษา ({activeStudents.length} คน)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-gray-500 block">ปวช.1</span>
                  <span className="text-base font-bold text-gray-800 dark:text-white">{studentCounts["ปวช.1"] || 0} คน</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-gray-500 block">ปวช.2</span>
                  <span className="text-base font-bold text-gray-800 dark:text-white">{studentCounts["ปวช.2"] || 0} คน</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-gray-500 block">ปวช.3</span>
                  <span className="text-base font-bold text-gray-800 dark:text-white">{studentCounts["ปวช.3"] || 0} คน</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-gray-500 block">ปวส.1</span>
                  <span className="text-base font-bold text-gray-800 dark:text-white">{studentCounts["ปวส.1"] || 0} คน</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-gray-500 block">ปวส.2</span>
                  <span className="text-base font-bold text-gray-800 dark:text-white">{studentCounts["ปวส.2"] || 0} คน</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-gray-500 block">ปวส.1(ม.6)</span>
                  <span className="text-base font-bold text-gray-800 dark:text-white">{studentCounts["ปวส.1(ม.6)"] || 0} คน</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-gray-500 block">ปวส.2(ม.6)</span>
                  <span className="text-base font-bold text-gray-800 dark:text-white">{studentCounts["ปวส.2(ม.6)"] || 0} คน</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-gray-500 block">จบการศึกษา</span>
                  <span className="text-base font-bold text-gray-800 dark:text-white">{studentCounts["จบการศึกษา"] || 0} คน</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* State 2: ปุ่มเดียวอัจฉริยะ (Contextual Action Button) */}
        <div className={`p-6 rounded-2xl border shadow-sm flex flex-col justify-between ${
          willPromoteLevels 
            ? "bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border-amber-200 dark:border-amber-800/50" 
            : "bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-transparent border-indigo-200 dark:border-indigo-800/50"
        }`}>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className={`p-2 rounded-xl text-white ${willPromoteLevels ? "bg-amber-500" : "bg-indigo-600"}`}>
                {willPromoteLevels ? <GraduationCap className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
              </span>
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                  ขั้นตอนถัดไปอัตโนมัติ (Next Progression Step)
                </span>
                <h4 className="text-lg font-extrabold text-gray-900 dark:text-white">
                  {willPromoteLevels ? "สิ้นสุดปีการศึกษา & เลื่อนชั้นปี" : "สิ้นสุดเทอม 1 & เปิดเทอม 2"}
                </h4>
              </div>
            </div>

            <div className="my-4 p-4 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center justify-between font-semibold">
                <span>เป้าหมายใหม่:</span>
                <span className={`px-2.5 py-1 rounded-lg text-white font-bold ${willPromoteLevels ? "bg-amber-500" : "bg-indigo-600"}`}>
                  ภาคเรียนที่ {nextTerm} / {nextYear}
                </span>
              </div>
              <div className="flex items-start gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/50">
                <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <span className="text-xs leading-relaxed">
                  {willPromoteLevels ? (
                    <>
                      <strong>การเลื่อนชั้นปี:</strong> ปวช.1 ➡️ ปวช.2, ปวช.2 ➡️ ปวช.3, ปวช.3 ➡️ จบการศึกษา 
                      พร้อมขยับสู่ปีการศึกษาใหม่ {nextYear} เทอม 1
                    </>
                  ) : (
                    <>
                      <strong>คงชั้นปีเดิม:</strong> นักเรียนทุกคนยังคงอยู่ชั้นปีเดิม (ปวช.1 ยังเป็น ปวช.1) 
                      ระบบจะสลับไปดึงรายวิชาและตารางสอนของ <strong>เทอม 2</strong> ทันที
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          <button
            disabled={isLoading}
            onClick={() => {
              setInputStartDate(defaultDates.start);
              setInputEndDate(defaultDates.end);
              setShowConfirmModal(true);
            }}
            className={`w-full py-4 px-6 rounded-xl font-bold text-base text-white shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
              willPromoteLevels 
                ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/20" 
                : "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-indigo-500/20"
            }`}
          >
            {willPromoteLevels ? (
              <>
                <GraduationCap className="w-5 h-5" />
                สิ้นสุดปีการศึกษา เลื่อนชั้นปี 🎓 ➡️ เริ่มปี {nextYear} (เทอม 1)
              </>
            ) : (
              <>
                <ArrowRight className="w-5 h-5" />
                ปิดภาคเรียนที่ 1 ➡️ เริ่มต้นภาคเรียนที่ 2 / {nextYear}
              </>
            )}
          </button>
        </div>

      </div>

      {/* Next Steps: สิ่งที่หัวหน้าแผนกควรทำต่อในเทอมใหม่ */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          สิ่งที่ควรทำต่อเมื่อเปิดภาคเรียนใหม่ (Next Steps Checklist)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => setActiveTab("subjects")}
            className="p-4 rounded-xl border border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-700/20 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 hover:border-indigo-200 transition-all text-left group"
          >
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl w-fit mb-3">
              <BookOpen className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center justify-between">
              1. จัดการรายวิชาเทอมใหม่
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              ตรวจสอบและเพิ่มรายวิชาที่เปิดสอนในเทอม {nextTerm}/{nextYear}
            </p>
          </button>

          <button
            onClick={() => setActiveTab("schedules")}
            className="p-4 rounded-xl border border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-700/20 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 hover:border-indigo-200 transition-all text-left group"
          >
            <div className="p-2.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-xl w-fit mb-3">
              <Calendar className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center justify-between">
              2. จัดตารางสอนประจำสัปดาห์
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              กำหนดห้องเรียน เวลาเรียน และมอบหมายอาจารย์ผู้สอน
            </p>
          </button>
        </div>
      </div>

      {/* กล่องทำความสะอาดข้อมูลเก่า (ย้ายปุ่มสีแดงมาไว้ที่นี่) */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-red-500" />
            ล้างข้อมูลผู้จบการศึกษาเก่า (&gt; 3 ปี)
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
            ค้นหาและลบบัญชีนักเรียนที่มีสถานะ "จบการศึกษา" และไม่ได้มีความเคลื่อนไหวเกินกว่า 3 ปี เพื่อลดความซ้ำซ้อนและประหยัดพื้นที่ฐานข้อมูล
          </p>
        </div>

        <button
          disabled={isLoading}
          onClick={handleClearOldGraduates}
          className="px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40 rounded-xl text-xs font-bold transition shadow-sm whitespace-nowrap active:scale-95"
        >
          ล้างข้อมูลคนจบการศึกษา &gt; 3 ปี
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <span className={`p-2.5 rounded-xl text-white ${willPromoteLevels ? "bg-amber-500" : "bg-indigo-600"}`}>
                {willPromoteLevels ? <GraduationCap className="w-6 h-6" /> : <ArrowRight className="w-6 h-6" />}
              </span>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {willPromoteLevels ? "ยืนยันการสิ้นสุดปีการศึกษา & เลื่อนชั้นปี" : "ยืนยันการเริ่มภาคเรียนที่ 2"}
                </h3>
                <span className="text-xs text-gray-500">โปรดตรวจสอบรายละเอียดก่อนกดยืนยัน</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-5 space-y-3 text-sm">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">ภาคเรียนปัจจุบัน:</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">เทอม {currentTerm} / {currentYear}</span>
              </div>
              <div className="flex justify-between items-center font-bold text-indigo-600 dark:text-indigo-400">
                <span>ปรับเข้าสู่ภาคเรียนใหม่:</span>
                <span className="text-base px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-md">
                  เทอม {nextTerm} / {nextYear}
                </span>
              </div>

              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-xs text-gray-500 block mb-1">ผลกระทบต่อนักเรียน:</span>
                {willPromoteLevels ? (
                  <ul className="text-xs text-gray-600 dark:text-gray-400 list-disc list-inside space-y-0.5">
                    <li>ปวช.1 ({studentCounts["ปวช.1"] || 0} คน) ➡️ เลื่อนขึ้น <strong>ปวช.2</strong></li>
                    <li>ปวช.2 ({studentCounts["ปวช.2"] || 0} คน) ➡️ เลื่อนขึ้น <strong>ปวช.3</strong></li>
                    <li>ปวช.3 ({studentCounts["ปวช.3"] || 0} คน) ➡️ ปรับเป็น <strong>จบการศึกษา</strong></li>
                    <li>ปวส.1 ({studentCounts["ปวส.1"] || 0} คน) ➡️ เลื่อนขึ้น <strong>ปวส.2</strong></li>
                    <li>ปวส.2 ({studentCounts["ปวส.2"] || 0} คน) ➡️ ปรับเป็น <strong>จบการศึกษา</strong></li>
                    <li>ปวส.1(ม.6) ({studentCounts["ปวส.1(ม.6)"] || 0} คน) ➡️ เลื่อนขึ้น <strong>ปวส.2(ม.6)</strong></li>
                    <li>ปวส.2(ม.6) ({studentCounts["ปวส.2(ม.6)"] || 0} คน) ➡️ ปรับเป็น <strong>จบการศึกษา</strong></li>
                  </ul>
                ) : (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ นักเรียนทุกคนยังคงอยู่ชั้นปีเดิม (ปวช.1 ยังเป็น ปวช.1)
                  </p>
                )}

                {willPromoteLevels && (
                  <>
                    <div className="mt-3 pt-2.5 border-t border-gray-200 dark:border-gray-700">
                      <label className="flex items-start gap-2.5 cursor-pointer text-xs text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={promoteAdvisors}
                          onChange={e => setPromoteAdvisors(e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div>
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            เลื่อนอาจารย์ที่ปรึกษาตามรุ่นชั้นปีด้วย
                          </span>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            ครูที่ปรึกษา ปวช.1 ➡️ ปวช.2, ปวช.2 ➡️ ปวช.3, ปวส.1 ➡️ ปวส.2, ปวส.1(ม.6) ➡️ ปวส.2(ม.6) อัตโนมัติในปีการศึกษาใหม่
                          </p>
                        </div>
                      </label>
                    </div>

                    <div className="mt-2.5 pt-2.5 border-t border-gray-200 dark:border-gray-700">
                      <label className="flex items-start gap-2.5 cursor-pointer text-xs text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={cloneSubjectsAndSchedules}
                          onChange={e => setCloneSubjectsAndSchedules(e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div>
                          <span className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                            <span>คัดลอกรายวิชาและตารางสอนข้ามปีอัตโนมัติ (Auto-clone)</span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 rounded font-bold">แนะนำ</span>
                          </span>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            คัดลอกรายวิชาและคาบเรียนในตารางสอนจากปี {currentYear} มายังปี {nextYear} ให้อัตโนมัติ (สามารถแก้ไข ปรับปรุง หรือเพิ่มวิชาใหม่ได้ตลอดเวลา)
                          </p>
                        </div>
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ตั้งค่าวันเปิด-ปิดเทอมใหม่ */}
            <div className="space-y-3 mb-6">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                ระบุช่วงวันเปิด - ปิดภาคเรียนใหม่:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-gray-500 block mb-1">วันเปิดเทอม</span>
                  <input
                    type="date"
                    value={inputStartDate}
                    onChange={e => handleStartDateChange(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-gray-500 block mb-1">วันปิดเทอม</span>
                  <input
                    type="date"
                    value={inputEndDate}
                    onChange={e => setInputEndDate(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1 block font-medium">
                    ✨ คำนวณ +19 สัปดาห์ (วันศุกร์) ให้อัตโนมัติ (แก้ไขได้)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleExecuteProgression}
                className={`px-5 py-2 text-sm font-bold text-white rounded-xl shadow-md transition active:scale-95 ${
                  willPromoteLevels ? "bg-amber-500 hover:bg-amber-600" : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {isLoading ? "กำลังดำเนินการ..." : "ยืนยันและดำเนินการทันที"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
