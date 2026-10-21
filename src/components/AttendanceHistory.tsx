"use client";

import { useState } from "react";
import { Search, BookOpen, ChevronDown } from "lucide-react";

export default function AttendanceHistory({ attendances, subjects, schedules }: { attendances: any[], subjects: any[], schedules?: any[] }) {
  const [filterSubject, setFilterSubject] = useState("all");
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");
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
    // Fix #7: เปรียบเทียบ date string โดยแปลง timestamp เป็น Thai timezone ก่อน
    // new Date("2025-01-15") จะ parse เป็น UTC midnight ซึ่งต่างจาก local time +7 ชั่วโมง
    filtered = filtered.filter(r => {
      const thaiDateStr = new Date(r.timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }); // คืน YYYY-MM-DD
      return thaiDateStr === filterDate;
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
        <div className="relative">
          <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">วิชา / กิจกรรม</label>
          {isSubjectDropdownOpen && (
            <div className="fixed inset-0 z-20" onClick={() => setIsSubjectDropdownOpen(false)}></div>
          )}

          <div className="relative z-20">
            <div
              onClick={() => setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
              className={`flex items-center justify-between w-full rounded-lg border shadow-sm sm:text-sm px-3 py-2.5 cursor-pointer bg-white dark:bg-gray-900 transition-colors ${
                isSubjectDropdownOpen 
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1 truncate text-gray-900 dark:text-white font-medium">
                <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="truncate">
                  {filterSubject === "all" && `ดูทั้งหมด (${attendances.length} รายการ)`}
                  {filterSubject === "assembly" && `★ เข้าแถว / กิจกรรมรวม (${attendances.filter(r => !r.subject).length})`}
                  {filterSubject !== "all" && filterSubject !== "assembly" && (() => {
                    const s = subjects.find(x => x.id === filterSubject);
                    const count = attendances.filter(r => r.subject?.id === filterSubject).length;
                    return s ? `[${s.code}] ${s.name} (${count})` : "วิชาที่เลือก";
                  })()}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ml-2 ${isSubjectDropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            {isSubjectDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-full sm:w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto z-30 animate-in fade-in zoom-in-95">
                <div className="p-2.5 sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 z-10 shadow-sm">
                  <div className="relative">
                    <input
                      type="text"
                      value={subjectSearch}
                      onChange={e => setSubjectSearch(e.target.value)}
                      placeholder="ค้นหารหัส หรือชื่อวิชา..."
                      className="w-full pl-8 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      autoFocus
                    />
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
                  </div>
                </div>

                <div className="py-1 divide-y divide-gray-50 dark:divide-gray-700/50">
                  {/* ตัวเลือกทั่วไป */}
                  {(!subjectSearch || "ดูทั้งหมด".includes(subjectSearch.toLowerCase())) && (
                    <div
                      onClick={() => { setFilterSubject("all"); setIsSubjectDropdownOpen(false); setSubjectSearch(""); }}
                      className={`p-2.5 text-xs cursor-pointer transition-colors flex items-center justify-between hover:bg-indigo-50 dark:hover:bg-indigo-950/40 ${
                        filterSubject === "all" ? 'bg-indigo-50 text-indigo-900 font-bold dark:bg-indigo-900/60 dark:text-indigo-200' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span>ดูทั้งหมด</span>
                      <span className="text-[11px] font-bold text-gray-500">{attendances.length} รายการ</span>
                    </div>
                  )}

                  {(!subjectSearch || "เข้าแถว".includes(subjectSearch.toLowerCase()) || "กิจกรรม".includes(subjectSearch.toLowerCase())) && (
                    <div
                      onClick={() => { setFilterSubject("assembly"); setIsSubjectDropdownOpen(false); setSubjectSearch(""); }}
                      className={`p-2.5 text-xs cursor-pointer transition-colors flex items-center justify-between hover:bg-indigo-50 dark:hover:bg-indigo-950/40 ${
                        filterSubject === "assembly" ? 'bg-indigo-50 text-indigo-900 font-bold dark:bg-indigo-900/60 dark:text-indigo-200' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className="font-semibold text-amber-600 dark:text-amber-400">★ เข้าแถว / กิจกรรมรวม</span>
                      <span className="text-[11px] font-bold text-gray-500">{attendances.filter(r => !r.subject).length}</span>
                    </div>
                  )}

                  {/* แสดงวิชาตามวัน */}
                  {[1, 2, 3, 4, 5, 6, 7].map(day => {
                    const daySubjects = (groupedOptions[day] || []).filter(s => {
                      if (!subjectSearch) return true;
                      const q = subjectSearch.toLowerCase();
                      return s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || daysMap[day].toLowerCase().includes(q);
                    });
                    if (daySubjects.length === 0) return null;

                    return (
                      <div key={`day-group-${day}`}>
                        <div className="px-3 py-1 text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/40">
                          วัน{daysMap[day]}
                        </div>
                        {daySubjects.map((s: any) => {
                          const count = attendances.filter(r => r.subject?.id === s.id).length;
                          return (
                            <div
                              key={s.id}
                              onClick={() => { setFilterSubject(s.id); setIsSubjectDropdownOpen(false); setSubjectSearch(""); }}
                              className={`p-2.5 text-xs cursor-pointer transition-colors flex items-center justify-between hover:bg-indigo-50 dark:hover:bg-indigo-950/40 ${
                                filterSubject === s.id ? 'bg-indigo-50 text-indigo-900 font-bold border-l-2 border-indigo-500 dark:bg-indigo-900/60 dark:text-indigo-200' : 'text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              <div className="truncate pr-2">
                                <span className="font-semibold text-gray-900 dark:text-white mr-1.5">[{s.code}]</span>
                                <span>{s.name}</span>
                              </div>
                              <span className="text-[10px] font-bold bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded shrink-0">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  {/* แสดงวิชาอื่นๆ / ประวัติ */}
                  {(() => {
                    const filteredUnscheduled = unscheduledOptions.filter(s => {
                      if (!subjectSearch) return true;
                      const q = subjectSearch.toLowerCase();
                      return s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || (s.level && s.level.toLowerCase().includes(q));
                    });
                    if (filteredUnscheduled.length === 0) return null;

                    return (
                      <div>
                        <div className="px-3 py-1 text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 bg-gray-100/70 dark:bg-gray-800">
                          วิชาอื่นๆ / ประวัติ
                        </div>
                        {filteredUnscheduled.map((s: any) => {
                          const count = attendances.filter(r => r.subject?.id === s.id).length;
                          return (
                            <div
                              key={s.id}
                              onClick={() => { setFilterSubject(s.id); setIsSubjectDropdownOpen(false); setSubjectSearch(""); }}
                              className={`p-2.5 text-xs cursor-pointer transition-colors flex items-center justify-between hover:bg-indigo-50 dark:hover:bg-indigo-950/40 ${
                                filterSubject === s.id ? 'bg-indigo-50 text-indigo-900 font-bold border-l-2 border-indigo-500 dark:bg-indigo-900/60 dark:text-indigo-200' : 'text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              <div className="truncate pr-2">
                                <span className="font-semibold text-gray-900 dark:text-white mr-1.5">[{s.code}]</span>
                                <span>{s.name}</span>
                              </div>
                              <span className="text-[10px] font-bold bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded shrink-0">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
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
                  {new Date(record.timestamp).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
                </span>
              </div>
              <div className="self-start sm:self-auto flex flex-col sm:items-end gap-0.5">
                <span className={`inline-block px-3 py-1.5 rounded-md text-xs font-bold shadow-sm ${STATUS_MAP[record.status]?.bg || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'}`}>
                  {STATUS_MAP[record.status]?.label || record.status}
                </span>
                {(record.leaveRemark || record.remark) && (
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 italic">
                    ({record.leaveRemark || record.remark})
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
