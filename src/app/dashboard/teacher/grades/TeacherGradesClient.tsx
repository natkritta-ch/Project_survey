"use client";

import { useState, useEffect } from "react";
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Check,
  X,
  RotateCcw,
  Users,
  Download,
  Loader2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Lock,
  Unlock
} from "lucide-react";
import { showSuccess, showError, showWarning, showInfo, showConfirm, showToast } from "@/lib/alerts";

export default function TeacherGradesClient({ sessionUser }: { sessionUser: any }) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [academicYear, setAcademicYear] = useState("2569");
  const [term, setTerm] = useState("1");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showUnsubmittedModal, setShowUnsubmittedModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const [exemptingStudentId, setExemptingStudentId] = useState<string | null>(null);

  const levels = ["ปวช.1", "ปวช.2", "ปวช.3", "ปวส.1", "ปวส.2", "ปวส.1(ม.6)", "ปวส.2(ม.6)"];

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        level: filterLevel,
        academicYear,
        term,
        status: filterStatus
      });
      const res = await fetch(`/api/grades/submissions?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setSubmissions(data.submissions || []);
        setProgress(data.progress || null);
      }
    } catch (err) {
      console.error(err);
      showError("เกิดข้อผิดพลาด", "ไม่สามารถดึงข้อมูลรายการใบเกรดได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [filterLevel, filterStatus, academicYear, term]);

  const openVerifyModal = (sub: any) => {
    setSelectedSubmission(sub);
    setRejectReason(sub.rejectReason || "");
  };

  const closeVerifyModal = () => {
    setSelectedSubmission(null);
    setRejectReason("");
  };

  const handleToggleExemption = async (studentId: string, currentExempt: boolean) => {
    setExemptingStudentId(studentId);
    try {
      const res = await fetch("/api/grades/exempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          canSubmitGrades: !currentExempt
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        setProgress((prev: any) => {
          if (!prev?.unsubmittedStudents) return prev;
          return {
            ...prev,
            unsubmittedStudents: prev.unsubmittedStudents.map((st: any) =>
              st.id === studentId ? { ...st, canSubmitGrades: !currentExempt } : st
            )
          };
        });
      } else {
        showError("เกิดข้อผิดพลาด", data.error);
      }
    } catch {
      showError("เกิดข้อผิดพลาด", "ไม่สามารถเปลี่ยนสถานะได้");
    } finally {
      setExemptingStudentId(null);
    }
  };

  const handleVerify = async (action: "APPROVE" | "REJECT" | "REVOKE") => {
    if (!selectedSubmission) return;

    if (action === "REJECT" && !rejectReason.trim()) {
      return showWarning("กรุณาระบุเหตุผล", "โปรดพิมพ์เหตุผลการปฏิเสธ เพื่อให้นักเรียนเข้าใจและส่งเอกสารใหม่ได้ถูกต้อง");
    }

    if (action === "APPROVE") {
      const ok = await showConfirm({
        title: "ยืนยันการอนุมัติผลการเรียน?",
        text: `คุณกำลังจะอนุมัติใบเกรดของ ${selectedSubmission.student?.name} (GPA: ${selectedSubmission.gpa !== null ? Number(selectedSubmission.gpa).toFixed(2) : "-"}) ข้อมูลจะได้รับการรับรองทางการทันที`,
        confirmText: "อนุมัติทางการ",
        cancelText: "ยกเลิก"
      });
      if (!ok) return;
    }

    setIsVerifying(true);
    try {
      const res = await fetch("/api/grades/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: selectedSubmission.id,
          action,
          rejectReason: action === "REJECT" ? rejectReason : undefined
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        closeVerifyModal();
        fetchSubmissions();
      } else {
        showError("ดำเนินการไม่สำเร็จ", data.message);
      }
    } catch (err: any) {
      showError("เกิดข้อผิดพลาด", err.message || "ไม่สามารถดำเนินการได้");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBatchApprove = async () => {
    const pendingCount = progress?.pendingCount || 0;
    if (pendingCount === 0) {
      return showInfo("ไม่มีรายการรออนุมัติ", "ใบเกรดทั้งหมดในกลุ่มนี้ได้รับการอนุมัติเรียบร้อยแล้ว");
    }

    const ok = await showConfirm({
      title: "อนุมัติใบเกรดทั้งห้อง?",
      text: `คุณต้องการอนุมัติใบเกรดของนักเรียนที่รอการตรวจทั้งหมด ${pendingCount} คนพร้อมกัน ใช่หรือไม่? ข้อมูลรายวิชาจะวิ่งเข้าสู่ระบบทันที`,
      confirmText: `อนุมัติทั้งหมด (${pendingCount} คน)`,
      cancelText: "ยกเลิก"
    });
    if (!ok) return;

    try {
      const res = await fetch("/api/grades/batch-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: filterLevel,
          academicYear,
          term
        })
      });
      const data = await res.json();
      if (data.success) {
        showSuccess("อนุมัติสำเร็จทั้งห้อง", data.message);
        fetchSubmissions();
      } else {
        showError("เกิดข้อผิดพลาด", data.message);
      }
    } catch (e: any) {
      showError("เกิดข้อผิดพลาด", e.message);
    }
  };

  const filteredSubmissions = submissions.filter((s: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.student?.name?.toLowerCase().includes(q) ||
      s.student?.username?.toLowerCase().includes(q) ||
      s.student?.level?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* 1. Progress Bar & Class Overview */}
      {progress && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-gray-900 dark:text-white">
                  สถานะการส่งใบเกรด: {filterLevel === "all" ? "ทุกระดับชั้น" : filterLevel}
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                  ภาคเรียนที่ {term}/{academicYear}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                ส่งแล้ว <strong className="text-indigo-600 dark:text-indigo-400">{progress.submittedCount}</strong> จากทั้งหมด {progress.totalStudents} คน
                {progress.unsubmittedStudents?.length > 0 && (
                  <span className="ml-2 text-rose-500 font-medium">
                    (ค้างส่ง {progress.unsubmittedStudents.length} คน)
                  </span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {progress.unsubmittedStudents?.length > 0 && (
                <button
                  onClick={() => setShowUnsubmittedModal(true)}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 dark:text-rose-300 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-800 transition flex items-center gap-1.5 shadow-sm"
                >
                  <Users className="w-4 h-4" />
                  ดูรายชื่อคนค้างส่ง ({progress.unsubmittedStudents.length})
                </button>
              )}

              {progress.pendingCount > 0 && (
                <button
                  onClick={handleBatchApprove}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  อนุมัติทั้งห้อง ({progress.pendingCount})
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-100 dark:bg-gray-700 h-3 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${progress.totalStudents > 0 ? (progress.approvedCount / progress.totalStudents) * 100 : 0}%` }}
              title={`อนุมัติแล้ว: ${progress.approvedCount} คน`}
            />
            <div
              className="bg-amber-400 h-full transition-all duration-500"
              style={{ width: `${progress.totalStudents > 0 ? (progress.pendingCount / progress.totalStudents) * 100 : 0}%` }}
              title={`รอตรวจ: ${progress.pendingCount} คน`}
            />
            <div
              className="bg-rose-400 h-full transition-all duration-500"
              style={{ width: `${progress.totalStudents > 0 ? (progress.rejectedCount / progress.totalStudents) * 100 : 0}%` }}
              title={`ให้ส่งใหม่: ${progress.rejectedCount} คน`}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-2 gap-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                อนุมัติแล้ว ({progress.approvedCount})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                รอตรวจสอบ ({progress.pendingCount})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
                ให้ส่งใหม่ ({progress.rejectedCount})
              </span>
            </div>
            <span className="font-bold text-gray-700 dark:text-gray-300">
              ความคืบหน้าภาพรวม {progress.percent}%
            </span>
          </div>
        </div>
      )}

      {/* 2. Filters & Search Controls */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterLevel}
              onChange={e => setFilterLevel(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white font-medium"
            >
              <option value="all">ทุกระดับชั้น</option>
              {levels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white font-medium"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="SUBMITTED">⏳ รออาจารย์ตรวจ</option>
              <option value="TEACHER_APPROVED">🔹 ตรวจผ่านแล้ว (รอ Head)</option>
              <option value="APPROVED">✓ รับรองสมบูรณ์แล้ว</option>
              <option value="REJECTED">✕ ให้ส่งใหม่</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 font-medium">
            <span>เทอม:</span>
            <select
              value={term}
              onChange={e => setTerm(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-sm"
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
            <span>ปี:</span>
            <input
              type="text"
              value={academicYear}
              onChange={e => setAcademicYear(e.target.value)}
              className="w-16 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-center bg-white dark:bg-gray-700 text-sm"
            />
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="ค้นหารหัส หรือชื่อนักเรียน..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* 3. Submissions List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
          <p className="text-sm text-gray-500">กำลังโหลดรายการใบเกรด...</p>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
          <FileCheck className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="font-bold text-gray-800 dark:text-gray-200 text-base mb-1">ไม่พบรายการใบเกรดที่ตรงกับเงื่อนไข</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            ลองปรับเปลี่ยนระดับชั้น ตัวกรองสถานะ หรือปีการศึกษา
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubmissions.map((sub: any) => {
            const isApproved = sub.status === "APPROVED";
            const isTeacherApproved = sub.status === "TEACHER_APPROVED";
            const isRejected = sub.status === "REJECTED";
            const isPending = sub.status === "SUBMITTED";

            return (
              <div
                key={sub.id}
                className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-2 py-0.5 rounded-full">
                        {sub.student?.username}
                      </span>
                      <h4 className="font-bold text-base text-gray-900 dark:text-white mt-1">
                        {sub.student?.name}
                      </h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {sub.student?.level || "ไม่ระบุชั้นปี"}
                      </span>
                    </div>

                    {isApproved && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        รับรองแล้ว
                      </span>
                    )}
                    {isTeacherApproved && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        ตรวจแล้ว (รอ Head)
                      </span>
                    )}
                    {isPending && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse">
                        <Clock className="w-3.5 h-3.5" />
                        รอตรวจ
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        <XCircle className="w-3.5 h-3.5" />
                        ให้ส่งใหม่
                      </span>
                    )}
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-750 p-3 rounded-xl mb-4 text-xs space-y-1.5 border border-gray-100 dark:border-gray-700/50">
                    <div className="flex justify-between">
                      <span className="text-gray-500">ภาคเรียน:</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{sub.term}/{sub.academicYear}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">เกรดเฉลี่ย (GPA):</span>
                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">
                        {sub.gpa !== null ? Number(sub.gpa).toFixed(2) : "-"}
                      </span>
                    </div>
                    {sub.gpax !== null && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">เกรดเฉลี่ยสะสม (GPAX):</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{Number(sub.gpax).toFixed(2)}</span>
                      </div>
                    )}
                    {isApproved && sub.approvedBy && (
                      <div className="pt-1.5 border-t border-gray-200/60 dark:border-gray-700 text-[11px] text-emerald-600 dark:text-emerald-400">
                        ✓ อนุมัติโดย: {sub.approvedBy}
                      </div>
                    )}
                    {isRejected && sub.rejectReason && (
                      <div className="pt-1.5 border-t border-rose-200 text-[11px] text-rose-600 dark:text-rose-400">
                        เหตุผล: {sub.rejectReason}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => openVerifyModal(sub)}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5 ${
                    isPending
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  {isPending ? "ตรวจเอกสารแบบ Split-Screen" : "ดูเอกสาร / ปรับปรุง"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Split-Screen Verification Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-7xl h-[94vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 px-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-850">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 rounded-xl">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-gray-900 dark:text-white flex items-center gap-2">
                    ตรวจรายงานผลการศึกษา: {selectedSubmission.student?.name}
                    <span className="text-xs font-mono font-normal text-gray-500">({selectedSubmission.student?.username})</span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ชั้นปี: {selectedSubmission.student?.level || "-"} | ภาคเรียนที่ {selectedSubmission.term}/{selectedSubmission.academicYear}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedSubmission.fileData && (
                  <a
                    href={selectedSubmission.fileData}
                    download={selectedSubmission.fileName || "transcript.pdf"}
                    className="p-2 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    title="ดาวน์โหลดไฟล์ PDF"
                  >
                    <Download className="w-5 h-5" />
                  </a>
                )}
                <button
                  onClick={closeVerifyModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  <X className="w-4 h-4" /> ปิดหน้าต่าง
                </button>
              </div>
            </div>

            {/* Split Screen Content */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Left Side: Official PDF Document Viewer (60%) */}
              <div className="w-full lg:w-3/5 h-1/2 lg:h-full bg-slate-900 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-800 flex flex-col">
                <div className="p-2 px-4 bg-slate-950 text-slate-300 text-xs font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    เอกสารต้นฉบับ (PDF ทางการจาก ศธ.02/RMS)
                  </span>
                  <span className="font-mono text-[11px] text-slate-400 truncate max-w-[200px]">
                    {selectedSubmission.fileName || "StudentGradeReport.pdf"}
                  </span>
                </div>
                <div className="flex-1 w-full h-full">
                  {selectedSubmission.fileData ? (
                    <iframe
                      src={`${selectedSubmission.fileData}#toolbar=0`}
                      className="w-full h-full border-0"
                      title="Grade Verification PDF"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                      ไม่พบไฟล์ PDF
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Direct Verification Controls (40%) */}
              <div className="w-full lg:w-2/5 h-1/2 lg:h-full flex flex-col bg-white dark:bg-gray-900 overflow-y-auto">
                <div className="p-6 space-y-6 flex-1">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800">
                      <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">เกรดเฉลี่ย (GPA)</span>
                      <p className="text-2xl font-extrabold text-indigo-900 dark:text-indigo-100 mt-1">
                        {selectedSubmission.gpa !== null ? Number(selectedSubmission.gpa).toFixed(2) : "-"}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">เกรดสะสม (GPAX)</span>
                      <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">
                        {selectedSubmission.gpax !== null ? Number(selectedSubmission.gpax).toFixed(2) : "-"}
                      </p>
                    </div>
                  </div>

                  {/* Verification Info Box */}
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">รหัสนักศึกษา:</span>
                      <span className="font-mono font-bold text-gray-900 dark:text-white">{selectedSubmission.student?.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">ชื่อ-นามสกุล:</span>
                      <span className="font-bold text-gray-900 dark:text-white">{selectedSubmission.student?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">ภาคเรียน/ปี:</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedSubmission.term}/{selectedSubmission.academicYear}</span>
                    </div>
                    {selectedSubmission.totalCredits && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">หน่วยกิต:</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedSubmission.totalCredits} น.ก.</span>
                      </div>
                    )}
                  </div>

                  {/* Reject Reason input */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                      หมายเหตุ / ข้อความแจ้งเตือนนักเรียน (กรณีปฏิเสธให้ส่งใหม่):
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น แนบไฟล์ผิดภาคเรียน, เกรดไม่ตรงกับเอกสาร, เอกสารไม่ชัดเจน..."
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                </div>

                {/* Footer Action Bar */}
                <div className="p-4 px-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-850 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    {selectedSubmission.status === "APPROVED" ? (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        รับรองสมบูรณ์แล้วโดย {selectedSubmission.approvedBy || "หัวหน้าแผนก"}
                      </span>
                    ) : selectedSubmission.status === "TEACHER_APPROVED" ? (
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        ตรวจผ่านแล้วโดย {selectedSubmission.approvedBy || "อาจารย์"} (รอ Head รับรอง)
                      </span>
                    ) : selectedSubmission.status === "REJECTED" ? (
                      <span className="text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1.5">
                        <XCircle className="w-4 h-4" />
                        อยู่ในสถานะส่งใหม่
                      </span>
                    ) : (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        รออาจารย์ตรวจสอบขั้นต้น
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedSubmission.status === "APPROVED" ? (
                      <span className="text-xs text-gray-500 font-medium">ได้รับการรับรองขั้นสุดท้ายแล้ว</span>
                    ) : selectedSubmission.status === "TEACHER_APPROVED" ? (
                      <button
                        onClick={() => handleVerify("REVOKE")}
                        disabled={isVerifying}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-4 h-4" />
                        ยกเลิกการตรวจ (ปลดล็อก)
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleVerify("REJECT")}
                          disabled={isVerifying}
                          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:hover:bg-rose-900/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                        >
                          <X className="w-4 h-4" />
                          ปฏิเสธ / ให้ส่งใหม่
                        </button>
                        <button
                          onClick={() => handleVerify("APPROVE")}
                          disabled={isVerifying}
                          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                        >
                          {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          อนุมัติตรวจสอบ (ส่งต่อ Head)
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Unsubmitted Students Modal */}
      {showUnsubmittedModal && progress?.unsubmittedStudents && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-50 dark:bg-rose-900/40 text-rose-600 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 dark:text-white text-base">
                    รายชื่อนักเรียนที่ค้างส่งใบเกรด ({progress.unsubmittedStudents.length} คน)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ภาคเรียนที่ {term}/{academicYear}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUnsubmittedModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl">
              {progress.unsubmittedStudents.map((st: any, idx: number) => (
                <div key={st.id} className="p-3 flex items-center justify-between text-xs hover:bg-gray-50 dark:hover:bg-gray-750 transition gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-gray-400 w-6 shrink-0">{idx + 1}.</span>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 dark:text-white truncate">{st.name}</p>
                      <p className="font-mono text-[11px] text-gray-500">{st.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {st.level || "-"}
                    </span>
                    <button
                      onClick={() => handleToggleExemption(st.id, !!st.canSubmitGrades)}
                      disabled={exemptingStudentId === st.id}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                        st.canSubmitGrades
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
                      }`}
                      title={st.canSubmitGrades ? "ปลดล็อกเช็คชื่อแล้ว (คลิกเพื่อระงับ)" : "คลิกเพื่อปลดล็อกให้เช็คชื่อได้"}
                    >
                      {exemptingStudentId === st.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : st.canSubmitGrades ? (
                        <>
                          <Unlock className="w-3 h-3 text-emerald-600" />
                          <span>ปลดล็อกแล้ว</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3 text-amber-600" />
                          <span>ปลดล็อกชั่วคราว</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowUnsubmittedModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 rounded-xl text-xs font-bold transition"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
