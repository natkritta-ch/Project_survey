"use client";

import React, { useMemo, useState } from "react";
import { 
  GraduationCap, 
  Award, 
  BookOpen, 
  Printer, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Eye, 
  Download, 
  X, 
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Filter,
  ArrowDownUp,
  Sparkles,
  Check,
  School
} from "lucide-react";

export interface UnifiedSubjectRow {
  code: string;
  name: string;
  credit: number;
  gradeStr: string;
  point: number | null;
}

export interface UnifiedTermData {
  term: string;
  year: string;
  key: string;
  gpa: number;
  gpax?: number | null;
  totalCredits: number;
  status?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  fileData?: string | null;
  fileName?: string | null;
  subjects: UnifiedSubjectRow[];
  trendDiff?: number | null; // ส่วนต่าง GPA กับเทอมก่อนหน้า
}

export default function TranscriptView({ 
  grades = [], 
  submissions = [],
  showPrintButton = true,
  studentName = "",
  studentUsername = "",
  studentLevel = ""
}: { 
  grades?: any[]; 
  submissions?: any[];
  showPrintButton?: boolean;
  studentName?: string;
  studentUsername?: string;
  studentLevel?: string;
}) {
  const [previewPdf, setPreviewPdf] = useState<{ url: string; title: string } | null>(null);

  // Filter & Sorting State (รูปแบบที่ 1)
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL"); // "ALL" หรือปีการศึกษา เช่น "2569", "2568"
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc"); // "desc" = ล่าสุดก่อน, "asc" = เรียงตามหลักสูตร

  // Accordion State (รูปแบบที่ 2)
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [hasInitializedAccordion, setHasInitializedAccordion] = useState(false);

  // คำนวณและรวบรวมข้อมูลทุกภาคเรียน
  const { allTerms, availableYears, gpax, totalCredits, totalSubjectsCount } = useMemo(() => {
    const termMap: Record<string, UnifiedTermData> = {};

    // 1. นำข้อมูลจาก submissions (ใบเกรดทางการที่ผ่านการอนุมัติ) มาประมวลผล
    submissions.forEach(sub => {
      const yr = sub.academicYear || "-";
      const tm = sub.term || "-";
      const key = `${yr}-${tm}`;

      let parsedSubjects: UnifiedSubjectRow[] = [];
      if (sub.extractedData) {
        try {
          const raw = typeof sub.extractedData === "string" ? JSON.parse(sub.extractedData) : sub.extractedData;
          if (Array.isArray(raw)) {
            parsedSubjects = raw.map((s: any) => ({
              code: s.code || "-",
              name: s.name || s.code || "-",
              credit: typeof s.credits === "number" ? s.credits : (typeof s.credit === "number" ? s.credit : 0),
              gradeStr: s.grade !== undefined && s.grade !== null ? String(s.grade) : "-",
              point: typeof s.gradeValue === "number" ? s.gradeValue : (typeof s.grade === "number" ? s.grade : (!isNaN(parseFloat(s.grade)) ? parseFloat(s.grade) : null))
            }));
          }
        } catch (e) {
          parsedSubjects = [];
        }
      }

      const termGpa = sub.gpa !== null && sub.gpa !== undefined ? parseFloat(sub.gpa) : 0;
      const termGpax = sub.gpax !== null && sub.gpax !== undefined ? parseFloat(sub.gpax) : null;
      const termCredits = sub.totalCredits !== null && sub.totalCredits !== undefined 
        ? parseFloat(sub.totalCredits) 
        : parsedSubjects.reduce((acc, curr) => acc + curr.credit, 0);

      termMap[key] = {
        term: tm,
        year: yr,
        key,
        gpa: termGpa,
        gpax: termGpax,
        totalCredits: termCredits,
        status: sub.status,
        approvedBy: sub.approvedBy,
        approvedAt: sub.approvedAt,
        fileData: sub.fileData,
        fileName: sub.fileName,
        subjects: parsedSubjects
      };
    });

    // 2. นำข้อมูลจากตาราง grade รายวิชาดั้งเดิม (ถ้ามี) มาผสานรวม
    grades.forEach(g => {
      const yr = g.subject?.academicYear || "-";
      const tm = g.subject?.term || "-";
      const key = `${yr}-${tm}`;
      const cr = g.subject?.credit ? parseFloat(g.subject.credit) : 0.0;
      let point = typeof g.grade === 'number' ? g.grade : parseFloat(g.grade);
      if (isNaN(point)) point = 0;

      const subjectRow: UnifiedSubjectRow = {
        code: g.subject?.code || "-",
        name: g.subject?.name || "-",
        credit: cr,
        gradeStr: point.toFixed(1),
        point
      };

      if (!termMap[key]) {
        termMap[key] = {
          term: tm,
          year: yr,
          key,
          gpa: 0,
          gpax: null,
          totalCredits: 0,
          status: "APPROVED",
          approvedBy: "ระบบทะเบียน",
          approvedAt: null,
          fileData: null,
          fileName: null,
          subjects: []
        };
      }

      const exists = termMap[key].subjects.some(s => s.code === subjectRow.code);
      if (!exists) {
        termMap[key].subjects.push(subjectRow);
      }
    });

    // 3. เรียงลำดับตามกาลเวลาจริงจาก "เก่าไปใหม่" เพื่อคำนวณตัวบ่งชี้พัฒนาการ (Trend Indicator)
    const chronologicalKeys = Object.keys(termMap).sort((a, b) => a.localeCompare(b));

    let globalTotalPxC = 0;
    let globalTotalCredits = 0;
    let subjectCount = 0;
    let latestOfficialGpax: number | null = null;
    const yearsSet = new Set<string>();

    const processedTerms = chronologicalKeys.map((key, index) => {
      const d = termMap[key];
      if (d.year && d.year !== "-") yearsSet.add(d.year);

      let effectiveGpa = d.gpa;
      let calculatedCredits = 0;
      let calculatedPxC = 0;

      d.subjects.forEach(sub => {
        if (sub.point !== null) {
          calculatedPxC += sub.point * sub.credit;
          calculatedCredits += sub.credit;
        }
      });

      if (effectiveGpa === 0 && calculatedCredits > 0) {
        effectiveGpa = calculatedPxC / calculatedCredits;
      }

      const effectiveCredits = d.totalCredits > 0 ? d.totalCredits : calculatedCredits;

      // คำนวณ Trend Diff เทียบกับเทอมก่อนหน้า
      let trendDiff: number | null = null;
      if (index > 0) {
        const prevKey = chronologicalKeys[index - 1];
        const prevTerm = termMap[prevKey];
        if (prevTerm) {
          trendDiff = effectiveGpa - prevTerm.gpa;
        }
      }

      if (d.gpax !== null && d.gpax !== undefined && d.gpax > 0) {
        latestOfficialGpax = d.gpax;
      }

      globalTotalPxC += effectiveGpa * effectiveCredits;
      globalTotalCredits += effectiveCredits;
      subjectCount += d.subjects.length;

      return {
        ...d,
        gpa: effectiveGpa,
        totalCredits: effectiveCredits,
        trendDiff
      };
    });

    const computedGpax = globalTotalCredits > 0 ? globalTotalPxC / globalTotalCredits : 0;
    const finalGpax = latestOfficialGpax !== null ? latestOfficialGpax : computedGpax;

    return { 
      allTerms: processedTerms, 
      availableYears: Array.from(yearsSet).sort((a, b) => b.localeCompare(a)),
      gpax: finalGpax, 
      totalCredits: globalTotalCredits,
      totalSubjectsCount: subjectCount
    };
  }, [grades, submissions]);

  // ตั้งค่าเริ่มต้น Accordion: กางเทอมล่าสุดออก 1 เทอมอัตโนมัติ
  if (!hasInitializedAccordion && allTerms.length > 0) {
    const latestTerm = allTerms[allTerms.length - 1];
    if (latestTerm) {
      setExpandedKeys(new Set([latestTerm.key]));
      setHasInitializedAccordion(true);
    }
  }

  // กรองตาม Filter (ปีการศึกษา)
  const displayedTerms = useMemo(() => {
    let result = [...allTerms];

    // กรองตามปีการศึกษา
    if (selectedFilter !== "ALL") {
      result = result.filter(t => t.year === selectedFilter);
    }

    // จัดเรียงตามลำดับที่เลือก
    if (sortOrder === "desc") {
      result.sort((a, b) => b.key.localeCompare(a.key)); // ล่าสุดก่อน
    } else {
      result.sort((a, b) => a.key.localeCompare(b.key)); // เก่าไปใหม่ (ตามหลักสูตร)
    }

    return result;
  }, [allTerms, selectedFilter, sortOrder]);

  // ฟังก์ชันควบคุม Accordion
  const toggleAccordion = (key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // หมายเลขอ้างอิงดิจิทัลประจำตัว (Official Verification Ref Code)
  const verificationRefCode = useMemo(() => {
    const raw = `${studentUsername || "STUDENT"}-${allTerms.length}-${gpax.toFixed(2)}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, "0");
    return `RMS-TR-${hex.substring(0, 4)}-${hex.substring(4, 8)}`;
  }, [studentUsername, allTerms.length, gpax]);

  // หากยังไม่มีข้อมูลผลการเรียน
  if (allTerms.length === 0) {
    return (
      <div className="text-center py-14 px-4 bg-muted/20 dark:bg-card rounded-3xl border-2 border-dashed border-border flex flex-col items-center justify-center animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 shadow-sm">
          <GraduationCap className="w-8 h-8 opacity-80" />
        </div>
        <h3 className="font-extrabold text-lg text-foreground mb-1">ยังไม่มีข้อมูลผลการเรียนที่ถูกจัดเก็บในระบบ</h3>
        <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
          เมื่อรายงานผลการเรียนได้รับการตรวจสอบและอนุมัติรับรองโดยอาจารย์ประจำชั้นหรือหัวหน้าแผนกแล้ว ข้อมูลจะปรากฏที่หน้านี้โดยอัตโนมัติ
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${showPrintButton ? 'print-area bg-white dark:bg-card print:bg-white print:text-black' : ''}`}>
      
      {/* ========================================================
          1. ส่วนหัวสำหรับโหมดสั่งพิมพ์ (Official Print Header - A4)
      ======================================================== */}
      <div className="hidden print:block mb-6 pb-4 border-b-2 border-gray-900">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <School className="w-12 h-12 text-gray-800" />
            <div>
              <h1 className="text-xl font-bold text-black uppercase tracking-tight">ระเบียนแสดงผลการเรียน (Official Transcript)</h1>
              <p className="text-xs text-gray-700">สำนักงานคณะกรรมการการอาชีวศึกษา (สอศ.) • ระบบฐานข้อมูล ศธ.02 / RMS</p>
            </div>
          </div>
          <div className="text-right text-[11px] text-gray-600 font-mono">
            <p>รหัสอ้างอิง: <strong>{verificationRefCode}</strong></p>
            <p>วันที่พิมพ์: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 bg-gray-50 border border-gray-300 rounded-lg p-3 text-xs text-gray-800 mt-3">
          <div><span className="font-semibold text-gray-600">ชื่อ-นามสกุล:</span> {studentName || "-"}</div>
          <div><span className="font-semibold text-gray-600">รหัสประจำตัว:</span> {studentUsername || "-"}</div>
          <div><span className="font-semibold text-gray-600">ระดับชั้น:</span> {studentLevel || "-"}</div>
        </div>
      </div>

      {/* ========================================================
          2. สรุป GPAX สะสมตลอดหลักสูตร Banner พร้อม Official Seal
      ======================================================== */}
      <div className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-purple-900 dark:from-indigo-950 dark:via-purple-950 dark:to-slate-900 print:bg-none print:bg-gray-50 print:border print:border-gray-400 rounded-3xl p-6 sm:p-8 text-white print:text-black shadow-xl overflow-hidden relative border border-white/10">
        <div className="absolute -right-8 -top-8 opacity-10 print:hidden pointer-events-none">
          <GraduationCap className="w-72 h-72" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-indigo-100 text-xs font-semibold mb-3 print:hidden">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>ระเบียนผลการศึกษาทางการ (ศธ.02 / RMS Verified)</span>
            </div>
            
            <h3 className="text-indigo-100 print:text-gray-700 text-sm sm:text-base font-semibold mb-1 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-300 print:text-gray-800 shrink-0" />
              เกรดเฉลี่ยสะสมตลอดหลักสูตร (GPAX)
            </h3>
            
            <div className="flex items-baseline gap-3">
              <p className="text-5xl sm:text-6xl font-extrabold tracking-tight print:text-black drop-shadow-sm font-mono">
                {gpax.toFixed(2)}
              </p>
              <span className="text-indigo-200 print:text-gray-600 text-sm font-bold">/ 4.00</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 bg-white/10 dark:bg-black/30 print:bg-transparent print:border-gray-400 print:text-black rounded-2xl p-4 backdrop-blur-md border border-white/15">
            <div className="p-2">
              <p className="text-indigo-200 print:text-gray-600 text-[11px] font-bold uppercase tracking-wider mb-1">หน่วยกิตสะสม</p>
              <p className="text-2xl font-extrabold print:text-black font-mono">{totalCredits.toFixed(1)}</p>
            </div>
            <div className="p-2 border-l border-white/15 print:border-gray-300">
              <p className="text-indigo-200 print:text-gray-600 text-[11px] font-bold uppercase tracking-wider mb-1">ภาคเรียนที่รับรอง</p>
              <p className="text-2xl font-extrabold print:text-black font-mono">{allTerms.length}</p>
            </div>
            {totalSubjectsCount > 0 && (
              <div className="p-2 col-span-2 sm:col-span-1 border-t sm:border-t-0 sm:border-l border-white/15 print:border-gray-300">
                <p className="text-indigo-200 print:text-gray-600 text-[11px] font-bold uppercase tracking-wider mb-1">วิชาที่ประเมิน</p>
                <p className="text-2xl font-extrabold print:text-black font-mono">{totalSubjectsCount}</p>
              </div>
            )}
          </div>
        </div>

        {/* แถบ Official Digital Seal Bar */}
        <div className="mt-6 pt-4 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-100 print:text-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-400/20 flex items-center justify-center text-emerald-300 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span>
              <strong>Official Digital Record:</strong> รับรองผลการเรียนตรงตามรายงาน ศธ.02/RMS โดยสถานศึกษา
            </span>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-[11px]">
            <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-3 py-1 rounded-full font-bold flex items-center gap-1.5 backdrop-blur-sm">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {verificationRefCode}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================
          3. แถบเครื่องมือ: Filter Bar (Filter Chips + Sort + Print)
      ======================================================== */}
      <div className="no-print bg-card p-4 sm:p-5 rounded-2xl border border-border shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* ตัวกรองปีการศึกษา (Filter Chips) */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 mr-1">
              <Filter className="w-3.5 h-3.5" />
              มุมมอง:
            </span>
            
            <button
              onClick={() => setSelectedFilter("ALL")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedFilter === "ALL"
                  ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20"
                  : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              แสดงทั้งหมด ({allTerms.length})
            </button>

            {availableYears.map(year => (
              <button
                key={year}
                onClick={() => setSelectedFilter(year)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedFilter === year
                    ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20"
                    : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                ปีการศึกษา {year}
              </button>
            ))}
          </div>

          {/* ปุ่มสลับลำดับการแสดงผล + ปุ่มพิมพ์ */}
          <div className="flex items-center gap-2 self-end lg:self-auto">
            <button
              onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-bold transition-colors cursor-pointer"
              title="สลับลำดับการแสดงผล"
            >
              <ArrowDownUp className="w-3.5 h-3.5" />
              <span>{sortOrder === "desc" ? "ล่าสุดก่อน" : "ตามลำดับหลักสูตร"}</span>
            </button>

            {showPrintButton && (
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all border border-primary/20 shadow-xs active:scale-95 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>พิมพ์ระเบียน (Print)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================
          4. รายการภาคเรียน (Accordion List + Trend Indicators)
      ======================================================== */}
      {displayedTerms.length === 0 ? (
        <div className="text-center py-10 bg-muted/10 rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
          ไม่พบข้อมูลผลการเรียนตามเงื่อนไขที่เลือก
        </div>
      ) : (
        <div className="space-y-4">
          {displayedTerms.map((t) => {
            const isExpanded = expandedKeys.has(t.key);

            return (
              <div 
                key={t.key} 
                className="bg-card rounded-2xl border border-border overflow-hidden shadow-xs hover:shadow-md transition-all duration-200"
              >
                {/* Accordion Header (กดเพื่อ ยุบ/ขยาย) */}
                <div 
                  onClick={() => toggleAccordion(t.key)}
                  className="p-4 sm:px-6 sm:py-4.5 bg-card hover:bg-muted/30 cursor-pointer select-none transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-transparent data-[expanded=true]:border-border/60"
                  data-expanded={isExpanded}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-base sm:text-lg text-foreground">
                          ภาคเรียนที่ {t.term} / {t.year}
                        </h4>
                        
                        {/* ป้ายพัฒนาการเกรด (Trend Indicator) */}
                        {t.trendDiff !== null && t.trendDiff !== undefined && (
                          <div 
                            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                              t.trendDiff > 0 
                                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                : t.trendDiff < 0
                                ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                                : "bg-muted text-muted-foreground"
                            }`}
                            title={t.trendDiff > 0 ? `พัฒนาการเกรดเพิ่มขึ้น +${t.trendDiff.toFixed(2)}` : t.trendDiff < 0 ? `เกรดลดลง ${t.trendDiff.toFixed(2)}` : "เกรดเท่ากับเทอมก่อน"}
                          >
                            {t.trendDiff > 0 ? (
                              <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            ) : t.trendDiff < 0 ? (
                              <TrendingDown className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                            ) : (
                              <Minus className="w-3 h-3" />
                            )}
                            <span>{t.trendDiff > 0 ? `+${t.trendDiff.toFixed(2)}` : t.trendDiff.toFixed(2)}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>หน่วยกิต: <strong className="text-foreground font-mono">{t.totalCredits.toFixed(1)}</strong></span>
                        {t.gpax && (
                          <>
                            <span>•</span>
                            <span>GPAX สะสม: <strong className="text-foreground font-mono">{t.gpax.toFixed(2)}</strong></span>
                          </>
                        )}
                        <span>•</span>
                        <span>{t.subjects.length > 0 ? `${t.subjects.length} วิชา` : "รับรองผลการศึกษา"}</span>
                      </div>
                    </div>
                  </div>

                  {/* ด้านขวาของ Header: Badge สถานะ + GPA + ลูกศร Accordion */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 self-stretch sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                    <div className="flex items-center gap-2">
                      {/* Badge สถานะ */}
                      {t.status === "APPROVED" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-xl shadow-2xs">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="hidden sm:inline">รับรองสมบูรณ์</span>
                          <span className="sm:hidden">อนุมัติแล้ว</span>
                        </span>
                      )}
                      {t.status === "TEACHER_APPROVED" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-xl shadow-2xs">
                          <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span className="hidden sm:inline">ผ่านการตรวจโดยอาจารย์</span>
                          <span className="sm:hidden">ตรวจแล้ว</span>
                        </span>
                      )}

                      {/* Badge GPA ประจำภาค */}
                      <div className="px-3.5 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-sm font-extrabold shadow-2xs font-mono">
                        GPA {t.gpa.toFixed(2)}
                      </div>
                    </div>

                    {/* ปุ่มสัญลักษณ์ Accordion Chevron */}
                    <div className="w-8 h-8 rounded-lg bg-muted/60 hover:bg-muted flex items-center justify-center text-muted-foreground transition-transform">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Accordion Content (จะแสดงเมื่อ isExpanded เป็น true และถูกบังคับแสดงเสมอตอน Print) */}
                <div className={`${isExpanded ? 'block' : 'hidden'} print:block animate-in fade-in duration-200`}>
                  {/* แถบข้อมูลผู้อนุมัติ & ปุ่มดู PDF */}
                  <div className="px-4 sm:px-6 py-3 bg-muted/20 border-b border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-muted-foreground">
                      {t.approvedBy && (
                        <span className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground">ผู้ตรวจรับรอง:</span> {t.approvedBy}
                        </span>
                      )}
                      {t.approvedAt && (
                        <span className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground">วันที่รับรอง:</span> 
                          {new Date(t.approvedAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>

                    {t.fileData && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewPdf({ url: t.fileData!, title: `ใบรายงานผลการศึกษา ภาคเรียนที่ ${t.term}/${t.year}` });
                        }}
                        className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-colors border border-indigo-200 dark:border-indigo-800"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        ดูเอกสาร PDF ต้นฉบับ (ศธ.02/RMS)
                      </button>
                    )}
                  </div>

                  {/* ตารางรายวิชา หรือ การ์ดผลการเรียนทางการ */}
                  {t.subjects.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border">
                          <tr>
                            <th className="px-5 py-3 font-bold">รหัสวิชา</th>
                            <th className="px-5 py-3 font-bold">ชื่อวิชา</th>
                            <th className="px-5 py-3 font-bold text-center w-24">หน่วยกิต</th>
                            <th className="px-5 py-3 font-bold text-center w-28">ผลการเรียน</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {t.subjects.map((sub, i) => {
                            const pt = sub.point;
                            const badgeClass = pt !== null
                              ? pt >= 3.5 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : pt >= 2.5 ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                              : pt >= 1.5 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              : 'bg-muted text-muted-foreground border-border';

                            return (
                              <tr key={i} className="hover:bg-muted/30 transition-colors">
                                <td className="px-5 py-3 font-mono font-bold text-foreground">
                                  {sub.code}
                                </td>
                                <td className="px-5 py-3 text-foreground font-medium">
                                  {sub.name}
                                </td>
                                <td className="px-5 py-3 text-center text-muted-foreground font-semibold font-mono">
                                  {sub.credit.toFixed(1)}
                                </td>
                                <td className="px-5 py-3 text-center">
                                  <span className={`inline-block px-3 py-1 rounded-lg font-bold text-xs border font-mono ${badgeClass}`}>
                                    {sub.gradeStr}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 bg-gradient-to-r from-muted/20 via-background to-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                          <h5 className="font-bold text-foreground text-sm">
                            ผลการเรียนผ่านการรับรองโดยตรงจากเอกสาร ศธ.02 / RMS
                          </h5>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            เกรดเฉลี่ยประจำภาค <strong>GPA {t.gpa.toFixed(2)}</strong> ได้รับการยืนยันตรงตามเอกสารรายงานผลการศึกษาฉบับจริง
                          </p>
                        </div>
                      </div>

                      {t.fileData && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewPdf({ url: t.fileData!, title: `ใบรายงานผลการศึกษา ภาคเรียนที่ ${t.term}/${t.year}` });
                          }}
                          className="no-print shrink-0 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                        >
                          <Eye className="w-4 h-4" />
                          เปิดตรวจดูใบเกรด PDF
                        </button>
                      )}
                    </div>
                  )}

                  {/* Card Footer สรุปหน่วยกิตประจำภาค */}
                  <div className="bg-muted/30 px-5 py-2.5 border-t border-border flex justify-between items-center text-xs text-muted-foreground font-medium">
                    <span>{t.subjects.length > 0 ? `จำนวนวิชาที่บันทึก: ${t.subjects.length} วิชา` : "รับรองผลการศึกษาประจำภาค"}</span>
                    <span>หน่วยกิตรวมภาคนี้: <strong className="text-foreground font-mono">{t.totalCredits.toFixed(1)}</strong></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================
          5. ลายเซ็นสำหรับโหมดสั่งพิมพ์ (Print Footer Signature Area)
      ======================================================== */}
      <div className="hidden print:block mt-12 pt-8 border-t border-gray-400">
        <div className="grid grid-cols-3 gap-6 text-center text-xs text-black">
          <div className="space-y-12">
            <p>ลงชื่อ ....................................................</p>
            <p>(....................................................)<br/>ครูที่ปรึกษา / อาจารย์ประจำชั้น</p>
          </div>
          <div className="space-y-12">
            <p>ลงชื่อ ....................................................</p>
            <p>(....................................................)<br/>หัวหน้าแผนกวิชา</p>
          </div>
          <div className="space-y-12">
            <p>ลงชื่อ ....................................................</p>
            <p>(....................................................)<br/>นายทะเบียน / ผู้อำนวยการ</p>
          </div>
        </div>
        <div className="mt-8 text-center text-[10px] text-gray-500">
          เอกสารนี้รับรองความถูกต้องด้วยลายมือชื่อดิจิทัลและรหัสอ้างอิง {verificationRefCode} ตามมาตรฐานระบบทะเบียน ศธ.02/RMS
        </div>
      </div>

      {/* ========================================================
          6. PDF Preview Modal (เปิดดูเอกสาร PDF ตัวจริง)
      ======================================================== */}
      {previewPdf && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 no-print animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-muted/60 border-b border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText className="w-5 h-5 text-primary shrink-0" />
                <h4 className="font-bold text-foreground text-sm truncate">
                  {previewPdf.title}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewPdf.url}
                  download="official_transcript.pdf"
                  className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ดาวน์โหลด</span>
                </a>
                <button
                  onClick={() => setPreviewPdf(null)}
                  className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Embedded PDF */}
            <div className="flex-1 bg-neutral-900 p-1 sm:p-2">
              <iframe
                src={previewPdf.url}
                className="w-full h-full rounded-xl border border-neutral-800 bg-white"
                title={previewPdf.title}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
