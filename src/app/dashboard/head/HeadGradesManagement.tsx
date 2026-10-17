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
  Calendar,
  Plus,
  Trash2,
  Edit,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ExternalLink,
  Unlock,
  Lock,
  Download,
  Info
} from "lucide-react";
import { showSuccess, showError, showWarning, showConfirm, showToast, showInfo } from "@/lib/alerts";

export default function HeadGradesManagement({ users = [] }: { users: any[] }) {
  const [subTab, setSubTab] = useState<"submissions" | "deadlines">("submissions");
  const [loading, setLoading] = useState(true);

  // Submissions State
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [academicYear, setAcademicYear] = useState("2569");
  const [term, setTerm] = useState("1");
  const [searchQuery, setSearchQuery] = useState("");

  // Split-Screen Modal
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [editGpa, setEditGpa] = useState<string>("");
  const [editGpax, setEditGpax] = useState<string>("");

  // Unsubmitted & Exemption Modal
  const [showUnsubmittedModal, setShowUnsubmittedModal] = useState(false);
  const [exemptingStudentId, setExemptingStudentId] = useState<string | null>(null);

  // Deadlines State
  const [periodConfigs, setPeriodConfigs] = useState<any[]>([]);
  const [isAddingConfig, setIsAddingConfig] = useState(false);
  const [configForm, setConfigForm] = useState({
    id: "",
    level: "ALL",
    academicYear: "2569",
    term: "1",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    graceDays: 7,
    isBlocking: true
  });

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

  const fetchPeriodConfigs = async () => {
    try {
      const res = await fetch("/api/grades/period-config");
      const data = await res.json();
      if (data.success) {
        setPeriodConfigs(data.configs || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [filterLevel, filterStatus, academicYear, term]);

  useEffect(() => {
    fetchPeriodConfigs();
  }, []);

  const openVerifyModal = (sub: any) => {
    setSelectedSubmission(sub);
    setRejectReason(sub.rejectReason || "");
    setEditGpa(sub.gpa !== null && sub.gpa !== undefined ? Number(sub.gpa).toFixed(2) : "");
    setEditGpax(sub.gpax !== null && sub.gpax !== undefined ? Number(sub.gpax).toFixed(2) : "");
  };

  const closeVerifyModal = () => {
    setSelectedSubmission(null);
    setRejectReason("");
  };

  const handleVerify = async (action: "APPROVE" | "REJECT" | "REVOKE") => {
    if (!selectedSubmission) return;

    if (action === "REJECT" && !rejectReason.trim()) {
      return showWarning("กรุณาระบุเหตุผล", "โปรดพิมพ์เหตุผลการปฏิเสธ เพื่อให้นักเรียนเข้าใจและส่งเอกสารใหม่ได้ถูกต้อง");
    }

    if (action === "APPROVE") {
      const ok = await showConfirm({
        title: "ยืนยันการอนุมัติผลการเรียน?",
        text: `คุณกำลังจะอนุมัติใบเกรดของ ${selectedSubmission.student?.name} (GPA: ${editGpa || selectedSubmission.gpa || "-"}) ข้อมูลจะได้รับการรับรองทางการทันที`,
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

  // Toggle individual student exemption (ปลดล็อกเช็คชื่อชั่วคราว)
  const handleToggleExempt = async (studentId: string, currentExempt: boolean) => {
    setExemptingStudentId(studentId);
    try {
      const res = await fetch("/api/grades/exempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          exempt: !currentExempt
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        fetchSubmissions();
      } else {
        showError("เกิดข้อผิดพลาด", data.message);
      }
    } catch (e: any) {
      showError("เกิดข้อผิดพลาด", e.message);
    } finally {
      setExemptingStudentId(null);
    }
  };

  // Save deadline config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/grades/period-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configForm)
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        setIsAddingConfig(false);
        fetchPeriodConfigs();
      } else {
        showError("เกิดข้อผิดพลาด", data.message);
      }
    } catch (e: any) {
      showError("เกิดข้อผิดพลาด", e.message);
    }
  };

  // Delete deadline config
  const handleDeleteConfig = async (id: string) => {
    const ok = await showConfirm({
      title: "ยืนยันลบกำหนดการนี้?",
      text: "คุณแน่ใจหรือไม่ที่จะลบการตั้งค่ากำหนดการส่งเกรดของระดับชั้นนี้?",
      confirmText: "ลบรายการ",
      cancelText: "ยกเลิก",
      isDanger: true
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/grades/period-config?id=${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        fetchPeriodConfigs();
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
      s.student?.username?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Sub-Tabs: ตรวจใบเกรดนักเรียน vs กำหนดระยะเวลาการยื่นเกรด */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab("submissions")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              subTab === "submissions"
                ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
            }`}
          >
            <FileCheck className="w-4 h-4" />
            ตรวจสอบใบเกรดนักเรียน
          </button>
          <button
            onClick={() => setSubTab("deadlines")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              subTab === "deadlines"
                ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
            }`}
          >
            <Calendar className="w-4 h-4" />
            กำหนดระยะเวลาการยื่นเกรดแต่ละชั้นปี
          </button>
        </div>

        {subTab === "submissions" && progress && (
          <button
            onClick={() => setShowUnsubmittedModal(true)}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Users className="w-4 h-4" />
            รายชื่อค้างส่ง ({progress.unsubmittedCount || 0} คน)
          </button>
        )}
      </div>

      {/* ================= TAB 1: SUBMISSIONS LIST ================= */}
      {subTab === "submissions" && (
        <div className="space-y-6">
          {/* Progress Overview Bar */}
          {progress && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-purple-600" />
                    สถานะการส่งใบเกรด: {filterLevel === "all" ? "ทุกระดับชั้น" : filterLevel}
                    <span className="text-xs font-normal text-gray-500">
                      (ภาคเรียนที่ {term}/{academicYear})
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    ส่งแล้ว <span className="font-bold text-gray-900 dark:text-white">{progress.submittedCount}</span> จากทั้งหมด <span className="font-bold text-gray-900 dark:text-white">{progress.totalStudents}</span> คน 
                    {progress.unsubmittedCount > 0 && (
                      <span className="text-rose-600 font-bold ml-1">
                        (ค้างส่ง {progress.unsubmittedCount} คน)
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs font-bold">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    อนุมัติแล้ว ({progress.approvedCount})
                  </span>
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    รอตรวจ ({progress.pendingCount})
                  </span>
                  <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    ให้ส่งใหม่ ({progress.rejectedCount})
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-100 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden flex">
                <div style={{ width: `${progress.approvedPct}%` }} className="bg-emerald-500 transition-all duration-500" title={`อนุมัติ ${progress.approvedPct}%`} />
                <div style={{ width: `${progress.pendingPct}%` }} className="bg-amber-500 transition-all duration-500" title={`รอตรวจ ${progress.pendingPct}%`} />
                <div style={{ width: `${progress.rejectedPct}%` }} className="bg-rose-500 transition-all duration-500" title={`ให้ส่งใหม่ ${progress.rejectedPct}%`} />
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/60 p-1.5 rounded-xl border border-gray-200 dark:border-gray-600">
                <Filter className="w-3.5 h-3.5 text-gray-500 ml-1" />
                <select
                  value={filterLevel}
                  onChange={e => setFilterLevel(e.target.value)}
                  className="bg-transparent font-bold text-gray-700 dark:text-gray-200 focus:outline-none"
                >
                  <option value="all">ทุกระดับชั้น</option>
                  {levels.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/60 p-1.5 rounded-xl border border-gray-200 dark:border-gray-600">
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="bg-transparent font-bold text-gray-700 dark:text-gray-200 focus:outline-none"
                >
                  <option value="all">ทุกสถานะ</option>
                  <option value="SUBMITTED">รอการตรวจสอบ</option>
                  <option value="APPROVED">อนุมัติแล้ว</option>
                  <option value="REJECTED">ให้ส่งใหม่</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/60 p-1.5 rounded-xl border border-gray-200 dark:border-gray-600">
                <span className="text-gray-500">เทอม:</span>
                <select
                  value={term}
                  onChange={e => setTerm(e.target.value)}
                  className="bg-transparent font-bold text-gray-700 dark:text-gray-200 focus:outline-none"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
                <span className="text-gray-500">ปี:</span>
                <input
                  type="text"
                  value={academicYear}
                  onChange={e => setAcademicYear(e.target.value)}
                  className="w-14 bg-transparent font-bold text-center text-gray-700 dark:text-gray-200 focus:outline-none"
                />
              </div>
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="ค้นหารหัส หรือชื่อนักเรียน..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Submissions Cards Grid */}
          {loading ? (
            <div className="p-12 text-center text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600 mb-2" />
              กำลังโหลดรายการใบเกรด...
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
              <FileCheck className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="font-bold text-gray-700 dark:text-gray-300">ไม่พบรายการใบเกรดตามเงื่อนไขที่เลือก</p>
              <p className="text-xs text-gray-400 mt-1">ลองเปลี่ยนระดับชั้น หรือภาคเรียน</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSubmissions.map((sub: any) => (
                <div
                  key={sub.id}
                  className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-xs border border-gray-100 dark:border-gray-700 flex flex-col justify-between hover:shadow-md transition group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-lg">
                        {sub.student?.username}
                      </span>
                      {sub.status === "APPROVED" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> อนุมัติแล้ว
                        </span>
                      ) : sub.status === "REJECTED" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" /> ให้ส่งใหม่
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3 animate-pulse" /> รอตรวจ
                        </span>
                      )}
                    </div>

                    <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">
                      {sub.student?.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      {sub.student?.level || "-"}
                    </p>

                    <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-xl space-y-1.5 text-xs border border-gray-100 dark:border-gray-700">
                      <div className="flex justify-between">
                        <span className="text-gray-500">ภาคเรียน:</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200">{sub.term}/{sub.academicYear}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">เกรดเฉลี่ย (GPA):</span>
                        <span className="font-extrabold text-purple-600 dark:text-purple-400">{sub.gpa !== null ? Number(sub.gpa).toFixed(2) : "-"}</span>
                      </div>
                      {sub.approvedBy && (
                        <div className="flex justify-between text-[11px] pt-1 border-t border-gray-200/60 dark:border-gray-600/60">
                          <span className="text-gray-400">อนุมัติโดย:</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{sub.approvedBy}</span>
                        </div>
                      )}
                      {sub.rejectReason && (
                        <div className="text-[11px] text-rose-600 pt-1 border-t border-rose-100 dark:border-rose-900/40">
                          <strong>เหตุผล:</strong> {sub.rejectReason}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => openVerifyModal(sub)}
                      className="w-full py-2 bg-gray-100 hover:bg-purple-600 text-gray-700 hover:text-white dark:bg-gray-700 dark:hover:bg-purple-600 dark:text-gray-200 dark:hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      ดูเอกสาร PDF / ตรวจสอบ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: DEADLINES CONFIG ================= */}
      {subTab === "deadlines" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  กำหนดระยะเวลาการยื่นใบเกรดแยกตามชั้นปี
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  กำหนดช่วงเวลาที่เปิดให้นักเรียนแต่ละชั้นปีส่งใบเกรด พร้อมระยะเวลาผ่อนผัน (Grace Period) และระบบระงับสิทธิ์เช็คชื่ออัตโนมัติ
                </p>
              </div>

              <button
                onClick={() => {
                  setConfigForm({
                    id: "",
                    level: "ALL",
                    academicYear: "2569",
                    term: "1",
                    startDate: new Date().toISOString().split("T")[0],
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                    graceDays: 7,
                    isBlocking: true
                  });
                  setIsAddingConfig(true);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shrink-0"
              >
                <Plus className="w-4 h-4" />
                เพิ่มกำหนดการใหม่
              </button>
            </div>

            {/* List of Configs */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-inner">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-gray-50 dark:bg-gray-750 font-bold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="p-3">ระดับชั้น</th>
                    <th className="p-3">ภาคเรียน/ปี</th>
                    <th className="p-3">ช่วงเวลาส่ง</th>
                    <th className="p-3 text-center">ระยะผ่อนผัน</th>
                    <th className="p-3 text-center">การระงับสิทธิ์</th>
                    <th className="p-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-750">
                  {periodConfigs.map((cfg: any) => (
                    <tr key={cfg.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-750/50 transition">
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                          cfg.level === "ALL" 
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" 
                            : "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                        }`}>
                          {cfg.level === "ALL" ? "🌐 ทุกระดับชั้น" : cfg.level}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-gray-800 dark:text-gray-200">
                        {cfg.term}/{cfg.academicYear}
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
                          {cfg.startDate} ถึง {cfg.endDate}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          +{cfg.graceDays || 7} วัน
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {cfg.isBlocking ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                            <Lock className="w-3.5 h-3.5" /> ระงับเมื่อเลยกำหนด
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400">เตือนอย่างเดียว</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setConfigForm(cfg);
                              setIsAddingConfig(true);
                            }}
                            className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-gray-100 rounded-lg transition"
                            title="แก้ไข"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteConfig(cfg.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="ลบ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD/EDIT DEADLINE CONFIG ================= */}
      {isAddingConfig && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700 mb-4">
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                {configForm.id ? "แก้ไขกำหนดการส่งใบเกรด" : "เพิ่มกำหนดการส่งใบเกรด"}
              </h3>
              <button
                onClick={() => setIsAddingConfig(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">ระดับชั้นเป้าหมาย</label>
                <select
                  value={configForm.level}
                  onChange={e => setConfigForm({ ...configForm, level: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-bold bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value="ALL">🌐 ทุกระดับชั้น (ค่าเริ่มต้นส่วนกลาง)</option>
                  {levels.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">ภาคเรียน</label>
                  <select
                    value={configForm.term}
                    onChange={e => setConfigForm({ ...configForm, term: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">ปีการศึกษา</label>
                  <input
                    type="text"
                    value={configForm.academicYear}
                    onChange={e => setConfigForm({ ...configForm, academicYear: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-bold bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">วันที่เริ่มเปิดรับ</label>
                  <input
                    type="date"
                    required
                    value={configForm.startDate}
                    onChange={e => setConfigForm({ ...configForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">วันสิ้นสุดกำหนดส่ง</label>
                  <input
                    type="date"
                    required
                    value={configForm.endDate}
                    onChange={e => setConfigForm({ ...configForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    ระยะเวลาผ่อนผัน (วัน)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={configForm.graceDays}
                    onChange={e => setConfigForm({ ...configForm, graceDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-bold bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={configForm.isBlocking}
                      onChange={e => setConfigForm({ ...configForm, isBlocking: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                    />
                    ระงับสิทธิ์เช็คชื่อเมื่อเลยระยะผ่อนผัน
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingConfig(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  บันทึกกำหนดการ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: SPLIT-SCREEN VERIFICATION ================= */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-7xl h-[94vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-in zoom-in-95">
            {/* Header */}
            <div className="p-3 sm:p-4 px-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-850">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
                    ตรวจรายงานผลการศึกษา: {selectedSubmission.student?.name}
                    <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                      ({selectedSubmission.student?.username})
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ชั้นปี: {selectedSubmission.student?.level || "-"} | ภาคเรียนที่ {selectedSubmission.term}/{selectedSubmission.academicYear}
                  </p>
                </div>
              </div>
              <button
                onClick={closeVerifyModal}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold"
              >
                ✕ ปิดหน้าต่าง
              </button>
            </div>

            {/* Split Screen Content */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Left Side: Official PDF Document Viewer */}
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

              {/* Right Side: Direct Verification Controls */}
              <div className="w-full lg:w-2/5 h-1/2 lg:h-full flex flex-col bg-white dark:bg-gray-900 overflow-y-auto">
                <div className="p-6 space-y-6 flex-1">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-800">
                      <span className="text-xs text-purple-600 dark:text-purple-400 font-bold">เกรดเฉลี่ย (GPA)</span>
                      <p className="text-2xl font-extrabold text-purple-900 dark:text-purple-100 mt-1">
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
                        อนุมัติแล้วโดย {selectedSubmission.approvedBy || "อาจารย์"}
                      </span>
                    ) : selectedSubmission.status === "REJECTED" ? (
                      <span className="text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1.5">
                        <XCircle className="w-4 h-4" />
                        ส่งกลับให้แก้ไข
                      </span>
                    ) : (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        รอการตรวจสอบและอนุมัติ
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedSubmission.status === "APPROVED" ? (
                      <button
                        onClick={() => handleVerify("REVOKE")}
                        disabled={isVerifying}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-4 h-4" />
                        ยกเลิกการอนุมัติ (ปลดล็อก)
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
                          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                        >
                          {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          อนุมัติ (Approve)
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

      {/* ================= MODAL: UNCOMMITTED STUDENTS & INDIVIDUAL UNLOCK ================= */}
      {showUnsubmittedModal && progress?.unsubmittedStudents && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in zoom-in-95">
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
                    ภาคเรียนที่ {term}/{academicYear} | สามารถกดปลดล็อกเช็คชื่อเป็นรายคนได้
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUnsubmittedModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl">
              {progress.unsubmittedStudents.map((st: any, idx: number) => {
                const isExempt = st.canSubmitGrades === true;
                const isProcessing = exemptingStudentId === st.id;

                return (
                  <div key={st.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-gray-50 dark:hover:bg-gray-750 transition">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-gray-400 w-6">{idx + 1}.</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900 dark:text-white text-sm">{st.name}</p>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                            {st.level || "-"}
                          </span>
                        </div>
                        <p className="font-mono text-[11px] text-gray-500">{st.username}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isExempt ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                            <Unlock className="w-3.5 h-3.5" /> ปลดล็อกพิเศษแล้ว
                          </span>
                          <button
                            onClick={() => handleToggleExempt(st.id, true)}
                            disabled={isProcessing}
                            className="px-2.5 py-1 text-[11px] font-bold text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleToggleExempt(st.id, false)}
                          disabled={isProcessing}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                        >
                          {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
                          ปลดล็อกเช็คชื่อชั่วคราว
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
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
