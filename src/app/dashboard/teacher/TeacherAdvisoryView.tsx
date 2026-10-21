"use client";

import React, { useState, useMemo } from "react";
import { 
  GraduationCap, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Phone, 
  Printer, 
  Search, 
  ShieldAlert, 
  UserCheck, 
  Clock, 
  Copy, 
  Check, 
  ExternalLink,
  ChevronRight,
  Filter
} from "lucide-react";
import { showSuccess, showError, showConfirm, showToast } from "@/lib/alerts";
import { verifyTwinStudent } from "../head/actions";

interface StudentAdvisee {
  id: string;
  name: string;
  username: string;
  level: string;
  nickname?: string | null;
  phone?: string | null;
  parentCode?: string | null;
  nationalId?: string | null;
  profilePicture?: string | null;
  isTwin?: boolean;
  twinVerified?: boolean;
  twinNote?: string | null;
  parents: Array<{ id: string; name: string; phone?: string | null }>;
  attendanceSummary: {
    total: number;
    presents: number;
    absents: number;
    leaves: number;
    percent: number;
    isAtRisk: boolean;
  };
}

interface TeacherAdvisoryProps {
  advisoryData: {
    academicYear: string;
    assignments: Array<{
      level: string;
      isPrimary: boolean;
      coAdvisorName?: string | null;
    }>;
    students: StudentAdvisee[];
  };
}

export default function TeacherAdvisoryView({ advisoryData }: TeacherAdvisoryProps) {
  const { academicYear, assignments, students: initialStudents } = advisoryData;
  const [students, setStudents] = useState<StudentAdvisee[]>(initialStudents || []);
  const [selectedLevel, setSelectedLevel] = useState<string>(assignments[0]?.level || "ทั้งหมด");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "atRisk" | "noParent" | "twin">("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast("คัดลอกรหัสเรียบร้อยแล้ว", "success");
    setTimeout(() => {
      setCopiedCode(prev => (prev === code ? null : prev));
    }, 2000);
  };

  // นักเรียนคู่แฝดที่รออนุมัติในห้องนี้
  const pendingTwins = useMemo(() => {
    return students.filter(s => s.isTwin && !s.twinVerified);
  }, [students]);

  // กรองรายชื่อนักเรียนตามระดับชั้น, คำค้นหา และประเภทฟิลเตอร์
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // 1. กรองตามระดับชั้น
      if (selectedLevel !== "ทั้งหมด" && s.level !== selectedLevel) {
        return false;
      }
      // 2. กรองตามคำค้นหา
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchUser = s.username.toLowerCase().includes(q);
        const matchNick = (s.nickname || "").toLowerCase().includes(q);
        const matchParent = s.parents.some(p => p.name.toLowerCase().includes(q));
        if (!matchName && !matchUser && !matchNick && !matchParent) return false;
      }
      // 3. กรองตามประเภท
      if (filterType === "atRisk" && !s.attendanceSummary.isAtRisk) return false;
      if (filterType === "noParent" && s.parents.length > 0) return false;
      if (filterType === "twin" && !s.isTwin) return false;

      return true;
    });
  }, [students, selectedLevel, searchQuery, filterType]);

  // สถิติภาพรวม
  const stats = useMemo(() => {
    const targetStudents = selectedLevel === "ทั้งหมด" 
      ? students 
      : students.filter(s => s.level === selectedLevel);

    const total = targetStudents.length;
    const withParents = targetStudents.filter(s => s.parents.length > 0).length;
    const atRisk = targetStudents.filter(s => s.attendanceSummary.isAtRisk).length;
    const twins = targetStudents.filter(s => s.isTwin).length;

    return { total, withParents, noParents: total - withParents, atRisk, twins };
  }, [students, selectedLevel]);

  // อนุมัติเด็กแฝด
  const handleVerifyTwin = async (studentId: string, name: string) => {
    const ok = await showConfirm({
      title: "อนุมัติยืนยันตัวตนคู่แฝด?",
      text: `ยืนยันว่านักเรียน "${name}" เป็นคู่แฝดจริง และปลดล็อคให้เข้าใช้งานระบบได้ตามปกติใช่หรือไม่?`,
      confirmText: "อนุมัติทันที",
      icon: "question"
    });
    if (!ok) return;

    setIsVerifying(studentId);
    try {
      await verifyTwinStudent(studentId, true);
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, twinVerified: true } : s));
      showSuccess("อนุมัติเรียบร้อยแล้ว", `ยืนยันตัวตนของ ${name} สำเร็จ นักเรียนสามารถเข้าใช้งานได้ทันที`);
    } catch (err: any) {
      showError("เกิดข้อผิดพลาด", err.message);
    } finally {
      setIsVerifying(null);
    }
  };

  // พิมพ์รหัสผู้ปกครองเฉพาะห้องนี้
  const handlePrintParentCodes = () => {
    const targetStudents = selectedLevel === "ทั้งหมด"
      ? students
      : students.filter(s => s.level === selectedLevel);

    if (targetStudents.length === 0) {
      return showError("ไม่พบข้อมูล", "ไม่มีข้อมูลนักเรียนสำหรับพิมพ์รายงาน");
    }

    const currentAdvisorInfo = assignments.find(a => selectedLevel === "ทั้งหมด" || a.level === selectedLevel);
    const titleText = selectedLevel === "ทั้งหมด" ? "นักเรียนในที่ปรึกษาทั้งหมด" : `ระดับชั้น ${selectedLevel}`;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>รหัสผูกผู้ปกครอง - ${titleText}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm 15mm; }
            body { font-family: 'Sarabun', 'Segoe UI', Tahoma, sans-serif; font-size: 13px; color: #1e293b; line-height: 1.4; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #6366f1; padding-bottom: 12px; }
            .header h2 { margin: 0 0 4px 0; font-size: 18px; color: #0f172a; }
            .header p { margin: 2px 0; color: #64748b; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 7px 8px; text-align: left; vertical-align: middle; }
            th { background-color: #f1f5f9; font-weight: bold; font-size: 11px; text-align: center; color: #334155; }
            .code-badge { font-family: monospace; font-size: 13px; font-weight: bold; background: #eef2ff; color: #4338ca; padding: 2px 6px; border-radius: 4px; border: 1px solid #c7d2fe; letter-spacing: 1px; display: inline-block; }
            .status-linked { color: #15803d; font-size: 11px; font-weight: bold; }
            .status-pending { color: #d97706; font-size: 11px; }
            .footer { margin-top: 25px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>แบบรายงานรหัสเชื่อมต่อผู้ปกครอง (Parent Connection Codes)</h2>
            <p><strong>${titleText}</strong> — ปีการศึกษา ${academicYear}</p>
            <p>อาจารย์ที่ปรึกษา: ${currentAdvisorInfo?.isPrimary ? "ที่ปรึกษาหลัก" : "ที่ปรึกษาร่วม"}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 35px;">ที่</th>
                <th style="width: 100px;">รหัสนักเรียน</th>
                <th>ชื่อ - นามสกุล</th>
                <th style="width: 60px;">ชั้นปี</th>
                <th style="width: 130px; text-align: center;">รหัสผู้ปกครอง</th>
                <th style="width: 110px;">สถานะผูกบัญชี</th>
                <th style="width: 120px;">ผู้ปกครอง / เบอร์โทร</th>
              </tr>
            </thead>
            <tbody>
              ${targetStudents.map((s, idx) => `
                <tr>
                  <td style="text-align: center;">${idx + 1}</td>
                  <td style="font-family: monospace; font-weight: bold;">${s.username}</td>
                  <td>${s.name} ${s.nickname ? `(${s.nickname})` : ""}</td>
                  <td style="text-align: center;">${s.level}</td>
                  <td style="text-align: center;">
                    <span class="code-badge">${s.parentCode || "-"}</span>
                  </td>
                  <td style="text-align: center;">
                    ${s.parents.length > 0 
                      ? `<span class="status-linked">✓ ผูกแล้ว (${s.parents.length} คน)</span>` 
                      : `<span class="status-pending">⏳ ยังไม่ผูก</span>`}
                  </td>
                  <td>
                    ${s.parents.length > 0 
                      ? s.parents.map(p => `${p.name} ${p.phone ? `(${p.phone})` : ""}`).join("<br/>") 
                      : "-"}
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <div class="footer">
            <span>พิมพ์เมื่อ: ${new Date().toLocaleDateString('th-TH')}</span>
            <span>จำนวนนักเรียนทั้งหมด: ${targetStudents.length} คน</span>
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 2000);
    }, 400);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-semibold mb-2 backdrop-blur-md">
              <GraduationCap className="w-4 h-4" /> ห้องในที่ปรึกษา ปีการศึกษา {academicYear}
            </div>
            <h2 className="text-2xl font-black tracking-tight">
              ห้องเรียนในความดูแลของฉัน
            </h2>
            <p className="text-xs text-indigo-200 mt-1 max-w-xl">
              ดูแลข้อมูลนักเรียน, ประสานงานผู้ปกครอง, เฝ้าระวังความเสี่ยงการขาดเรียน และอนุมัติยืนยันตัวตนคู่แฝด
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrintParentCodes}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-900 hover:bg-indigo-50 font-bold rounded-xl text-xs shadow-md transition-all active:scale-95"
            >
              <Printer className="w-4 h-4 text-indigo-600" />
              พิมพ์รหัสผู้ปกครองเฉพาะห้องนี้
            </button>
          </div>
        </div>
      </div>

      {/* แถบสลับระดับชั้น (กรณีดูแลมากกว่า 1 ระดับชั้น) */}
      {assignments.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedLevel("ทั้งหมด")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedLevel === "ทั้งหมด"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
            }`}
          >
            ดูทั้งหมด ({students.length} คน)
          </button>
          {assignments.map(a => {
            const count = students.filter(s => s.level === a.level).length;
            return (
              <button
                key={a.level}
                type="button"
                onClick={() => setSelectedLevel(a.level)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                  selectedLevel === a.level
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                }`}
              >
                <span>{a.level}</span>
                <span className="text-[10px] opacity-80 font-normal">({count} คน)</span>
                {a.isPrimary ? (
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-white/20">หลัก</span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-400/30 text-amber-200">ร่วม</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* แถบแจ้งเตือนเด็กแฝดรออนุมัติ (Pending Twin Approval) */}
      {pendingTwins.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-amber-500 text-white rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  มีคำขอยืนยันตัวตนคู่แฝดรออาจารย์ที่ปรึกษาอนุมัติ ({pendingTwins.length} คน)
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  นักเรียนไม่สามารถสแกนใบหน้าเข้าเรียนได้จนกว่าจะได้รับการอนุมัติจากอาจารย์
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {pendingTwins.map(st => (
              <div
                key={st.id}
                className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-amber-200 dark:border-amber-800/40 shadow-sm flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-gray-900 dark:text-white truncate">{st.name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
                      {st.level}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">
                    รหัส: {st.username} {st.nationalId ? `• ปชช: ${st.nationalId}` : ""}
                  </p>
                  {st.twinNote && (
                    <p className="text-[10px] text-purple-600 dark:text-purple-400 font-medium truncate mt-0.5">
                      คู่แฝด: {st.twinNote}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isVerifying === st.id}
                  onClick={() => handleVerifyTwin(st.id, st.name)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95 shrink-0 flex items-center gap-1 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isVerifying === st.id ? "กำลังอนุมัติ..." : "อนุมัติ"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* สรุปสถิติ 4 กล่อง */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">นักเรียนทั้งหมด</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-gray-900 dark:text-white">{stats.total}</span>
            <span className="text-xs text-gray-400">คน</span>
          </div>
        </div>

        <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">ผูกผู้ปกครองแล้ว</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{stats.withParents}</span>
            <span className="text-xs text-emerald-600/70">คน</span>
          </div>
        </div>

        <div className="bg-amber-50/60 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/40 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-300 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">ยังไม่ผูกผู้ปกครอง</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-amber-700 dark:text-amber-300">{stats.noParents}</span>
            <span className="text-xs text-amber-600/70">คน</span>
          </div>
        </div>

        <div className="bg-rose-50/60 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/40 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-300 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">กลุ่มเสี่ยงขาดเรียน</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-rose-700 dark:text-rose-300">{stats.atRisk}</span>
            <span className="text-xs text-rose-600/70">คน (มส.)</span>
          </div>
        </div>
      </div>

      {/* กล่องค้นหา & Filter */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="พิมพ์ชื่อ, รหัสนักเรียน หรือชื่อผู้ปกครอง..."
            className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filterType === "all" ? "bg-indigo-600 text-white font-bold" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
            }`}
          >
            ทั้งหมด
          </button>
          <button
            type="button"
            onClick={() => setFilterType("atRisk")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
              filterType === "atRisk" ? "bg-rose-600 text-white font-bold" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            เสี่ยง มส. ({stats.atRisk})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("noParent")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
              filterType === "noParent" ? "bg-amber-600 text-white font-bold" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
            }`}
          >
            ยังไม่ผูกผู้ปกครอง ({stats.noParents})
          </button>
          {stats.twins > 0 && (
            <button
              type="button"
              onClick={() => setFilterType("twin")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                filterType === "twin" ? "bg-purple-600 text-white font-bold" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
              }`}
            >
              คู่แฝด ({stats.twins})
            </button>
          )}
        </div>
      </div>

      {/* ตารางรายชื่อนักเรียนในที่ปรึกษา */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/70 dark:bg-gray-900/40 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                <th className="py-3 px-4">นักเรียน</th>
                <th className="py-3 px-4">ระดับชั้น</th>
                <th className="py-3 px-4">ข้อมูลติดต่อ (นร./ผปค.)</th>
                <th className="py-3 px-4">รหัสผู้ปกครอง</th>
                <th className="py-3 px-4">การมาเรียนรวม</th>
                <th className="py-3 px-4 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-xs">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((st) => {
                  const isLinked = st.parents.length > 0;
                  const isRisk = st.attendanceSummary.isAtRisk;

                  return (
                    <tr 
                      key={st.id}
                      className={`hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition ${
                        isRisk ? "bg-rose-50/30 dark:bg-rose-950/10" : ""
                      }`}
                    >
                      {/* ข้อมูลนักเรียน */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden">
                            {st.profilePicture ? (
                              <img src={st.profilePicture} alt={st.name} className="w-full h-full object-cover" />
                            ) : (
                              st.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                              <span>{st.name}</span>
                              {st.nickname && (
                                <span className="text-[11px] font-normal text-gray-400">({st.nickname})</span>
                              )}
                              {st.isTwin && (
                                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                                  st.twinVerified 
                                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                                }`}>
                                  👥 {st.twinVerified ? "คู่แฝด (อนุมัติแล้ว)" : "คู่แฝด (รออนุมัติ)"}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-gray-400 font-mono">
                              รหัส: {st.username}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* ระดับชั้น */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                          {st.level}
                        </span>
                      </td>

                      {/* ข้อมูลติดต่อ */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {st.phone && (
                            <a 
                              href={`tel:${st.phone}`} 
                              className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 text-[11px]"
                            >
                              <Phone className="w-3 h-3 text-indigo-500" /> นร: {st.phone}
                            </a>
                          )}

                          {st.parents.length > 0 ? (
                            st.parents.map(p => (
                              <div key={p.id} className="text-gray-600 dark:text-gray-300 text-[11px] flex items-center gap-1">
                                <span className="text-emerald-600 font-medium">ผปค: {p.name}</span>
                                {p.phone && (
                                  <a href={`tel:${p.phone}`} className="text-emerald-700 hover:underline font-mono">
                                    ({p.phone})
                                  </a>
                                )}
                              </div>
                            ))
                          ) : (
                            <span className="text-gray-400 text-[11px] italic">ไม่มีข้อมูลผู้ปกครอง</span>
                          )}
                        </div>
                      </td>

                      {/* รหัสผู้ปกครอง (Parent Code) */}
                      <td className="py-3 px-4">
                        {st.parentCode ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-600">
                              {st.parentCode}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(st.parentCode!)}
                              className="p-1 text-gray-400 hover:text-indigo-600 rounded transition"
                              title="คัดลอกรหัส"
                            >
                              {copiedCode === st.parentCode ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* สถิติการมาเรียนรวม */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <span className={`font-bold ${isRisk ? "text-rose-600 font-black" : "text-gray-700 dark:text-gray-300"}`}>
                              {st.attendanceSummary.percent}%
                            </span>
                            <span className="text-[10px] text-gray-400">
                              มา {st.attendanceSummary.presents} • ขาด {st.attendanceSummary.absents} • ลา {st.attendanceSummary.leaves}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* สถานะ */}
                      <td className="py-3 px-4 text-center">
                        {isRisk ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                            <ShieldAlert className="w-3 h-3" /> เสี่ยง มส.
                          </span>
                        ) : isLinked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" /> ผูกผู้ปกครองแล้ว
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            <Clock className="w-3 h-3" /> รอผูกผู้ปกครอง
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    ไม่พบข้อมูลนักเรียนที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
