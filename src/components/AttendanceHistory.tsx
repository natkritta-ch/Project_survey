"use client";

import { useState, useMemo } from "react";
import { Search, BookOpen, ChevronDown, Calendar, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, AlertTriangle, ShieldCheck, X } from "lucide-react";

export default function AttendanceHistory({ attendances, subjects, schedules }: { attendances: any[], subjects: any[], schedules?: any[] }) {
  // ค่าเริ่มต้นเป็นรายสัปดาห์ (Weekly View) ตามที่ผู้ใช้กำหนด
  const [viewMode, setViewMode] = useState<"week" | "all">("week");
  const [weekOffset, setWeekOffset] = useState<number>(0); // 0 = สัปดาห์ปัจจุบัน, -1 = สัปดาห์ก่อนหน้า, +1 = สัปดาห์ถัดไป

  const [filterSubject, setFilterSubject] = useState("all");
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("");

  // คำนวณช่วงวันจันทร์ - วันอาทิตย์ ของสัปดาห์ตามเวลาประเทศไทย (Asia/Bangkok)
  const currentWeek = useMemo(() => {
    const now = new Date();
    const bkkDateStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }); // "YYYY-MM-DD"
    const [y, m, d] = bkkDateStr.split("-").map(Number);
    const baseDate = new Date(y, m - 1, d);

    // 0 = อาทิตย์, 1 = จันทร์ ... 6 = เสาร์
    const dayOfWeek = baseDate.getDay();
    // แปลงให้จันทร์เป็นจุดเริ่มต้น (จันทร์ = 0, อาทิตย์ = 6)
    const distanceToMon = (dayOfWeek + 6) % 7;

    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() - distanceToMon + (weekOffset * 7));

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const monStr = monday.toLocaleDateString("en-CA");
    const sunStr = sunday.toLocaleDateString("en-CA");

    const monFormatted = monday.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
    const sunFormatted = sunday.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });

    return {
      monStr,
      sunStr,
      monFormatted,
      sunFormatted,
      label: `${monFormatted} - ${sunFormatted}`
    };
  }, [weekOffset]);

  // ประวัติการเข้าเรียนทั้งหมดของสัปดาห์นี้ (ใช้สำหรับคำนวณสถิติสรุปประจำสัปดาห์)
  const weekAllRecords = useMemo(() => {
    return attendances.filter(r => {
      const dStr = new Date(r.timestamp).toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
      return dStr >= currentWeek.monStr && dStr <= currentWeek.sunStr;
    });
  }, [attendances, currentWeek]);

  // สถิติสรุปประจำสัปดาห์
  const weekStats = useMemo(() => {
    const classRecords = weekAllRecords.filter(r => r.subjectId || r.subject);
    const assemblyRecords = weekAllRecords.filter(r => !r.subjectId && !r.subject);

    const presents = classRecords.filter(r => r.status === "PRESENT").length;
    const lates = classRecords.filter(r => r.status === "LATE").length;
    const absents = classRecords.filter(r => r.status === "ABSENT").length;
    const leaves = classRecords.filter(r => r.status === "LEAVE_PERSONAL" || r.status === "LEAVE_SICK").length;

    // รวบรวมวิชาที่ขาดเรียนในสัปดาห์นี้เพื่อแสดงเตือนให้นักเรียนทราบชัดเจน
    const absentSubjectsMap = new Map<string, { code: string; name: string; count: number }>();
    classRecords.filter(r => r.status === "ABSENT").forEach(r => {
      const sub = r.subject;
      if (sub) {
        const existing = absentSubjectsMap.get(sub.id) || { code: sub.code, name: sub.name, count: 0 };
        existing.count += 1;
        absentSubjectsMap.set(sub.id, existing);
      }
    });

    // จำนวนวันที่เข้าแถวหน้าเสาธงในสัปดาห์นี้
    const assemblyDaysAttended = new Set(
      assemblyRecords
        .filter(r => ["PRESENT", "LATE"].includes(r.status))
        .map(r => new Date(r.timestamp).toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }))
    ).size;

    return {
      totalClasses: classRecords.length,
      presents,
      lates,
      absents,
      leaves,
      absentSubjects: Array.from(absentSubjectsMap.values()),
      assemblyDaysAttended
    };
  }, [weekAllRecords]);

  let filtered = attendances;

  // 1. กรองสัปดาห์ (ถ้าเลือกมุมมองรายสัปดาห์ และไม่ได้เลือกตัวกรองวันที่เฉพาะเจาะจง)
  if (viewMode === "week" && !filterDate) {
    filtered = filtered.filter(r => {
      const dStr = new Date(r.timestamp).toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
      return dStr >= currentWeek.monStr && dStr <= currentWeek.sunStr;
    });
  }

  // 2. กรองวิชา
  if (filterSubject !== "all") {
    if (filterSubject === "assembly") {
      filtered = filtered.filter(r => !r.subject);
    } else {
      filtered = filtered.filter(r => r.subject?.id === filterSubject);
    }
  }

  // 3. กรองสถานะ
  if (filterStatus !== "all") {
    filtered = filtered.filter(r => r.status === filterStatus);
  }

  // 4. กรองวันที่เฉพาะเจาะจง
  if (filterDate) {
    filtered = filtered.filter(r => {
      const thaiDateStr = new Date(r.timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
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
            <div className="fixed inset-0 z-20" onClick={() => { setIsSubjectDropdownOpen(false); setSubjectSearch(""); }}></div>
          )}

          <div className="relative z-20">
            <div className="relative flex items-center">
              <div className="absolute left-3 pointer-events-none text-indigo-500">
                <BookOpen className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={
                  isSubjectDropdownOpen
                    ? subjectSearch
                    : (() => {
                        if (filterSubject === "all") return "";
                        if (filterSubject === "assembly") return "★ เข้าแถว / กิจกรรมรวม";
                        const s = subjects.find(x => x.id === filterSubject);
                        return s ? `[${s.code}] ${s.name}` : "";
                      })()
                }
                onChange={e => {
                  setSubjectSearch(e.target.value);
                  setIsSubjectDropdownOpen(true);
                  if (!e.target.value) setFilterSubject("all");
                }}
                onFocus={e => {
                  setIsSubjectDropdownOpen(true);
                  if (filterSubject !== "all" && filterSubject !== "assembly") {
                    const s = subjects.find(x => x.id === filterSubject);
                    setSubjectSearch(s ? s.name : "");
                  } else {
                    setSubjectSearch("");
                  }
                  e.target.select();
                }}
                placeholder="-- ทุกวิชา / ค้นหาวิชา --"
                className="w-full rounded-lg border shadow-sm sm:text-sm pl-9 pr-14 py-2.5 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
              <div className="absolute right-2 flex items-center gap-0.5 text-gray-400">
                {(filterSubject !== "all" || subjectSearch) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterSubject("all");
                      setSubjectSearch("");
                      setIsSubjectDropdownOpen(false);
                    }}
                    className="p-1 hover:text-rose-500 transition"
                    title="ล้างตัวกรอง (ดูทั้งหมด)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (isSubjectDropdownOpen) {
                      setIsSubjectDropdownOpen(false);
                      setSubjectSearch("");
                    } else {
                      setIsSubjectDropdownOpen(true);
                      if (filterSubject !== "all" && filterSubject !== "assembly") {
                        const s = subjects.find(x => x.id === filterSubject);
                        setSubjectSearch(s ? s.name : "");
                      } else {
                        setSubjectSearch("");
                      }
                    }
                  }}
                  className="p-1 hover:text-gray-600 dark:hover:text-gray-200 transition"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${isSubjectDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            {isSubjectDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-full sm:w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto z-30 animate-in fade-in zoom-in-95">

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

      {/* 📊 หัวข้อและแถบสรุปรายสัปดาห์ (Weekly View Section) ตามที่ผู้ใช้กำหนด */}
      <div className="mb-6 pt-2 pb-1 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              {viewMode === "week" ? "ประวัติเข้าเรียนรายสัปดาห์" : "ประวัติเข้าเรียนทั้งหมด"}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {viewMode === "week" ? (
                <>
                  ช่วงวันที่ <strong className="text-gray-700 dark:text-gray-200">{currentWeek.label}</strong>
                  {weekOffset === 0 && <span className="ml-1.5 text-indigo-600 dark:text-indigo-400 font-bold">(สัปดาห์ปัจจุบัน)</span>}
                </>
              ) : (
                "แสดงรายการประวัติการเข้าเรียนทั้งหมดตั้งแต่ต้นภาคเรียน"
              )}
            </p>
          </div>

          {/* สวิตช์สลับมุมมองและปุ่มเลื่อนสัปดาห์ */}
          <div className="flex flex-wrap items-center gap-2">
            {viewMode === "week" ? (
              <>
                <div className="inline-flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1 shadow-2xs">
                  <button
                    onClick={() => setWeekOffset(prev => prev - 1)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition"
                    title="สัปดาห์ก่อนหน้า"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setWeekOffset(0)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                      weekOffset === 0
                        ? "bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-bold"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    สัปดาห์นี้
                  </button>
                  <button
                    onClick={() => setWeekOffset(prev => prev + 1)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition"
                    title="สัปดาห์ถัดไป"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => setViewMode("all")}
                  className="text-xs font-medium px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  ดูทั้งหมดทั้งเทอม
                </button>
              </>
            ) : (
              <button
                onClick={() => { setViewMode("week"); setWeekOffset(0); }}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-2xs"
              >
                <Calendar className="w-3.5 h-3.5" />
                กลับสู่มุมมองรายสัปดาห์
              </button>
            )}
          </div>
        </div>

        {/* กล่องสรุปย่อประจำสัปดาห์ (Weekly Stat Chips) */}
        {viewMode === "week" && (
          <div className="space-y-3 pb-3">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/50 rounded-xl">
                <span className="text-[11px] font-bold text-green-700 dark:text-green-300 block">มาเรียน</span>
                <span className="text-xl font-extrabold text-green-800 dark:text-green-200">{weekStats.presents} คาบ</span>
              </div>
              <div className={`p-3 rounded-xl border transition-all ${
                weekStats.absents > 0 
                  ? "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800 ring-1 ring-red-400/20" 
                  : "bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700"
              }`}>
                <span className={`text-[11px] font-bold block ${weekStats.absents > 0 ? "text-red-700 dark:text-red-300" : "text-gray-500"}`}>ขาดเรียน</span>
                <span className={`text-xl font-extrabold ${weekStats.absents > 0 ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300"}`}>{weekStats.absents} คาบ</span>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/50 rounded-xl">
                <span className="text-[11px] font-bold text-orange-700 dark:text-orange-300 block">มาสาย</span>
                <span className="text-xl font-extrabold text-orange-800 dark:text-orange-200">{weekStats.lates} คาบ</span>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 rounded-xl">
                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 block">ลากิจ/ป่วย</span>
                <span className="text-xl font-extrabold text-blue-800 dark:text-blue-200">{weekStats.leaves} คาบ</span>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl col-span-2 sm:col-span-1">
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 block">เข้าแถวหน้าเสาธง</span>
                <span className="text-xl font-extrabold text-amber-800 dark:text-amber-200">{weekStats.assemblyDaysAttended} วัน</span>
              </div>
            </div>

            {/* แถบแจ้งเตือนพิเศษหากสัปดาห์นี้มีการขาดเรียน */}
            {weekStats.absents > 0 && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-center gap-2.5 text-xs text-rose-800 dark:text-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <div>
                  <strong className="font-bold">สัปดาห์นี้มีรายการขาดเรียน:</strong>{" "}
                  {weekStats.absentSubjects.map(s => `[${s.code}] ${s.name} (${s.count} คาบ)`).join(", ")}
                </div>
              </div>
            )}
          </div>
        )}
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
