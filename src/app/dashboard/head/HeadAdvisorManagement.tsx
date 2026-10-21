"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  GraduationCap, 
  Users, 
  Save, 
  Copy, 
  ArrowRight, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  UserCheck, 
  Phone,
  RefreshCw,
  Search,
  HelpCircle,
  ShieldCheck
} from "lucide-react";
import SearchableTeacherSelect, { TeacherOption } from "@/components/SearchableTeacherSelect";
import { 
  getClassroomAdvisors, 
  bulkSaveClassroomAdvisors, 
  copyAdvisorsFromPreviousYear, 
  promoteAdvisorsToNextYear,
  verifyTwinStudent
} from "./actions";
import { showSuccess, showError, showConfirm } from "@/lib/alerts";

export const MAIN_LEVELS = [
  "ปวช.1",
  "ปวช.2",
  "ปวช.3",
  "ปวส.1",
  "ปวส.2",
  "ปวส.1(ม.6)",
  "ปวส.2(ม.6)"
];

interface HeadAdvisorManagementProps {
  teachers: TeacherOption[];
  users: any[];
  termConfigs: any[];
}

interface AdvisorState {
  primaryAdvisorId: string | null;
  coAdvisorId: string | null;
}

export default function HeadAdvisorManagement({
  teachers,
  users,
  termConfigs
}: HeadAdvisorManagementProps) {
  // ปี พ.ศ. ปัจจุบัน
  const currentBEYear = useMemo(() => {
    const active = termConfigs.find(t => t.isCurrent);
    if (active?.academicYear) return active.academicYear;
    return String(new Date().getFullYear() + 543);
  }, [termConfigs]);

  const [selectedYear, setSelectedYear] = useState<string>(currentBEYear);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // State เก็บการเลือกครูที่ปรึกษาของทั้ง 7 ชั้นปี
  const [assignments, setAssignments] = useState<Record<string, AdvisorState>>(() => {
    const initial: Record<string, AdvisorState> = {};
    MAIN_LEVELS.forEach(lvl => {
      initial[lvl] = { primaryAdvisorId: null, coAdvisorId: null };
    });
    return initial;
  });

  // โหลดข้อมูลการแต่งตั้งเมื่อเปลี่ยนปีการศึกษา
  const loadAdvisors = async (year: string) => {
    setIsLoading(true);
    try {
      const data = await getClassroomAdvisors(year);
      const nextState: Record<string, AdvisorState> = {};
      MAIN_LEVELS.forEach(lvl => {
        nextState[lvl] = { primaryAdvisorId: null, coAdvisorId: null };
      });
      data.forEach((item: any) => {
        if (nextState[item.level]) {
          nextState[item.level] = {
            primaryAdvisorId: item.primaryAdvisorId || null,
            coAdvisorId: item.coAdvisorId || null
          };
        }
      });
      setAssignments(nextState);
    } catch (err: any) {
      console.error(err);
      showError("โหลดข้อมูลไม่สำเร็จ", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdvisors(selectedYear);
  }, [selectedYear]);

  // สถิตินักเรียนในแต่ละระดับชั้น
  const studentCountByLevel = useMemo(() => {
    const counts: Record<string, number> = {};
    MAIN_LEVELS.forEach(lvl => { counts[lvl] = 0; });
    users.forEach(u => {
      if (u.role === "STUDENT" && !u.deletedAt && u.level && counts[u.level] !== undefined) {
        counts[u.level] = (counts[u.level] || 0) + 1;
      }
    });
    return counts;
  }, [users]);

  // รายชื่อเด็กแฝดที่รออนุมัติ (Pending Twin Verification)
  const pendingTwins = useMemo(() => {
    return users.filter(u => u.role === "STUDENT" && !u.deletedAt && u.isTwin && !u.twinVerified);
  }, [users]);

  // ตัวเลือกปีการศึกษา
  const yearOptions = useMemo(() => {
    const base = parseInt(currentBEYear, 10);
    return [
      String(base - 1),
      String(base),
      String(base + 1),
      String(base + 2)
    ];
  }, [currentBEYear]);

  // อัปเดตที่ปรึกษาของระดับชั้น
  const handleAdvisorChange = (level: string, type: "primary" | "co", teacherId: string | null) => {
    setAssignments(prev => ({
      ...prev,
      [level]: {
        ...prev[level],
        [type === "primary" ? "primaryAdvisorId" : "coAdvisorId"]: teacherId
      }
    }));
  };

  // บันทึกการแต่งตั้งทั้งหมด
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const payload = MAIN_LEVELS.map(level => ({
        level,
        primaryAdvisorId: assignments[level]?.primaryAdvisorId || null,
        coAdvisorId: assignments[level]?.coAdvisorId || null
      }));

      await bulkSaveClassroomAdvisors(selectedYear, payload);
      showSuccess("บันทึกสำเร็จ", `บันทึกการแต่งตั้งครูที่ปรึกษา ปีการศึกษา ${selectedYear} เรียบร้อยแล้ว`);
    } catch (err: any) {
      showError("บันทึกไม่สำเร็จ", err.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSaving(false);
    }
  };

  // คัดลอกจากปีก่อนหน้า
  const handleCopyFromPrevious = async () => {
    const prevYear = String(parseInt(selectedYear, 10) - 1);
    const ok = await showConfirm({
      title: `คัดลอกจากปี ${prevYear}?`,
      text: `ต้องการคัดลอกรายชื่อครูที่ปรึกษาจากปีการศึกษา ${prevYear} มาใส่ในปี ${selectedYear} ใช่หรือไม่? (ข้อมูลที่ยังไม่บันทึกจะถูกแทนที่)`,
      confirmText: "คัดลอกข้อมูล",
      icon: "question"
    });

    if (!ok) return;

    setIsSaving(true);
    try {
      const res = await copyAdvisorsFromPreviousYear(prevYear, selectedYear);
      await loadAdvisors(selectedYear);
      showSuccess("คัดลอกสำเร็จ", `คัดลอกครูที่ปรึกษาจากปี ${prevYear} จำนวน ${res.count} ชั้นปีเรียบร้อยแล้ว`);
    } catch (err: any) {
      showError("ไม่สามารถคัดลอกได้", err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // เลื่อนตามรุ่นชั้นปี
  const handlePromoteAdvisors = async () => {
    const prevYear = String(parseInt(selectedYear, 10) - 1);
    const ok = await showConfirm({
      title: `เลื่อนครูตามรุ่นชั้นปีจากปี ${prevYear}?`,
      text: `ระบบจะเลื่อนครูที่ปรึกษาตามรุ่นนักเรียนทุกระดับชั้น (ปวช.1 ➡️ ปวช.2, ปวช.2 ➡️ ปวช.3, ปวส.1 ➡️ ปวส.2, ปวส.1(ม.6) ➡️ ปวส.2(ม.6)) มาใส่ในปี ${selectedYear} ใช่หรือไม่?`,
      confirmText: "เลื่อนตามรุ่นทุกชั้นปี",
      icon: "question"
    });

    if (!ok) return;

    setIsSaving(true);
    try {
      const res = await promoteAdvisorsToNextYear(prevYear, selectedYear);
      await loadAdvisors(selectedYear);
      showSuccess("เลื่อนรุ่นสำเร็จ", `เลื่อนครูที่ปรึกษาตามรุ่นนักเรียนสำเร็จ (${res.count} ระดับชั้น)`);
    } catch (err: any) {
      showError("ไม่สามารถเลื่อนได้", err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // อนุมัติเด็กแฝดโดยตรง (ฝั่ง Head)
  const handleVerifyTwin = async (studentId: string, name: string) => {
    const ok = await showConfirm({
      title: "อนุมัติยืนยันตัวตนคู่แฝด?",
      text: `ยืนยันว่านักเรียน "${name}" เป็นคู่แฝดจริง และปลดล็อคให้เข้าใช้งานระบบได้ตามปกติใช่หรือไม่?`,
      confirmText: "อนุมัติทันที",
      icon: "question"
    });
    if (!ok) return;

    try {
      await verifyTwinStudent(studentId, true);
      showSuccess("อนุมัติเรียบร้อย", `ยืนยันตัวตนของ ${name} สำเร็จ นักเรียนสามารถเข้าใช้งานได้ทันที`);
    } catch (err: any) {
      showError("เกิดข้อผิดพลาด", err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Control Bar */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <GraduationCap className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                แต่งตั้งครูที่ปรึกษา (Advisor Management)
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                กำหนดครูที่ปรึกษาหลักและร่วมสำหรับ 7 ชั้นปีหลัก (ครู 1 คนสามารถดูแลได้หลายห้อง และแก้ไขได้ตลอดเวลา)
              </p>
            </div>
          </div>
        </div>

        {/* ตัวเลือกปีการศึกษา & ปุ่ม Action หลัก */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 p-1.5 rounded-xl border border-gray-200 dark:border-gray-600">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 pl-2">ปีการศึกษา:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="text-xs font-bold bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={isSaving || isLoading}
            onClick={handleSaveAll}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "กำลังบันทึก..." : "บันทึกการแต่งตั้ง"}
          </button>
        </div>
      </div>

      {/* แถบเครื่องมือช่วยเหลือ (คัดลอก / เลื่อนรุ่น) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-50/60 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
        <div className="flex items-center gap-2 text-xs text-indigo-900 dark:text-indigo-300 font-medium">
          <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>เครื่องมือด่วน: อำนวยความสะดวกเมื่อเริ่มปีการศึกษาใหม่</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isSaving || isLoading}
            onClick={handleCopyFromPrevious}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
          >
            <Copy className="w-3.5 h-3.5 text-indigo-500" />
            คัดลอกจากปี {parseInt(selectedYear, 10) - 1}
          </button>
          <button
            type="button"
            disabled={isSaving || isLoading}
            onClick={handlePromoteAdvisors}
            title="เลื่อนครูตามรุ่นนักเรียนทุกระดับชั้น: ปวช.1 ➡️ ปวช.2, ปวช.2 ➡️ ปวช.3, ปวส.1 ➡️ ปวส.2, ปวส.1(ม.6) ➡️ ปวส.2(ม.6)"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
          >
            <ArrowRight className="w-3.5 h-3.5 text-amber-500" />
            เลื่อนครูตามรุ่นนักเรียน (ทุกระดับชั้น)
          </button>
        </div>
      </div>

      {/* แถบแจ้งเตือนเด็กแฝดรออนุมัติ (ถ้ามี) */}
      {pendingTwins.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-500 text-white rounded-lg">
                <AlertCircle className="w-4 h-4" />
              </span>
              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                มีคำขอยืนยันตัวตนคู่แฝดรอการอนุมัติ ({pendingTwins.length} คน)
              </h4>
            </div>
            <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
              * หัวหน้าแผนกหรือครูที่ปรึกษาสามารถกดอนุมัติได้
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingTwins.map((st) => (
              <div 
                key={st.id}
                className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-between gap-3 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-gray-900 dark:text-white truncate">
                      {st.name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
                      {st.level || "-"}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 truncate">
                    รหัส: {st.username} {st.nationalId ? `• เลข ปชช: ${st.nationalId}` : ""}
                  </p>
                  {st.twinNote && (
                    <p className="text-[10px] text-purple-600 dark:text-purple-400 truncate">
                      คู่แฝด: {st.twinNote}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleVerifyTwin(st.id, st.name)}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition shrink-0 flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  อนุมัติ
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid: 7 การ์ดสำหรับ 7 ชั้นปีหลัก */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MAIN_LEVELS.map((level) => {
          const studentCount = studentCountByLevel[level] || 0;
          const currentPrimary = teachers.find(t => t.id === assignments[level]?.primaryAdvisorId);
          const currentCo = teachers.find(t => t.id === assignments[level]?.coAdvisorId);

          return (
            <div
              key={level}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-600 transition-all group"
            >
              <div>
                {/* Header การ์ด: ชั้นปี & จำนวนนักเรียน */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-700/60">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-sm">
                      {level}
                    </span>
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                      ปีการศึกษา {selectedYear}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 px-2.5 py-1 rounded-lg">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-bold">{studentCount}</span> คน
                  </div>
                </div>

                {/* Form Fields: ที่ปรึกษาหลัก & ร่วม */}
                <div className="space-y-3.5">
                  {/* ที่ปรึกษาหลัก */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                        ครูที่ปรึกษาหลัก <span className="text-rose-500">*</span>
                      </span>
                      {currentPrimary?.phone && (
                        <span className="text-[10px] text-gray-400 font-normal flex items-center gap-0.5">
                          <Phone className="w-3 h-3 text-emerald-500" />
                          {currentPrimary.phone}
                        </span>
                      )}
                    </label>
                    <SearchableTeacherSelect
                      teachers={teachers}
                      value={assignments[level]?.primaryAdvisorId || null}
                      onChange={(id) => handleAdvisorChange(level, "primary", id)}
                      placeholder="เลือกครูที่ปรึกษาหลัก..."
                      allowClear={true}
                      clearLabel="-- ยังไม่ระบุ --"
                    />
                  </div>

                  {/* ที่ปรึกษาร่วม */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1 flex items-center justify-between">
                      <span>ครูที่ปรึกษาร่วม (ถ้ามี)</span>
                      {currentCo?.phone && (
                        <span className="text-[10px] text-gray-400 font-normal flex items-center gap-0.5">
                          <Phone className="w-3 h-3 text-emerald-500" />
                          {currentCo.phone}
                        </span>
                      )}
                    </label>
                    <SearchableTeacherSelect
                      teachers={teachers}
                      value={assignments[level]?.coAdvisorId || null}
                      onChange={(id) => handleAdvisorChange(level, "co", id)}
                      placeholder="-- ไม่มีครูที่ปรึกษาร่วม --"
                      allowClear={true}
                      clearLabel="-- ไม่มีครูที่ปรึกษาร่วม --"
                    />
                  </div>
                </div>
              </div>

              {/* Footer การ์ด: สรุปสถานะการแต่งตั้ง */}
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-[11px]">
                {currentPrimary ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    แต่งตั้งแล้ว
                  </span>
                ) : (
                  <span className="text-amber-500 dark:text-amber-400 font-medium">
                    ⚠️ ยังไม่ได้ระบุครูหลัก
                  </span>
                )}

                <span className="text-gray-400 dark:text-gray-500">
                  {currentCo ? "+ ที่ปรึกษาร่วม" : "ที่ปรึกษาเดี่ยว"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Save Reminder or Bottom Bar */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          disabled={isSaving || isLoading}
          onClick={handleSaveAll}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "กำลังบันทึก..." : `บันทึกการแต่งตั้งทั้งหมด (${selectedYear})`}
        </button>
      </div>
    </div>
  );
}
