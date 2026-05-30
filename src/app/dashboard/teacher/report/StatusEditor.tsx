"use client";

import { useState } from "react";
import { updateAttendanceStatus } from "./actions";

export default function StatusEditor({ id, initialStatus }: { id: string, initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  const STATUS_CONFIG: Record<string, { label: string, colorClass: string }> = {
    PRESENT: { label: "มาเรียน", colorClass: "text-green-800 bg-green-50 border-green-200" },
    ABSENT: { label: "ขาดเรียน", colorClass: "text-red-800 bg-red-50 border-red-200" },
    LATE: { label: "มาสาย", colorClass: "text-orange-800 bg-orange-50 border-orange-200" },
    LEAVE_PERSONAL: { label: "ลากิจ", colorClass: "text-blue-800 bg-blue-50 border-blue-200" },
    LEAVE_SICK: { label: "ลาป่วย", colorClass: "text-purple-800 bg-purple-50 border-purple-200" },
  };

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    setLoading(true);
    try {
      await updateAttendanceStatus(id, newStatus);
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการอัปเดตสถานะ");
      setStatus(initialStatus); // revert on failure
    } finally {
      setLoading(false);
    }
  }

  const currentConfig = STATUS_CONFIG[status] || { label: status, colorClass: "text-gray-800 bg-gray-50 border-gray-200" };

  return (
    <div className="relative inline-block w-full max-w-[120px]">
      <select 
        value={status} 
        onChange={handleChange}
        disabled={loading}
        className={`w-full appearance-none px-3 py-1.5 pr-8 text-xs font-bold rounded-md border outline-none cursor-pointer transition-colors ${currentConfig.colorClass} ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-95'}`}
      >
        <option value="PRESENT" className="font-semibold text-green-800 bg-white">มาเรียน</option>
        <option value="ABSENT" className="font-semibold text-red-800 bg-white">ขาดเรียน</option>
        <option value="LATE" className="font-semibold text-orange-800 bg-white">มาสาย</option>
        <option value="LEAVE_PERSONAL" className="font-semibold text-blue-800 bg-white">ลากิจ</option>
        <option value="LEAVE_SICK" className="font-semibold text-purple-800 bg-white">ลาป่วย</option>
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-current opacity-70">
        <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
      </div>
    </div>
  );
}
