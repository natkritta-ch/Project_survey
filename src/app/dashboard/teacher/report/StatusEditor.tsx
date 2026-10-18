"use client";

import { useState } from "react";
import { updateAttendanceStatus } from "./actions";
import { showError, showToast } from "@/lib/alerts";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  HeartPulse, 
  Edit3, 
  X, 
  Check, 
  User, 
  BookOpen, 
  Calendar,
  ShieldAlert,
  AlertCircle
} from "lucide-react";

interface StatusEditorProps {
  id: string;
  initialStatus: string;
  initialRemark?: string;
  studentName?: string;
  studentCode?: string;
  subjectName?: string;
  dateStr?: string;
}

export default function StatusEditor({
  id,
  initialStatus,
  initialRemark = "",
  studentName,
  studentCode,
  subjectName,
  dateStr,
}: StatusEditorProps) {
  const [status, setStatus] = useState(initialStatus);
  const [remark, setRemark] = useState(initialRemark);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(() => {
    if (["LEAVE_PERSONAL", "LEAVE_SICK"].includes(initialStatus)) return initialStatus;
    return "LEAVE_PERSONAL";
  });
  const [inputRemark, setInputRemark] = useState(initialRemark);
  const [loading, setLoading] = useState(false);

  // กำหนดสีและไอคอนสำหรับสถานะทั้งหมด (สำหรับแสดงผล Badge)
  const ALL_STATUS_CONFIG: Record<string, { 
    label: string; 
    colorClass: string; 
    dotClass: string;
    icon: any; 
    desc: string;
  }> = {
    PRESENT: { 
      label: "มาเรียน", 
      colorClass: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
      dotClass: "bg-emerald-500",
      icon: CheckCircle2,
      desc: "เข้าเรียนปกติ (เช็คผ่านระบบสแกนใบหน้า)"
    },
    ABSENT: { 
      label: "ขาดเรียน", 
      colorClass: "text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
      dotClass: "bg-rose-500",
      icon: XCircle,
      desc: "ไม่เข้าเรียน (ไม่ได้สแกนใบหน้า / ระบบตัดขาด)"
    },
    LATE: { 
      label: "มาสาย", 
      colorClass: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
      dotClass: "bg-amber-500",
      icon: Clock,
      desc: "เข้าเรียนช้ากว่าเกณฑ์เวลา (เช็คผ่านระบบสแกนใบหน้า)"
    },
    LEAVE_PERSONAL: { 
      label: "ลากิจ", 
      colorClass: "text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
      dotClass: "bg-blue-500",
      icon: FileText,
      desc: "มีใบขออนุญาตลากิจส่วนตัว หรือหนังสือขอลา"
    },
    LEAVE_SICK: { 
      label: "ลาป่วย", 
      colorClass: "text-purple-700 bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
      dotClass: "bg-purple-500",
      icon: HeartPulse,
      desc: "มีใบรับรองแพทย์หรือแจ้งหลักฐานการรักษา"
    },
  };

  // ตัวเลือกที่อนุญาตให้แก้ไขได้ด้วยตนเอง (ป้องกันการทุจริต: ห้ามเลือก "มาเรียน" หรือ "มาสาย")
  const EDITABLE_OPTIONS: Record<string, { 
    label: string; 
    colorClass: string; 
    icon: any; 
    desc: string;
  }> = {
    LEAVE_PERSONAL: { 
      label: "ลากิจ", 
      colorClass: "text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
      icon: FileText,
      desc: "มีใบขออนุญาตลากิจส่วนตัว หรือหนังสือขอลา"
    },
    LEAVE_SICK: { 
      label: "ลาป่วย", 
      colorClass: "text-purple-700 bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
      icon: HeartPulse,
      desc: "มีใบรับรองแพทย์ หรือแจ้งหลักฐานการรักษา"
    },
    ABSENT: { 
      label: "ขาดเรียน (ยกเลิกการลา)", 
      colorClass: "text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
      icon: XCircle,
      desc: "ยกเลิกการลา / คืนสถานะขาดเรียน (กรณีบันทึกลาผิดคน)"
    },
  };

  const currentConfig = ALL_STATUS_CONFIG[status] || { 
    label: status, 
    colorClass: "text-slate-700 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    dotClass: "bg-slate-400",
    icon: CheckCircle2,
    desc: ""
  };

  const handleOpen = () => {
    if (["LEAVE_PERSONAL", "LEAVE_SICK"].includes(status)) {
      setSelectedStatus(status);
    } else {
      setSelectedStatus("LEAVE_PERSONAL");
    }
    setInputRemark(remark);
    setIsOpen(true);
  };

  const handleClose = () => {
    if (loading) return;
    setIsOpen(false);
  };

  const handleSave = async () => {
    if (selectedStatus === status && inputRemark === remark) {
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      await updateAttendanceStatus(id, selectedStatus, inputRemark);
      setStatus(selectedStatus);
      setRemark(selectedStatus === "ABSENT" ? "" : inputRemark.trim());
      showToast(
        selectedStatus === "ABSENT" 
          ? "ยกเลิกการลาและคืนสถานะขาดเรียนแล้ว" 
          : `บันทึกการลา (${ALL_STATUS_CONFIG[selectedStatus]?.label || selectedStatus}) สำเร็จ`, 
        "success"
      );
      setIsOpen(false);
    } catch (err: any) {
      showError(err.message || "เกิดข้อผิดพลาดในการอัปเดตสถานะ");
    } finally {
      setLoading(false);
    }
  };

  const CurrentIcon = currentConfig.icon;

  return (
    <>
      {/* Read-Only Status Badge with Edit Trigger in Report Table */}
      <div className="inline-flex flex-col items-center justify-center">
        <div className="inline-flex items-center gap-1.5 justify-center">
          <span 
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border shadow-2xs select-none ${currentConfig.colorClass}`}
          >
            <CurrentIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{currentConfig.label}</span>
          </span>

          {/* Edit Button */}
          <button
            type="button"
            onClick={handleOpen}
            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            title="บันทึกการลา / จัดการการลา"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Display Leave Remark if available */}
        {remark && (status === "LEAVE_PERSONAL" || status === "LEAVE_SICK") && (
          <div 
            className="text-[11px] text-slate-500 dark:text-slate-400 font-medium italic mt-1 max-w-[180px] truncate cursor-help"
            title={`หลักฐาน/หมายเหตุการลา: ${remark}`}
          >
            ({remark})
          </div>
        )}
      </div>

      {/* Edit Modal (Anti-Fraud Leave Management Dialog) */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150 text-left">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    บันทึกการลาสำหรับนักเรียน
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    ปรับเปลี่ยนสถานะเป็นลากิจ / ลาป่วย พร้อมแนบหมายเหตุ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Anti-Fraud Security Notice Banner */}
            <div className="mx-4 sm:mx-5 mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 text-xs text-amber-800 dark:text-amber-300 leading-relaxed break-words">
                <span className="font-bold">นโยบายป้องกันการทุจริต:</span> สถานะ <strong>&ldquo;มาเรียน&rdquo;</strong> และ <strong>&ldquo;มาสาย&rdquo;</strong> ต้องผ่านการสแกนใบหน้าเท่านั้น ระบบนี้อนุญาตเฉพาะ <strong>การลา</strong> หรือ <strong>ยกเลิกการลา</strong>
              </div>
            </div>

            {/* Student Info Card */}
            <div className="p-4 sm:p-5 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/80 space-y-2 text-xs">
                {studentName && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" /> นักเรียน:
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {studentName} {studentCode && `(${studentCode})`}
                    </span>
                  </div>
                )}
                {subjectName && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" /> วิชา:
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {subjectName}
                    </span>
                  </div>
                )}
                {dateStr && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> วันเวลา:
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 font-mono">
                      {dateStr}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-slate-400" /> สถานะปัจจุบัน:
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${currentConfig.colorClass}`}>
                    <CurrentIcon className="w-3 h-3" />
                    {currentConfig.label}
                  </span>
                </div>
              </div>

              {/* Status Selector Options (Leave & Cancel Leave Only) */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  เลือกการบันทึกการลา
                </label>
                <div className="space-y-2">
                  {Object.entries(EDITABLE_OPTIONS).map(([key, cfg]) => {
                    const isSelected = selectedStatus === key;
                    const IconComponent = cfg.icon;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedStatus(key)}
                        disabled={loading}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-xs"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${cfg.colorClass}`}>
                            <IconComponent className="w-4 h-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                              <span>{cfg.label}</span>
                              {key === status && (
                                <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 shrink-0">
                                  สถานะเดิม
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 break-words">
                              {cfg.desc}
                            </div>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected 
                            ? "bg-indigo-600 border-indigo-600 text-white" 
                            : "border-slate-300 dark:border-slate-600"
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Leave Remark Input (Shown when choosing LEAVE_PERSONAL or LEAVE_SICK) */}
              {(selectedStatus === "LEAVE_PERSONAL" || selectedStatus === "LEAVE_SICK") && (
                <div className="pt-1 animate-in fade-in duration-150">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>หมายเหตุ / เลขที่ใบลา / เอกสารอ้างอิง</span>
                    <span className="text-[10px] text-slate-400 font-normal">มีหรือไม่มีก็ได้</span>
                  </label>
                  <input
                    type="text"
                    value={inputRemark}
                    onChange={(e) => setInputRemark(e.target.value)}
                    placeholder="เช่น ใบรับรองแพทย์ รพ.ศูนย์, ลากิจธุระครอบครัว (เลขที่ 12/69)"
                    maxLength={120}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-900 text-xs py-2.5 px-3 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    ข้อมูลนี้จะถูกบันทึกเป็นหลักฐานอ้างอิงประกอบการลา
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm hover:shadow transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {selectedStatus === "ABSENT" ? "ยืนยันยกเลิกการลา" : "ยืนยันบันทึกการลา"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
