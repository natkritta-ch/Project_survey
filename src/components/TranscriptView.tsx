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
  ExternalLink 
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
}

export default function TranscriptView({ 
  grades = [], 
  submissions = [],
  showPrintButton = true,
  studentName = ""
}: { 
  grades?: any[]; 
  submissions?: any[];
  showPrintButton?: boolean;
  studentName?: string;
}) {
  const [previewPdf, setPreviewPdf] = useState<{ url: string; title: string } | null>(null);

  const { termsData, gpax, totalCredits, totalSubjectsCount } = useMemo(() => {
    const termMap: Record<string, UnifiedTermData> = {};

    // 1. นำข้อมูลจาก submissions (ใบเกรดทางการที่ผ่านการอนุมัติ เช่น APPROVED หรือ TEACHER_APPROVED) มาเป็นแกนหลัก
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

      // ตรวจสอบว่ามีวิชานี้อยู่แล้วหรือไม่ ถ้ายังไม่มี ให้เพิ่มเข้าไป
      const exists = termMap[key].subjects.some(s => s.code === subjectRow.code);
      if (!exists) {
        termMap[key].subjects.push(subjectRow);
      }
    });

    // 3. เรียงลำดับเทอมจากใหม่สุดไปเก่าสุด
    const sortedTermKeys = Object.keys(termMap).sort((a, b) => b.localeCompare(a));

    let globalTotalPxC = 0;
    let globalTotalCredits = 0;
    let subjectCount = 0;
    let latestOfficialGpax: number | null = null;
    let latestCumulativeCredits: number | null = null;

    const termsData = sortedTermKeys.map((key, index) => {
      const d = termMap[key];

      // คำนวณ GPA ถ้าไม่ได้ระบุมาจาก submission
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

      if (index === 0) {
        if (d.gpax !== null && d.gpax !== undefined && d.gpax > 0) {
          latestOfficialGpax = d.gpax;
        }
        if (d.totalCredits > 0) {
          latestCumulativeCredits = d.totalCredits;
        }
      }

      globalTotalPxC += effectiveGpa * effectiveCredits;
      globalTotalCredits += effectiveCredits;
      subjectCount += d.subjects.length;

      return {
        ...d,
        gpa: effectiveGpa,
        totalCredits: effectiveCredits
      };
    });

    // GPAX สะสม: ใช้จากเอกสารทางการล่าสุดถ้ามี หรือคำนวณถ่วงน้ำหนักรวม
    const computedGpax = globalTotalCredits > 0 ? globalTotalPxC / globalTotalCredits : 0;
    const finalGpax = latestOfficialGpax !== null ? latestOfficialGpax : computedGpax;
    const finalCredits = globalTotalCredits;

    return { 
      termsData, 
      gpax: finalGpax, 
      totalCredits: finalCredits,
      totalSubjectsCount: subjectCount
    };
  }, [grades, submissions]);

  // หากยังไม่มีข้อมูลทั้งใน grades และ submissions
  if (termsData.length === 0) {
    return (
      <div className="text-center py-12 px-4 bg-muted/30 dark:bg-card rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
          <GraduationCap className="w-8 h-8 opacity-80" />
        </div>
        <h3 className="font-bold text-lg text-foreground mb-1">ยังไม่มีข้อมูลผลการเรียนที่ถูกจัดเก็บในระบบ</h3>
        <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
          เมื่อรายงานผลการเรียนได้รับการตรวจสอบและอนุมัติรับรองโดยอาจารย์ประจำชั้นหรือหัวหน้าแผนกแล้ว ข้อมูลจะปรากฏที่หน้านี้โดยอัตโนมัติ
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${showPrintButton ? 'print-area bg-white dark:bg-card print:bg-white print:text-black' : ''}`}>
      {/* Header สำหรับโหมดสั่งพิมพ์ (Print View) */}
      <div className="hidden print:block text-center mb-6 pb-4 border-b-2 border-gray-800">
        <h1 className="text-2xl font-bold text-black mb-1">ระเบียนแสดงผลการเรียน (Transcript)</h1>
        {studentName && <p className="text-gray-800 font-bold text-base">ชื่อ-นามสกุล: {studentName}</p>}
        <p className="text-gray-600 text-xs">เอกสารนี้สร้างโดยระบบจัดเก็บข้อมูลการศึกษาและตรวจสอบเอกสารทางการ (ศธ.02 / RMS)</p>
      </div>

      {/* Action Bar */}
      {showPrintButton && (
        <div className="flex justify-between items-center no-print">
          <div className="text-sm text-muted-foreground">
            พบข้อมูลผลการเรียนที่ได้รับการรับรองทั้งหมด <span className="font-bold text-foreground">{termsData.length}</span> ภาคเรียน
          </div>
          <button 
            onClick={() => window.print()} 
            className="flex items-center gap-2 bg-primary/10 text-primary hover:bg-primary/20 px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm border border-primary/20 active:scale-95"
          >
            <Printer className="w-4 h-4" />
            พิมพ์ระเบียนผลการเรียน (Print)
          </button>
        </div>
      )}

      {/* สรุป GPAX สะสมตลอดหลักสูตร Banner */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 dark:from-indigo-950 dark:via-purple-900 dark:to-slate-900 print:bg-none print:bg-gray-100 print:border print:border-gray-300 rounded-3xl p-6 sm:p-8 text-white print:text-black shadow-xl overflow-hidden relative border border-white/10">
        <div className="absolute -right-8 -top-8 opacity-10 print:opacity-5 pointer-events-none">
          <GraduationCap className="w-64 h-64" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-indigo-100 text-xs font-semibold mb-3 print:hidden">
              <SparklesIcon className="w-3.5 h-3.5 text-yellow-300" />
              <span>ผลการเรียนที่ผ่านการตรวจสอบและรับรองทางการ</span>
            </div>
            <h3 className="text-indigo-100 print:text-gray-600 text-sm sm:text-base font-semibold mb-1 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-300 print:text-gray-800 shrink-0" />
              เกรดเฉลี่ยสะสมตลอดหลักสูตร (GPAX)
            </h3>
            <div className="flex items-baseline gap-3">
              <p className="text-5xl sm:text-6xl font-extrabold tracking-tight print:text-black drop-shadow-sm">
                {gpax.toFixed(2)}
              </p>
              <span className="text-indigo-200 print:text-gray-600 text-sm font-semibold">/ 4.00</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 bg-white/10 dark:bg-black/20 print:bg-transparent print:border-gray-400 print:text-black rounded-2xl p-4 backdrop-blur-md border border-white/15">
            <div className="p-2">
              <p className="text-indigo-200 print:text-gray-600 text-[11px] font-bold uppercase tracking-wider mb-1">หน่วยกิตสะสม</p>
              <p className="text-2xl font-extrabold print:text-black">{totalCredits.toFixed(1)}</p>
            </div>
            <div className="p-2 border-l border-white/15 print:border-gray-300">
              <p className="text-indigo-200 print:text-gray-600 text-[11px] font-bold uppercase tracking-wider mb-1">ภาคเรียนที่รับรอง</p>
              <p className="text-2xl font-extrabold print:text-black">{termsData.length}</p>
            </div>
            {totalSubjectsCount > 0 && (
              <div className="p-2 col-span-2 sm:col-span-1 border-t sm:border-t-0 sm:border-l border-white/15 print:border-gray-300">
                <p className="text-indigo-200 print:text-gray-600 text-[11px] font-bold uppercase tracking-wider mb-1">วิชาที่ประเมิน</p>
                <p className="text-2xl font-extrabold print:text-black">{totalSubjectsCount}</p>
              </div>
            )}
          </div>
        </div>

        {/* Verified Badge Bar */}
        <div className="mt-6 pt-4 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-100 print:text-gray-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>ผ่านการตรวจสอบความถูกต้องจากเอกสารรายงานผลการศึกษาฉบับจริง (ศธ.02 / RMS)</span>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start sm:self-auto bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-3 py-1 rounded-full text-[11px] font-bold backdrop-blur-sm">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Verified Official Record
          </span>
        </div>
      </div>

      {/* แยกตามภาคเรียน (Terms List) */}
      <div className="space-y-6">
        {termsData.map((t) => (
          <div 
            key={t.key} 
            className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Term Header */}
            <div className="bg-muted/40 p-4 sm:px-6 sm:py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base sm:text-lg text-foreground flex items-center gap-2">
                    ภาคเรียนที่ {t.term} / {t.year}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>หน่วยกิตประจำภาค: <strong className="text-foreground">{t.totalCredits.toFixed(1)}</strong></span>
                    {t.gpax && (
                      <>
                        <span>•</span>
                        <span>GPAX สะสม: <strong className="text-foreground">{t.gpax.toFixed(2)}</strong></span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                {/* Badge สถานะการอนุมัติ */}
                {t.status === "APPROVED" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-xl shadow-xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    รับรองสมบูรณ์ (หัวหน้าแผนก)
                  </span>
                )}
                {t.status === "TEACHER_APPROVED" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-xl shadow-xs">
                    <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    ผ่านการตรวจโดยอาจารย์ (รอหัวหน้าแผนกรับรอง)
                  </span>
                )}

                {/* Badge GPA */}
                <div className="px-4 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-sm font-extrabold shadow-xs">
                  GPA {t.gpa.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Approval Info Bar & View PDF Action */}
            <div className="px-4 sm:px-6 py-3 bg-card border-b border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs">
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
                  onClick={() => setPreviewPdf({ url: t.fileData!, title: `ใบรายงานผลการศึกษา ภาคเรียนที่ ${t.term}/${t.year}` })}
                  className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-colors border border-indigo-200 dark:border-indigo-800"
                >
                  <FileText className="w-3.5 h-3.5" />
                  ดูเอกสาร PDF ต้นฉบับ (ศธ.02/RMS)
                </button>
              )}
            </div>

            {/* Content: Subjects Table หรือ Verified Summary Card */}
            {t.subjects.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b border-border">
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
                          <td className="px-5 py-3 text-center text-muted-foreground font-semibold">
                            {sub.credit.toFixed(1)}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className={`inline-block px-3 py-1 rounded-lg font-bold text-xs border ${badgeClass}`}>
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
                    onClick={() => setPreviewPdf({ url: t.fileData!, title: `ใบรายงานผลการศึกษา ภาคเรียนที่ ${t.term}/${t.year}` })}
                    className="no-print shrink-0 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <Eye className="w-4 h-4" />
                    เปิดตรวจดูใบเกรด PDF
                  </button>
                )}
              </div>
            )}

            {/* Card Footer */}
            <div className="bg-muted/20 px-5 py-2.5 border-t border-border flex justify-between items-center text-xs text-muted-foreground font-medium">
              <span>{t.subjects.length > 0 ? `จำนวนวิชาที่บันทึก: ${t.subjects.length} วิชา` : "รับรองผลการศึกษาประจำภาค"}</span>
              <span>หน่วยกิตรวมภาคนี้: <strong className="text-foreground">{t.totalCredits.toFixed(1)}</strong></span>
            </div>
          </div>
        ))}
      </div>

      {/* PDF Preview Modal */}
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

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
      <path d="M12 2L14.39 8.26L21 9.27L16.5 14.14L17.77 21L12 17.77L6.23 21L7.5 14.14L3 9.27L9.61 8.26L12 2Z" />
    </svg>
  );
}
