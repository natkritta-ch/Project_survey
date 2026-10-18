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
  Calendar 
} from "lucide-react";

interface StatusEditorProps {
  id: string;
  initialStatus: string;
  studentName?: string;
  studentCode?: string;
  subjectName?: string;
  dateStr?: string;
}

export default function StatusEditor({
  id,
  initialStatus,
  studentName,
  studentCode,
  subjectName,
  dateStr,
}: StatusEditorProps) {
  const [status, setStatus] = useState(initialStatus);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  const STATUS_CONFIG: Record<string, { 
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
      desc: "เข้าเรียนปกติ ตรงเวลา"
    },
    ABSENT: { 
      label: "ขาดเรียน", 
      colorClass: "text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
      dotClass: "bg-rose-500",
      icon: XCircle,
      desc: "ไม่เข้าเรียนโดยไม่มีการแจ้ง"
    },
    LATE: { 
      label: "มาสาย", 
      colorClass: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
      dotClass: "bg-amber-500",
      icon: Clock,
      desc: "เข้าเรียนช้ากว่าเกณฑ์เวลาที่กำหนด"
    },
    LEAVE_PERSONAL: { 
      label: "ลากิจ", 
      colorClass: "text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
      dotClass: "bg-blue-500",
      icon: FileText,
      desc: "มีใบขออนุญาตลากิจส่วนตัว"
    },
    LEAVE_SICK: { 
      label: "ลาป่วย", 
      colorClass: "text-purple-700 bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
      dotClass: "bg-purple-500",
      icon: HeartPulse,
      desc: "มีใบรับรองแพทย์หรือแจ้งลาป่วย"
    },
  };

  const currentConfig = STATUS_CONFIG[status] || { 
    label: status, 
    colorClass: "text-slate-700 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    dotClass: "bg-slate-400",
    icon: CheckCircle2,
    desc: ""
  };

  const handleOpen = () => {
    setSelectedStatus(status);
    setIsOpen(true);
  };

  const handleClose = () => {
    if (loading) return;
    setIsOpen(false);
  };

  const handleSave = async () => {
    if (selectedStatus === status) {
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      await updateAttendanceStatus(id, selectedStatus);
      setStatus(selectedStatus);
      showToast(`อัปเดตสถานะเป็น "${STATUS_CONFIG[selectedStatus]?.label || selectedStatus}" สำเร็จ`, "success");
      setIsOpen(false);
    } catch (err) {
      showError("เกิดข้อผิดพลาดในการอัปเดตสถานะ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  const CurrentIcon = currentConfig.icon;

  return (
    <>
      {/* Read-Only Status Badge with Edit Trigger */}
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
          title="แก้ไขสถานะ / บันทึกการลา"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Edit Modal (Sweet / Modern Dialog) */}
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
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    แก้ไขสถานะการเข้าเรียน
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    ปรับเปลี่ยนสถานะหรือบันทึกการลาสำหรับนักเรียน
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

            {/* Student Info Card */}
            <div className="p-4 sm:p-5 space-y-4">
              {(studentName || subjectName || dateStr) && (
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
                </div>
              )}

              {/* Status Selector Options */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  เลือกสถานะใหม่
                </label>
                <div className="space-y-2">
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
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
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center border ${cfg.colorClass}`}>
                            <IconComponent className="w-4 h-4" />
                          </span>
                          <div>
                            <div className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                              {cfg.label}
                              {key === status && (
                                <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                                  สถานะปัจจุบัน
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
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
                    ยืนยันการแก้ไข
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
