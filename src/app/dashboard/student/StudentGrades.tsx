"use client";

import { useState, useEffect, useRef } from "react";
import {
  Upload,
  FileCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  BookOpen,
  Sparkles,
  Download,
  Loader2,
  Lock,
  ShieldCheck,
  FileText,
  RotateCcw,
  Eye,
  Info
} from "lucide-react";
import { showSuccess, showError, showWarning, showToast } from "@/lib/alerts";

export default function StudentGrades({
  subjects,
  initialGrades,
  canSubmitGrades
}: {
  subjects: any[];
  initialGrades: any[];
  canSubmitGrades: boolean;
}) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState("1");
  const [selectedYear, setSelectedYear] = useState("2569");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  const fetchSubmissions = async () => {
    try {
      const res = await fetch("/api/grades/submissions");
      const data = await res.json();
      if (data.success && data.submissions) {
        setSubmissions(data.submissions);
      }
    } catch (e) {
      console.error("Fetch submissions error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  // หาใบเกรดของภาคเรียนที่เลือก
  const currentSubmission = submissions.find(
    s => s.term === selectedTerm && s.academicYear === selectedYear
  ) || submissions[0] || null;

  const isApproved = currentSubmission?.status === "APPROVED";
  const isSubmitted = currentSubmission?.status === "SUBMITTED";
  const isRejected = currentSubmission?.status === "REJECTED";

  let extractedSubjects: any[] = [];
  if (currentSubmission?.extractedData) {
    try {
      extractedSubjects = JSON.parse(currentSubmission.extractedData);
    } catch (e) {
      extractedSubjects = [];
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return showError("ไฟล์ไม่ถูกต้อง", "ระบบรองรับเฉพาะไฟล์รายงานผลการศึกษาในรูปแบบ .pdf เท่านั้น");
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/grades/upload", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        await showSuccess(
          "อัปโหลดสำเร็จ!",
          `ระบบอ่านข้อมูลผลการเรียน ${data.submission.subjectsCount} วิชา เรียบร้อยแล้ว\nGPA: ${data.submission.gpa || "-"}\n\nขณะนี้อยู่ระหว่างรออาจารย์ประจำชั้นตรวจสอบและอนุมัติ`
        );
        fetchSubmissions();
      } else {
        showError("ไม่สามารถอัปโหลดได้", data.message || "เกิดข้อผิดพลาดในการตรวจสอบเอกสาร");
      }
    } catch (err: any) {
      console.error(err);
      showError("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่ออัปโหลดไฟล์ได้");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Selector & Upload Trigger */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <FileCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              รายงานผลการศึกษาทางการ (ศธ.02 / RMS)
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              อัปโหลดไฟล์ PDF รายงานผลการศึกษาเพื่อให้อาจารย์ประจำชั้นตรวจสอบและอนุมัติรับรองผลการเรียน
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">ภาคเรียน:</span>
            <select
              value={selectedTerm}
              onChange={e => setSelectedTerm(e.target.value)}
              className="text-xs font-bold border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-700 dark:text-white"
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
            <span className="text-xs font-semibold text-gray-500">ปี:</span>
            <input
              type="text"
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="w-16 text-xs font-bold border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-center bg-white dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* Status Alert Banner */}
        {loading ? (
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-750 flex items-center justify-center gap-2 text-xs text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
            กำลังโหลดสถานะใบเกรด...
          </div>
        ) : isApproved ? (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                  ผลการเรียนได้รับการอนุมัติรับรองทางการแล้ว
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                  อนุมัติโดย: <strong>{currentSubmission.approvedBy || "อาจารย์ประจำชั้น"}</strong> | ผลการเรียนแสดงในสมุดพกทางการ (Transcript) แล้ว
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                GPA: {currentSubmission.gpa !== null ? Number(currentSubmission.gpa).toFixed(2) : "-"}
              </span>
              {currentSubmission.fileData && (
                <button
                  onClick={() => setPreviewPdfUrl(currentSubmission.fileData)}
                  className="px-3 py-1 bg-white dark:bg-gray-800 hover:bg-gray-50 border border-emerald-300 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" />
                  ดูเอกสาร
                </button>
              )}
            </div>
          </div>
        ) : isSubmitted ? (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200">
                  ส่งเอกสารแล้ว — อยู่ระหว่างรออาจารย์ประจำชั้นตรวจสอบและอนุมัติ
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  ระบบได้สกัดข้อมูลเกรดเรียบร้อยแล้ว ({extractedSubjects.length} วิชา | GPA: {currentSubmission.gpa || "-"}) ข้อมูลถูกล็อกชั่วคราวเพื่อรอการยืนยัน
                </p>
              </div>
            </div>
            {currentSubmission.fileData && (
              <button
                onClick={() => setPreviewPdfUrl(currentSubmission.fileData)}
                className="px-3 py-1 bg-white dark:bg-gray-800 hover:bg-gray-50 border border-amber-300 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 shadow-sm"
              >
                <Eye className="w-3.5 h-3.5" />
                ดูเอกสารที่ส่ง
              </button>
            )}
          </div>
        ) : isRejected ? (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-rose-900 dark:text-rose-200">
                  อาจารย์ส่งใบเกรดกลับให้แก้ไข (ไม่อนุมัติ)
                </h4>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                  เหตุผล: <strong>{currentSubmission.rejectReason || "ข้อมูลไม่ถูกต้องหรือเอกสารไม่ชัดเจน"}</strong>
                </p>
              </div>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shrink-0 shadow-sm"
            >
              อัปโหลดเอกสารใหม่
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-blue-900 dark:text-blue-200">
                ยังไม่ได้ส่งใบเกรดสำหรับภาคเรียนที่ {selectedTerm}/{selectedYear}
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                กรุณาดาวน์โหลดไฟล์ PDF รายงานผลการศึกษาจากระบบ ศธ.02 หรือ RMS แล้วอัปโหลดด้านล่าง ระบบจะสกัดเกรดทุกวิชาให้อัตโนมัติ
              </p>
            </div>
          </div>
        )}

        {/* Upload Dropzone (แสดงเมื่อยังไม่ได้ส่ง หรือถูกส่งกลับให้แก้ไข) */}
        {(!currentSubmission || isRejected) && (
          <div className="mt-6">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-200 dark:border-indigo-800/60 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-2xl p-8 text-center cursor-pointer bg-indigo-50/30 dark:bg-indigo-950/10 hover:bg-indigo-50/60 transition group"
            >
              {uploading ? (
                <div className="flex flex-col items-center justify-center">
                  <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
                  <p className="font-bold text-sm text-gray-800 dark:text-gray-200">
                    กำลังอ่านและสกัดข้อมูลเกรดจากเอกสาร PDF...
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    ระบบกำลังตรวจสอบรหัสนักศึกษาและตารางรายวิชาอัตโนมัติ
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-sm">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h4 className="font-extrabold text-base text-gray-900 dark:text-white mb-1">
                    คลิกเพื่อเลือกไฟล์ PDF รายงานผลการเรียน (ศธ.02 / RMS)
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                    ต้องเป็นไฟล์ PDF ดั้งเดิมที่มีชื่อและรหัสนักศึกษาตรงกับบัญชีของคุณ ระบบจะอ่านเกรดทุกวิชาและ GPA เข้าสู่ระบบโดยอัตโนมัติ
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 shadow-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                    Auto-Extract 100% ไม่ต้องพิมพ์เกรดเอง
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Extracted Subjects Table */}
      {extractedSubjects.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                รายวิชาและเกรดที่สกัดได้จากเอกสาร ({extractedSubjects.length} วิชา)
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ภาคเรียนที่ {currentSubmission.term}/{currentSubmission.academicYear} | สกัดจากไฟล์ {currentSubmission.fileName || "PDF"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg border border-indigo-200 dark:border-indigo-800">
                GPA: {currentSubmission.gpa !== null ? Number(currentSubmission.gpa).toFixed(2) : "-"}
              </span>
              {currentSubmission.gpax !== null && (
                <span className="text-xs font-bold px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg">
                  GPAX: {Number(currentSubmission.gpax).toFixed(2)}
                </span>
              )}
            </div>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-inner">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gray-50 dark:bg-gray-750 text-gray-600 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="p-3">รหัสวิชา</th>
                  <th className="p-3">ชื่อรายวิชา</th>
                  <th className="p-3 text-center">ท-ป-น (หน่วยกิต)</th>
                  <th className="p-3 text-center">เกรดที่ได้</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {extractedSubjects.map((sub: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50/60 dark:hover:bg-gray-750/40 transition">
                    <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                      {sub.code}
                    </td>
                    <td className="p-3 font-medium text-gray-900 dark:text-gray-100">
                      {sub.name}
                    </td>
                    <td className="p-3 text-center text-gray-500 font-mono">
                      {sub.creditPattern || `${sub.credits} น.ก.`}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded font-extrabold text-xs ${
                        sub.grade === "4.0" || sub.grade === "4" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" :
                        sub.grade === "0" || sub.grade === "มผ." || sub.grade === "ขร." ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300" :
                        "bg-indigo-50 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300"
                      }`}>
                        {sub.grade}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Preview PDF Modal */}
      {previewPdfUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-850">
              <span className="font-bold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                เอกสารรายงานผลการศึกษาที่แนบมา
              </span>
              <button
                onClick={() => setPreviewPdfUrl(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 bg-slate-900">
              <iframe
                src={`${previewPdfUrl}#toolbar=0`}
                className="w-full h-full border-0"
                title="PDF Document"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
