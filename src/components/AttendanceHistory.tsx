"use client";

import { useState } from "react";

export default function AttendanceHistory({ attendances, subjects, schedules }: { attendances: any[], subjects: any[], schedules?: any[] }) {
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("");

  let filtered = attendances;

  if (filterSubject !== "all") {
    if (filterSubject === "assembly") {
      filtered = filtered.filter(r => !r.subject);
    } else {
      filtered = filtered.filter(r => r.subject?.id === filterSubject);
    }
  }

  if (filterStatus !== "all") {
    filtered = filtered.filter(r => r.status === filterStatus);
  }

  if (filterDate) {
    const targetDate = new Date(filterDate);
    filtered = filtered.filter(r => {
      const rDate = new Date(r.timestamp);
      return (
        rDate.getDate() === targetDate.getDate() &&
        rDate.getMonth() === targetDate.getMonth() &&
        rDate.getFullYear() === targetDate.getFullYear()
      );
    });
  }

  const STATUS_MAP: Record<string, { label: string, bg: string }> = {
    PRESENT: { label: "มาเรียน", bg: "bg-green-100 text-green-800 dark:bg-green-900 border border-green-200 dark:border-green-800 dark:text-green-200" },
    ABSENT: { label: "ขาดเรียน", bg: "bg-red-100 text-red-800 dark:bg-red-900 border border-red-200 dark:border-red-800 dark:text-red-200" },
    LATE: { label: "มาสาย", bg: "bg-orange-100 text-orange-800 dark:bg-orange-900 border border-orange-200 dark:border-orange-800 dark:text-orange-200" },
    LEAVE_PERSONAL: { label: "ลากิจ", bg: "bg-blue-100 text-blue-800 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 dark:text-blue-200" },
    LEAVE_SICK: { label: "ลาป่วย", bg: "bg-purple-100 text-purple-800 dark:bg-purple-900 border border-purple-200 dark:border-purple-800 dark:text-purple-200" },
  };

  const daysMap: Record<number, string> = {
    1: "จันทร์", 2: "อังคาร", 3: "พุธ", 4: "พฤหัสบดี", 5: "ศุกร์", 6: "เสาร์", 7: "อาทิตย์"
  };

  // Group subjects by day if schedules are provided
  const groupedOptions: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
  const unscheduledOptions: any[] = [];

  if (schedules && schedules.length > 0) {
    subjects.forEach(s => {
      const sch = schedules.find((sc: any) => sc.subjectId === s.id);
      if (sch) {
        groupedOptions[sch.dayOfWeek].push(s);
      } else {
        unscheduledOptions.push(s);
      }
    });
  } else {
    // If no schedules provided, just put them all in unscheduled
    unscheduledOptions.push(...subjects);
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-800/80 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div>
          <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">วิชา / กิจกรรม</label>
          <select
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}
            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2.5 border dark:bg-gray-900 dark:text-white dark:border-gray-600 transition"
          >
            <option value="all">ดูทั้งหมด ({attendances.length} รายการ)</option>
            <option value="assembly">★ เข้าแถว / กิจกรรมรวม ({attendances.filter(r => !r.subject).length} รายการ)</option>
            
            {[1, 2, 3, 4, 5, 6, 7].map(day => {
              const daySubjects = groupedOptions[day];
              if (daySubjects && daySubjects.length > 0) {
                return (
                  <optgroup key={`day-${day}`} label={`วัน${daysMap[day]}`} className="font-bold text-indigo-700 bg-indigo-50 dark:bg-indigo-900 dark:text-indigo-300">
                    {daySubjects.map((s: any) => {
                       const count = attendances.filter(r => r.subject?.id === s.id).length;
                       return <option key={s.id} value={s.id} className="text-gray-900 bg-white font-normal dark:bg-gray-800 dark:text-gray-200">[{s.code}] {s.name} ({count})</option>;
                    })}
                  </optgroup>
                );
              }
              return null;
            })}

            {(() => {
              if (unscheduledOptions.length === 0) return null;
              
              const oldGrouped: Record<string, any[]> = {};
              unscheduledOptions.forEach((s: any) => {
                const termStr = (s.term && s.academicYear) ? `เทอม ${s.term}/${s.academicYear}` : "";
                const label = `🗂️ ประวัติ ${s.level || "ไม่ระบุ"} ${termStr}`.trim();
                if (!oldGrouped[label]) oldGrouped[label] = [];
                oldGrouped[label].push(s);
              });

              // Sort labels alphabetically so "ปวช.1" comes before "ปวช.2"
              return Object.keys(oldGrouped).sort().map(label => (
                <optgroup key={label} label={label} className="font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800">
                  {oldGrouped[label].map((s: any) => {
                     const count = attendances.filter(r => r.subject?.id === s.id).length;
                     return <option key={s.id} value={s.id} className="text-slate-900 bg-white font-normal dark:bg-slate-900 dark:text-slate-200">[{s.code}] {s.name} ({count})</option>;
                  })}
                </optgroup>
              ));
            })()}
          </select>
        </div>

        <div>
           <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">สถานะ</label>
           <select 
             value={filterStatus}
             onChange={e => setFilterStatus(e.target.value)}
             className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2.5 border dark:bg-gray-900 dark:text-white dark:border-gray-600 transition"
           >
             <option value="all">ทุกสถานะ</option>
             <option value="PRESENT">🟢 มาเรียน</option>
             <option value="ABSENT">🔴 ขาดเรียน</option>
             <option value="LATE">🟠 มาสาย</option>
             <option value="LEAVE_PERSONAL">🔵 ลากิจ</option>
             <option value="LEAVE_SICK">🟣 ลาป่วย</option>
           </select>
        </div>

        <div>
           <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">ตัวกรองวันที่</label>
           <div className="relative max-w-[160px]">
             <input 
               type="date" 
               value={filterDate}
               onChange={e => setFilterDate(e.target.value)}
               className="block w-full min-w-0 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-[13px] sm:text-sm px-2 py-2 border dark:bg-gray-900 dark:text-white dark:border-gray-600 transition"
             />
             {filterDate && (
               <button 
                 onClick={() => setFilterDate("")}
                 className="absolute right-7 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition"
                 title="ล้างวันที่"
               >
                 <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
             )}
           </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-0 divide-y divide-gray-100 dark:divide-gray-700">
        {filtered.length === 0 ? (
          <div className="text-center text-gray-500 py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
            <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            ยังไม่มีประวัติการเข้าเรียนสำหรับตัวกรองที่เลือก
          </div>
        ) : (
          filtered.map((record: any) => (
            <div key={record.id} className="py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 px-3 -mx-3 rounded-lg transition">
              <div className="flex flex-col">
                {record.subject ? (
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-gray-900 dark:text-white">[{record.subject.code}] {record.subject.name}</span>
                    <div className="flex gap-2 text-[10px] text-gray-500 font-medium">
                      <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">กลุ่ม: {record.subject.group || "-"}</span>
                      {record.subject.room && (
                        <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800/30">ห้อง: {record.subject.room}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">★ เข้าแถว / กิจกรรมรวม</span>
                )}
                <span className="text-xs font-semibold text-gray-500 mt-1 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {new Date(record.timestamp).toLocaleString("th-TH")}
                </span>
              </div>
              <div className="self-start sm:self-auto">
                <span className={`inline-block px-3 py-1.5 rounded-md text-xs font-bold shadow-sm ${STATUS_MAP[record.status]?.bg || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'}`}>
                  {STATUS_MAP[record.status]?.label || record.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
