"use client";

import { useState, useEffect, useRef } from "react";
import {
  Upload,
  FileCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  Loader2,
  FileText,
  Eye,
  Info,
  Calendar,
  Award,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  ShieldCheck
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
  const [gradeStatus, setGradeStatus] = useState<any>(null);

  // Upload Form Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formGpa, setFormGpa] = useState("");
  const [formGpax, setFormGpax] = useState("");
  const [formCredits, setFormCredits] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview PDF Modal (Full Screen)
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

  const fetchStudentStatus = async () => {
    try {
      const res = await fetch(`/api/grades/student-status?term=${selectedTerm}&academicYear=${selectedYear}`);
      const data = await res.json();
      if (data.success) {
        setGradeStatus(data);
      }
    } catch (e) {
      console.error("Fetch grade status error", e);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  useEffect(() => {
    fetchStudentStatus();
  }, [selectedTerm, selectedYear]);

  // หาใบเกรดของภาคเรียนที่เลือก
  const currentSubmission = submissions.find(
    s => s.term === selectedTerm && s.academicYear === selectedYear
  ) || submissions[0] || null;

  const isApproved = currentSubmission?.status === "APPROVED";
  const isSubmitted = currentSubmission?.status === "SUBMITTED";
  const isRejected = currentSubmission?.status === "REJECTED";

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return showError("ไฟล์ไม่ถูกต้อง", "ระบบรองรับเฉพาะไฟล์รายงานผลการศึกษาทางการในรูปแบบ .pdf เท่านั้น");
    }

    setSelectedFile(file);
    setShowUploadModal(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirmUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    if (!formGpa || isNaN(parseFloat(formGpa)) || parseFloat(formGpa) < 0 || parseFloat(formGpa) > 4.0) {
      return showWarning("เกรดเฉลี่ยไม่ถูกต้อง", "กรุณาระบุเกรดเฉลี่ยประจำภาค (GPA) เป็นตัวเลขระหว่าง 0.00 - 4.00");
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("term", selectedTerm);
    formData.append("academicYear", selectedYear);
    formData.append("gpa", formGpa);
    if (formGpax) formData.append("gpax", formGpax);
    if (formCredits) formData.append("totalCredits", formCredits);

    try {
      const res = await fetch("/api/grades/upload", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        await showSuccess(
          "อัปโหลดสำเร็จ!",
          `ส่งรายงานผลการเรียนภาคเรียนที่ ${selectedTerm}/${selectedYear} เรียบร้อยแล้ว (GPA: ${parseFloat(formGpa).toFixed(2)})\n\nขณะนี้อยู่ระหว่างรออาจารย์ประจำชั้นตรวจสอบและอนุมัติ`
        );
        setShowUploadModal(false);
        setSelectedFile(null);
        setFormGpa("");
        setFormGpax("");
        setFormCredits("");
        fetchSubmissions();
        fetchStudentStatus();
      } else {
        showError("ไม่สามารถอัปโหลดได้", data.message || "เกิดข้อผิดพลาดในการตรวจสอบเอกสาร");
      }
    } catch (err: any) {
      console.error(err);
      showError("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่ออัปโหลดไฟล์ได้");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* แจ้งเตือนสถานะการระงับสิทธิ์ / เลยกำหนดส่ง (Grace Period Alert Banner) */}
      {gradeStatus?.status === "SUSPENDED" && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 shadow-md flex items-start gap-3.5 animate-in fade-in slide-in-from-top-2">
          <ShieldAlert className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5 animate-bounce" />
          <div className="flex-1">
            <h4 className="font-extrabold text-base text-rose-900 dark:text-rose-200">
              ⛔ บัญชีถูกระงับสิทธิ์การเช็คชื่อเข้าเรียนชั่วคราว
            </h4>
            <p className="text-xs sm:text-sm text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
              {gradeStatus.reason || `เลยกำหนดส่งใบเกรดสำหรับภาคเรียนที่ ${selectedTerm}/${selectedYear} และพ้นระยะผ่อนผันแล้ว`}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                อัปโหลดใบเกรดเพื่อปลดล็อกสิทธิ์ทันที
              </button>
              <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                หรือติดต่ออาจารย์ประจำชั้นเพื่อขอปลดล็อกกรณีพิเศษ
              </span>
            </div>
          </div>
        </div>
      )}

      {gradeStatus?.status === "WARNING" && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 shadow-sm flex items-start gap-3 animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200">
              ⚠️ แจ้งเตือน: เลยกำหนดส่งใบรายงานผลการศึกษาแล้ว (อยู่ในระยะผ่อนผัน)
            </h4>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
              ระบบกำลังอยู่ในช่วงผ่อนผัน <strong>คงเหลืออีก {gradeStatus.graceDaysRemaining} วัน</strong> ก่อนจะระงับสิทธิ์เช็คชื่อเข้าเรียน กรุณารีบอัปโหลดใบเกรดให้เรียบร้อย
            </p>
          </div>
        </div>
      )}

      {gradeStatus?.status === "EXEMPT" && (
        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-sm text-indigo-900 dark:text-indigo-200">
              ✓ บัญชีได้รับการยกเว้นและปลดล็อกการส่งใบเกรดเป็นกรณีพิเศษ
            </h4>
            <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
              อาจารย์ประจำชั้นหรือหัวหน้าแผนกได้เปิดสิทธิ์ให้คุณสามารถเช็คชื่อเข้าเรียนได้ตามปกติ
            </p>
          </div>
        </div>
      )}

      {/* Header Selector & Upload Trigger */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <FileCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              รายงานผลการศึกษาทางการ (ศธ.02 / RMS)
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              อัปโหลดไฟล์ PDF ต้นฉบับเพื่อให้อาจารย์ประจำชั้นตรวจสอบและอนุมัติรับรองผลการเรียน
            </p>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-xl border border-gray-200 dark:border-gray-600">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">ภาคเรียน:</span>
            <select
              value={selectedTerm}
              onChange={e => setSelectedTerm(e.target.value)}
              className="text-xs font-bold border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-700 dark:text-white"
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">ปี:</span>
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
            กำลังโหลดข้อมูลผลการเรียน...
          </div>
        ) : isApproved ? (
          <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 shrink-0 mt-0.5">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-emerald-900 dark:text-emerald-200">
                  ผลการเรียนได้รับการอนุมัติรับรองทางการแล้ว ✓
                </h4>
                <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 mt-0.5">
                  อนุมัติโดย: <strong>{currentSubmission.approvedBy || "อาจารย์ประจำชั้น"}</strong> เมื่อ {new Date(currentSubmission.approvedAt || currentSubmission.updatedAt).toLocaleDateString("th-TH")}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="px-3 py-1 rounded-lg text-xs font-extrabold bg-emerald-200/60 dark:bg-emerald-800/60 text-emerald-900 dark:text-emerald-100">
                    เกรดเฉลี่ย (GPA): {currentSubmission.gpa !== null ? Number(currentSubmission.gpa).toFixed(2) : "-"}
                  </span>
                  {currentSubmission.gpax !== null && (
                    <span className="px-3 py-1 rounded-lg text-xs font-bold bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-emerald-300 dark:border-emerald-700">
                      GPAX สะสม: {Number(currentSubmission.gpax).toFixed(2)}
                    </span>
                  )}
                  {currentSubmission.totalCredits && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                      หน่วยกิต: {currentSubmission.totalCredits} น.ก.
                    </span>
                  )}
                </div>
              </div>
            </div>
            {currentSubmission.fileData && (
              <button
                onClick={() => setPreviewPdfUrl(currentSubmission.fileData)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm shrink-0"
              >
                <Eye className="w-4 h-4" />
                ดูเอกสาร PDF ฉบับเต็ม
              </button>
            )}
          </div>
        ) : isSubmitted ? (
          <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300 shrink-0 mt-0.5">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-amber-900 dark:text-amber-200">
                  ส่งเอกสารแล้ว — อยู่ระหว่างรออาจารย์ประจำชั้นตรวจสอบและอนุมัติ
                </h4>
                <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 mt-0.5">
                  ส่งเมื่อ {new Date(currentSubmission.createdAt || currentSubmission.updatedAt).toLocaleDateString("th-TH")} | ไฟล์: {currentSubmission.fileName || "StudentGradeReport.pdf"}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-200/60 dark:bg-amber-800/60 text-amber-900 dark:text-amber-100">
                    GPA ที่ระบุ: {currentSubmission.gpa !== null ? Number(currentSubmission.gpa).toFixed(2) : "-"}
                  </span>
                  {currentSubmission.gpax && (
                    <span className="px-3 py-1 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 text-amber-800 dark:text-amber-200 border border-amber-300">
                      GPAX: {Number(currentSubmission.gpax).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {currentSubmission.fileData && (
              <button
                onClick={() => setPreviewPdfUrl(currentSubmission.fileData)}
                className="px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 border border-amber-300 text-amber-800 dark:text-amber-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm shrink-0"
              >
                <Eye className="w-4 h-4" />
                ดูเอกสารที่ส่ง
              </button>
            )}
          </div>
        ) : isRejected ? (
          <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 shrink-0 mt-0.5">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-rose-900 dark:text-rose-200">
                  อาจารย์ส่งใบเกรดกลับให้แก้ไข (ไม่อนุมัติ)
                </h4>
                <p className="text-xs sm:text-sm text-rose-700 dark:text-rose-300 mt-1">
                  เหตุผลจากอาจารย์: <strong>{currentSubmission.rejectReason || "ข้อมูลไม่ถูกต้องหรือเอกสารไม่ชัดเจน กรุณาตรวจสอบและอัปโหลดใหม่"}</strong>
                </p>
              </div>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shrink-0 shadow-sm flex items-center justify-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              อัปโหลดเอกสารใหม่
            </button>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 shrink-0 mt-0.5">
              <Info className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-base text-blue-900 dark:text-blue-200">
                ยังไม่ได้ส่งใบเกรดสำหรับภาคเรียนที่ {selectedTerm}/{selectedYear}
              </h4>
              <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 mt-1">
                กรุณาดาวน์โหลดไฟล์ PDF รายงานผลการศึกษาจากระบบ ศธ.02 หรือ RMS แล้วอัปโหลดด้านล่าง พร้อมระบุเกรดเฉลี่ย (GPA) เพื่อให้อาจารย์ประจำชั้นตรวจอนุมัติ
              </p>
            </div>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Upload Dropzone (แสดงเมื่อยังไม่ได้ส่ง หรือถูกส่งกลับให้แก้ไข) */}
        {(!currentSubmission || isRejected) && (
          <div className="mt-6">
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-200 dark:border-indigo-800/60 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-2xl p-8 text-center cursor-pointer bg-indigo-50/30 dark:bg-indigo-950/10 hover:bg-indigo-50/60 transition group"
            >
              <div className="flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-sm">
                  <Upload className="w-7 h-7" />
                </div>
                <h4 className="font-extrabold text-base text-gray-900 dark:text-white mb-1">
                  คลิกเพื่อเลือกไฟล์ PDF รายงานผลการเรียน (ศธ.02 / RMS)
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                  ต้องเป็นไฟล์ PDF ทางการที่มีชื่อและรหัสนักศึกษาตรงกับบัญชีของคุณ ระบบจะตรวจสอบความถูกต้องของบุคคลก่อนส่งให้อาจารย์ตรวจรับรอง
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 shadow-xs">
                  <FileText className="w-3.5 h-3.5" />
                  รองรับเอกสารดิจิทัล PDF ทางการ
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Embedded Direct PDF Viewer (เมื่อมีไฟล์ที่ส่งแล้ว) */}
      {currentSubmission?.fileData && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                เอกสารรายงานผลการศึกษาต้นฉบับ (PDF ทางการ)
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ภาคเรียนที่ {currentSubmission.term}/{currentSubmission.academicYear} | ไฟล์: {currentSubmission.fileName || "StudentGradeReport.pdf"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewPdfUrl(currentSubmission.fileData)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                เปิดดูแบบเต็มจอ
              </button>
            </div>
          </div>

          <div className="w-full h-[600px] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-slate-900 shadow-inner">
            <iframe
              src={`${currentSubmission.fileData}#toolbar=0`}
              className="w-full h-full border-0"
              title="Student Grade PDF Viewer"
            />
          </div>
        </div>
      )}

      {/* Modal: กรอกยืนยัน GPA และส่งใบเกรด */}
      {showUploadModal && selectedFile && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-gray-200 dark:border-gray-700 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                    ยืนยันข้อมูลรายงานผลการเรียน
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ตรวจสอบเกรดเฉลี่ยจากไฟล์ PDF ก่อนส่งให้อาจารย์ตรวจ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowUploadModal(false); setSelectedFile(null); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmUpload} className="space-y-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">ไฟล์ที่เลือก:</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200 truncate max-w-[250px]">{selectedFile.name}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-gray-500 dark:text-gray-400">ภาคเรียนเป้าหมาย:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedTerm}/{selectedYear}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  เกรดเฉลี่ยประจำภาค (GPA) <span className="text-rose-500">*จำเป็น</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.00"
                  max="4.00"
                  required
                  placeholder="เช่น 2.90 หรือ 3.50"
                  value={formGpa}
                  onChange={e => setFormGpa(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-bold text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-gray-400 mt-0.5">ระบุตัวเลขเกรดเฉลี่ยตามที่ปรากฏในใบเกรด PDF</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    เกรดสะสม (GPAX) <span className="text-gray-400 font-normal">(ถ้ามี)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.00"
                    max="4.00"
                    placeholder="เช่น 2.90"
                    value={formGpax}
                    onChange={e => setFormGpax(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    หน่วยกิตรวม <span className="text-gray-400 font-normal">(ถ้ามี)</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="50"
                    placeholder="เช่น 22"
                    value={formCredits}
                    onChange={e => setFormCredits(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowUploadModal(false); setSelectedFile(null); }}
                  className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={uploading || !formGpa}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      กำลังส่งเอกสาร...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      ยืนยันและส่งใบเกรด
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full-Screen PDF Modal */}
      {previewPdfUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-850">
              <span className="font-extrabold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                เอกสารรายงานผลการศึกษาต้นฉบับ (PDF)
              </span>
              <button
                onClick={() => setPreviewPdfUrl(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 font-bold"
              >
                ✕ ปิดหน้าต่าง
              </button>
            </div>
            <div className="flex-1 bg-slate-900">
              <iframe
                src={`${previewPdfUrl}#toolbar=0`}
                className="w-full h-full border-0"
                title="PDF Document Modal"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
