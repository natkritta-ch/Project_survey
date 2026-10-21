"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Users, AlertTriangle, BookOpen, UserCheck, ShieldAlert, BadgeCheck, Search, ChevronDown, Clock } from "lucide-react";
import * as XLSX from "xlsx";

export default function HeadAdminOverview({ subjects, users, levelsOptions, termConfigs = [] }: { subjects: any[], users: any[], levelsOptions: string[], termConfigs?: any[] }) {
  const [filterLevel, setFilterLevel] = useState("ทั้งหมด");
  const [searchKr, setSearchKr] = useState("");
  const [filterSubjectKr, setFilterSubjectKr] = useState("ทั้งหมด");
  const [isSubjectKrDropdownOpen, setIsSubjectKrDropdownOpen] = useState(false);
  const [subjectKrSearch, setSubjectKrSearch] = useState("");
  
  const currentBEYear = new Date().getFullYear() + 543;

  // 1. รวมรายการภาคเรียนทั้งหมดจาก termConfigs และ subjects อย่างครบถ้วน
  const availableTerms = useMemo(() => {
    const map = new Map<string, {
      id: string;
      key: string;
      term: string;
      academicYear: string;
      isCurrent: boolean;
      startDate?: string;
      endDate?: string;
    }>();

    // จาก termConfigs
    termConfigs.forEach((tc: any) => {
      const key = `${tc.term}/${tc.academicYear}`;
      const now = new Date();
      const isDateCurrent = tc.startDate && tc.endDate && new Date(tc.startDate) <= now && new Date(tc.endDate) >= now;
      map.set(key, {
        id: tc.id,
        key,
        term: String(tc.term),
        academicYear: String(tc.academicYear),
        isCurrent: !!tc.isCurrent || !!isDateCurrent,
        startDate: tc.startDate ? new Date(tc.startDate).toISOString().split('T')[0] : undefined,
        endDate: tc.endDate ? new Date(tc.endDate).toISOString().split('T')[0] : undefined,
      });
    });

    // จาก subjects
    subjects.forEach((s: any) => {
      if (s.term && s.academicYear) {
        const key = `${s.term}/${s.academicYear}`;
        if (!map.has(key)) {
          map.set(key, {
            id: key,
            key,
            term: String(s.term),
            academicYear: String(s.academicYear),
            isCurrent: false,
          });
        }
      }
    });

    // ถ้าไม่มีข้อมูลในระบบเลย ให้ fallback เป็น 1/ปีปัจจุบัน
    const defaultKey = `1/${currentBEYear}`;
    if (!map.has(defaultKey)) {
      map.set(defaultKey, {
        id: defaultKey,
        key: defaultKey,
        term: "1",
        academicYear: String(currentBEYear),
        isCurrent: true,
      });
    }

    const list = Array.from(map.values()).sort((a, b) => {
      if (b.academicYear !== a.academicYear) {
        return b.academicYear.localeCompare(a.academicYear);
      }
      return b.term.localeCompare(a.term);
    });

    // หากไม่มีเทอมใดถูกระบุ isCurrent ให้ถือว่าเทอมล่าสุดเป็นเทอมปัจจุบัน
    const hasCurrent = list.some(t => t.isCurrent);
    if (!hasCurrent && list.length > 0) {
      list[0].isCurrent = true;
    }

    return list;
  }, [termConfigs, subjects, currentBEYear]);

  // หาเทอมปัจจุบันสำหรับเป็นค่าเริ่มต้น
  const defaultCurrentTerm = useMemo(() => {
    return availableTerms.find(t => t.isCurrent) || availableTerms[0];
  }, [availableTerms]);

  const [selectedTermKey, setSelectedTermKey] = useState<string>(() => {
    return defaultCurrentTerm?.key || `1/${currentBEYear}`;
  });
  const [assemblyStartDate, setAssemblyStartDate] = useState<string>(() => {
    return defaultCurrentTerm?.startDate || "";
  });
  const [assemblyEndDate, setAssemblyEndDate] = useState<string>(() => {
    return defaultCurrentTerm?.endDate || "";
  });

  // ซิงค์ค่าเมื่อ defaultCurrentTerm เปลี่ยนแปลง
  useEffect(() => {
    if (defaultCurrentTerm && selectedTermKey !== "all" && !availableTerms.some(t => t.key === selectedTermKey)) {
      setSelectedTermKey(defaultCurrentTerm.key);
      if (defaultCurrentTerm.startDate) setAssemblyStartDate(defaultCurrentTerm.startDate);
      if (defaultCurrentTerm.endDate) setAssemblyEndDate(defaultCurrentTerm.endDate);
    }
  }, [defaultCurrentTerm, availableTerms, selectedTermKey]);

  const exportXLSXByLevel = (filename: string, headers: string[], dataList: any[], levelFilter: string, mapRow: (item: any) => any[]) => {
    const wb = XLSX.utils.book_new();

    if (levelFilter === "ทั้งหมด") {
      const groups: Record<string, any[]> = {};
      dataList.forEach(item => {
        const lvl = item.level || "ไม่ระบุ";
        if (!groups[lvl]) groups[lvl] = [];
        groups[lvl].push(item);
      });
      
      const sortedLevels = Object.keys(groups).sort();
      if (sortedLevels.length === 0) {
        const ws = XLSX.utils.aoa_to_sheet([headers]);
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      } else {
        sortedLevels.forEach(lvl => {
          const rows = groups[lvl].map(mapRow);
          const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
          const safeName = lvl.replace(/[\\/*?\[\]]/g, '').substring(0, 31);
          XLSX.utils.book_append_sheet(wb, ws, safeName);
        });
      }
    } else {
      const rows = dataList.map(mapRow);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const safeName = levelFilter.replace(/[\\/*?\[\]]/g, '').substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, safeName);
    }

    XLSX.writeFile(wb, filename);
  };

  const currentSelectedTerm = useMemo(() => {
    if (selectedTermKey === "all") return null;
    return availableTerms.find(t => t.key === selectedTermKey) || null;
  }, [availableTerms, selectedTermKey]);

  const students = useMemo(() => users.filter(u => !u.deletedAt && u.role === "STUDENT" && (filterLevel === "ทั้งหมด" ? (u.level !== "จบการศึกษา" && u.level !== "พ้นสภาพ") : u.level === filterLevel)), [users, filterLevel]);
  const activeTeachers = useMemo(() => users.filter(u => !u.deletedAt && u.role === "TEACHER").length, [users]);
  
  // วิชาที่เปิดสอน: กรองตามระดับชั้น และกรองตามภาคเรียนที่เลือก
  const activeSubjects = useMemo(() => {
    return subjects.filter(s => {
      if (s.deletedAt) return false;
      if (filterLevel !== "ทั้งหมด" && s.level !== filterLevel) return false;
      if (currentSelectedTerm) {
        if (s.term && s.term !== currentSelectedTerm.term) return false;
        if (s.academicYear && s.academicYear !== currentSelectedTerm.academicYear) return false;
      }
      return true;
    }).length;
  }, [subjects, filterLevel, currentSelectedTerm]);

  // Assembly Stats
  const assemblyStats = useMemo(() => {
    const rawLogs = users.filter((u: any) => u.role === "STUDENT").flatMap((s: any) => s.attendances?.filter((a: any) => a.type === "assembly" || !a.subjectId) || []);
    
    let filteredLogs = rawLogs;
    if (assemblyStartDate) {
      const start = new Date(assemblyStartDate).getTime();
      const logsAfter = filteredLogs.filter((a: any) => new Date(a.timestamp).getTime() >= start);
      if (logsAfter.length > 0) filteredLogs = logsAfter;
    }
    if (assemblyEndDate) {
      const end = new Date(assemblyEndDate).getTime() + 86399999;
      const logsBefore = filteredLogs.filter((a: any) => new Date(a.timestamp).getTime() <= end);
      if (logsBefore.length > 0) filteredLogs = logsBefore;
    }

    const uniqueAssemblyDates = new Set(filteredLogs.map((a: any) => 
      new Date(a.timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
    ));
    const totalDays = uniqueAssemblyDates.size;

    let failedCount = 0;
    const failingStudentsList: any[] = [];

    students.forEach((s: any) => {
      let myAsmLogs = (s.attendances || []).filter((a: any) => (!a.subjectId || a.type === "assembly"));
      if (assemblyStartDate) {
        const start = new Date(assemblyStartDate).getTime();
        const logsAfter = myAsmLogs.filter((a: any) => new Date(a.timestamp).getTime() >= start);
        if (logsAfter.length > 0) myAsmLogs = logsAfter;
      }
      if (assemblyEndDate) {
        const end = new Date(assemblyEndDate).getTime() + 86399999;
        const logsBefore = myAsmLogs.filter((a: any) => new Date(a.timestamp).getTime() <= end);
        if (logsBefore.length > 0) myAsmLogs = logsBefore;
      }

      if (totalDays === 0) return;

      // จัดกลุ่มประวัติตามวันที่ในเวลาไทย ป้องกันการนับซ้ำในวันเดียวกัน
      // ลำดับความสำคัญ: PRESENT (1) > LATE (2) > LEAVE (3) > ABSENT (4)
      const getPriority = (s: string) => {
        if (s === "PRESENT") return 1;
        if (s === "LATE") return 2;
        if (s && s.startsWith("LEAVE")) return 3;
        return 4;
      };

      const dayStatusMap = new Map<string, string>();
      myAsmLogs.forEach((a: any) => {
        const dStr = new Date(a.timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
        if (!dayStatusMap.has(dStr)) {
          dayStatusMap.set(dStr, a.status);
        } else {
          const prev = dayStatusMap.get(dStr)!;
          if (getPriority(a.status) < getPriority(prev)) {
            dayStatusMap.set(dStr, a.status);
          }
        }
      });

      const presents = Array.from(dayStatusMap.values()).filter((status: string) => ["PRESENT", "LATE"].includes(status)).length;
      const percent = Math.round((presents / totalDays) * 100);
      // เกณฑ์ สอศ. ม.ผ. คือเวลาเข้าร่วม < 80%
      if (percent < 80) {
        failedCount++;
        failingStudentsList.push({ ...s, percent, presents });
      }
    });

    failingStudentsList.sort((a, b) => a.percent - b.percent);

    return { totalDays, failedCount, failingStudentsList };
  }, [students, users, assemblyStartDate, assemblyEndDate]);

  // Subject Stats (ขร.): กรองเฉพาะวิชาและประวัติการขาดเรียนในภาคเรียนที่เลือก
  const subjectStats = useMemo(() => {
    let khorRorCount = 0;
    let warningCount = 0; // ขาด 3 ครั้ง
    const khorRorStudentsList: any[] = [];

    // รายวิชาเฉพาะของภาคเรียนที่เลือก
    const termSubjects = subjects.filter(s => {
      if (s.deletedAt) return false;
      if (currentSelectedTerm) {
        if (s.term && s.term !== currentSelectedTerm.term) return false;
        if (s.academicYear && s.academicYear !== currentSelectedTerm.academicYear) return false;
      }
      return true;
    });
    const termSubjectIds = new Set(termSubjects.map(s => s.id));

    students.forEach(s => {
      const subjAbsents: Record<string, number> = {};
      (s.attendances || []).filter((a: any) => a.subjectId && termSubjectIds.has(a.subjectId)).forEach((a: any) => {
        if (a.status === "ABSENT") {
          subjAbsents[a.subjectId] = (subjAbsents[a.subjectId] || 0) + 1;
        }
      });
      
      let maxAbsents = 0;
      let targetSubjectId = "";
      Object.entries(subjAbsents).forEach(([subjId, count]) => {
        if (count > maxAbsents) {
          maxAbsents = count;
          targetSubjectId = subjId;
        }
      });

      if (maxAbsents >= 3) {
        if (maxAbsents >= 4) khorRorCount++;
        else warningCount++;
        
        const subjectRef = subjects.find(sub => sub.id === targetSubjectId);
        const subjectName = subjectRef?.name || "ไม่ทราบวิชา";
        const subjectCode = subjectRef?.code || "";
        khorRorStudentsList.push({ ...s, maxAbsents, subjectName, targetSubjectId, targetSubjectCode: subjectCode });
      }
    });

    khorRorStudentsList.sort((a, b) => b.maxAbsents - a.maxAbsents);

    return { khorRorCount, warningCount, khorRorStudentsList };
  }, [students, subjects, currentSelectedTerm]);

  const displayKr = useMemo(() => subjectStats.khorRorStudentsList.filter((st: any) => {
    if (filterSubjectKr !== "ทั้งหมด" && st.subjectName !== filterSubjectKr) return false;
    if (searchKr && !st.name.toLowerCase().includes(searchKr.toLowerCase()) && !st.username.toLowerCase().includes(searchKr.toLowerCase())) return false;
    return true;
  }), [subjectStats.khorRorStudentsList, filterSubjectKr, searchKr]);

  const displayMz = assemblyStats.failingStudentsList;

  return (
    <div className="space-y-6">
      
      {/* Overview Control Panel */}
      <div className="bg-card/90 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-border flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-[var(--text-xl)] font-bold text-foreground">ภาพรวมสถิติโรงเรียน (Global Overview)</h2>
          <p className="text-[var(--text-sm)] text-muted-foreground">ข้อมูลอัปเดตแบบเรียลไทม์ ครอบคลุมการเข้าแถวและการเข้าเรียนรายวิชา</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* ตัวเลือกภาคเรียน */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">ภาคเรียน:</span>
            <select 
              value={selectedTermKey} 
              onChange={e => {
                const key = e.target.value;
                setSelectedTermKey(key);
                if (key === "all") {
                  setAssemblyStartDate("");
                  setAssemblyEndDate("");
                } else {
                  const t = availableTerms.find(item => item.key === key);
                  if (t) {
                    setAssemblyStartDate(t.startDate || "");
                    setAssemblyEndDate(t.endDate || "");
                  }
                }
              }} 
              className="bg-transparent text-sm font-bold text-indigo-600 dark:text-indigo-400 outline-none cursor-pointer pr-1"
            >
              {availableTerms.map(t => (
                <option key={t.key} value={t.key} className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">
                  {t.isCurrent ? `★ เทอม ${t.term}/${t.academicYear} (ปัจจุบัน)` : `เทอม ${t.term}/${t.academicYear}`}
                </option>
              ))}
              <option value="all" className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">
                -- ทุกช่วงเวลา (ทั้งหมด) --
              </option>
            </select>
          </div>

          {/* ตัวเลือกชั้นปี */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <Users className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">ระดับชั้น:</span>
            <select 
              value={filterLevel} 
              onChange={e => setFilterLevel(e.target.value)} 
              className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer pr-1"
            >
              <option value="ทั้งหมด" className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">🌍 ทุกระดับชั้น (ค่าเริ่มต้น)</option>
              {levelsOptions.map(lvl => (
                <option key={lvl} value={lvl} className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">{lvl}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Hero Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-20">
            <Users className="w-24 h-24" />
          </div>
          <p className="font-semibold text-indigo-100 mb-1 z-10">นักเรียนทั้งหมด</p>
          <h3 className="text-4xl font-extrabold z-10">{students.length} <span className="text-lg font-medium opacity-80">คน</span></h3>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-20">
            <UserCheck className="w-24 h-24" />
          </div>
          <p className="font-semibold text-emerald-100 mb-1 z-10">วิชาที่เปิดสอน</p>
          <h3 className="text-4xl font-extrabold z-10">{activeSubjects} <span className="text-lg font-medium opacity-80">วิชา</span></h3>
        </div>

        <div className="bg-gradient-to-br from-rose-500 to-rose-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-20">
            <ShieldAlert className="w-24 h-24" />
          </div>
          <p className="font-semibold text-rose-100 mb-1 z-10 flex items-center"><AlertTriangle className="w-4 h-4 mr-1"/> นักเรียนติด 'ขร.'</p>
          <h3 className="text-4xl font-extrabold z-10">{subjectStats.khorRorCount} <span className="text-lg font-medium opacity-80">คน (เสี่ยงอีก {subjectStats.warningCount})</span></h3>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-20">
            <BadgeCheck className="w-24 h-24" />
          </div>
          <p className="font-semibold text-orange-100 mb-1 z-10">นักเรียนติด 'มผ.' (เข้าแถว)</p>
          <h3 className="text-4xl font-extrabold z-10">{assemblyStats.failedCount} <span className="text-lg font-medium opacity-80">คน</span></h3>
        </div>
      </div>

      {/* Critical Lists Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Table 1: Khor Ror */}
        <div className="bg-card rounded-2xl shadow-sm border border-border flex flex-col overflow-hidden">
          <div className="px-6 py-5 border-b border-border bg-destructive/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-100 text-rose-600 rounded-full dark:bg-rose-900/40">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-rose-900 dark:text-rose-200 text-lg">รายชื่อนักเรียนติด ขร. (ขาด {"\u2265"} 4 ครั้ง)</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold shadow-sm whitespace-nowrap">
                พบ {subjectStats.khorRorCount} รายการ
              </span>
              <button onClick={() => {
                const mapRowKr = (s: any) => [s.username, s.name, s.level, `${s.maxAbsents} ครั้ง`, s.targetSubjectCode || "", s.subjectName || ""];
                exportXLSXByLevel("khor-ror-report.xlsx", ["รหัสนักเรียน", "ชื่อ-นามสกุล", "ชั้นปี", "จำนวนขาด (สูงสุด)", "รหัสวิชาที่ติด", "ชื่อวิชาที่ติด"], displayKr, filterLevel, mapRowKr);
              }} className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm transition">
                ⬇️ Export Excel
              </button>
            </div>
          </div>
          
          {/* Sub-Filters / Search for Khor Ror */}
          <div className="px-5 py-3 border-b border-rose-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col sm:flex-row gap-3 justify-between items-center text-sm">
            <input 
              type="text" 
              placeholder="ค้นหาชื่อ หรือ รหัส..." 
              value={searchKr} 
              onChange={e => setSearchKr(e.target.value)} 
              className="px-3 py-1.5 border border-rose-200 dark:border-slate-600 rounded-lg w-full sm:w-64 outline-none focus:border-rose-400 dark:bg-slate-900 dark:text-white" 
            />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="font-semibold text-slate-500 whitespace-nowrap hidden sm:inline-block">วิชา:</span>
              <div className="relative">
                {isSubjectKrDropdownOpen && (
                  <div className="fixed inset-0 z-40" onClick={() => setIsSubjectKrDropdownOpen(false)}></div>
                )}
                <div className="relative z-40">
                  <div
                    onClick={() => setIsSubjectKrDropdownOpen(!isSubjectKrDropdownOpen)}
                    className={`flex items-center justify-between gap-1.5 px-3 py-1.5 border border-rose-200 dark:border-slate-600 rounded-lg text-sm cursor-pointer bg-white dark:bg-slate-900 transition-colors max-w-[200px] ${
                      isSubjectKrDropdownOpen ? 'border-rose-400 ring-2 ring-rose-400/20' : 'hover:border-rose-300'
                    }`}
                  >
                    <span className="truncate text-slate-700 dark:text-slate-200 font-medium">
                      {filterSubjectKr === "ทั้งหมด" ? "-- ทุกวิชา --" : filterSubjectKr}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${isSubjectKrDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {isSubjectKrDropdownOpen && (
                    <div className="absolute right-0 sm:left-0 top-full mt-1 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50 animate-in fade-in zoom-in-95">
                      <div className="p-2 sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 z-10 shadow-sm">
                        <div className="relative">
                          <input
                            type="text"
                            value={subjectKrSearch}
                            onChange={e => setSubjectKrSearch(e.target.value)}
                            placeholder="ค้นหาชื่อวิชา..."
                            className="w-full pl-7 pr-2.5 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-rose-400"
                            autoFocus
                          />
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1.5" />
                        </div>
                      </div>

                      <div className="py-1 divide-y divide-slate-50 dark:divide-slate-700/50">
                        {(!subjectKrSearch || "ทั้งหมด".includes(subjectKrSearch.toLowerCase())) && (
                          <div
                            onClick={() => { setFilterSubjectKr("ทั้งหมด"); setIsSubjectKrDropdownOpen(false); setSubjectKrSearch(""); }}
                            className={`px-3 py-2 text-xs cursor-pointer transition-colors hover:bg-rose-50 dark:hover:bg-slate-700/50 ${
                              filterSubjectKr === "ทั้งหมด" ? 'bg-rose-50 text-rose-900 font-bold dark:bg-slate-700 dark:text-rose-300' : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            -- ทุกวิชา --
                          </div>
                        )}
                        {Array.from(new Set(subjectStats.khorRorStudentsList.map(st => st.subjectName)))
                          .filter(sub => !subjectKrSearch || (sub as string).toLowerCase().includes(subjectKrSearch.toLowerCase()))
                          .map(sub => (
                            <div
                              key={sub as string}
                              onClick={() => { setFilterSubjectKr(sub as string); setIsSubjectKrDropdownOpen(false); setSubjectKrSearch(""); }}
                              className={`px-3 py-2 text-xs cursor-pointer transition-colors truncate hover:bg-rose-50 dark:hover:bg-slate-700/50 ${
                                filterSubjectKr === sub ? 'bg-rose-50 text-rose-900 font-bold dark:bg-slate-700 dark:text-rose-300' : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {sub as string}
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-700 text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/40 sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-3 text-left font-bold text-slate-500 tracking-wider">รหัส/ชื่อ</th>
                  <th className="px-5 py-3 text-center font-bold text-slate-500 tracking-wider">ระดับชั้น</th>
                  <th className="px-5 py-3 text-left font-bold text-slate-500 tracking-wider">วิชาที่ติด ขร. / เสี่ยง</th>
                  <th className="px-5 py-3 text-center font-bold text-rose-600 tracking-wider">ขาด (ครั้ง)</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-50 dark:divide-slate-700">
                {(() => {
                  if (displayKr.length === 0) {
                    return <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400 italic font-medium">✨ ไม่มีข้อมูลที่ตรงกับการค้นหา</td></tr>;
                  }

                  return displayKr.map(st => (
                    <tr key={`kr-${st.id}`} className={st.maxAbsents >= 4 ? "hover:bg-rose-50 dark:hover:bg-slate-700/50 transition" : "bg-orange-50/30 hover:bg-orange-50 dark:hover:bg-slate-700/50 transition"}>
                      <td className="px-5 py-3 flex-col items-start gap-1">
                        <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                          {st.name} 
                          {st.maxAbsents >= 4 ? <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">ติด ขร.</span> : <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded font-bold">เสี่ยง</span>}
                        </div>
                        <div className="text-xs text-slate-500">{st.username}</div>
                      </td>
                      <td className="px-5 py-3 text-center font-medium text-slate-600 dark:text-slate-400">{st.level || "-"}</td>
                      <td className="px-5 py-3 font-medium text-slate-700 dark:text-slate-300">{st.subjectName}</td>
                      <td className={`px-5 py-3 text-center font-bold text-lg ${st.maxAbsents >= 4 ? 'text-rose-600' : 'text-amber-500'}`}>{st.maxAbsents}</td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Mz Hz */}
        <div className="bg-card rounded-2xl shadow-sm border border-border flex flex-col overflow-hidden">
          <div className="px-6 py-5 border-b border-border bg-orange-500/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 text-orange-600 rounded-full dark:bg-orange-900/40">
                <BadgeCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-orange-900 dark:text-orange-200 text-lg">รายชื่อนักเรียนติด มผ. (เข้าแถว {"<"} 80%)</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold shadow-sm whitespace-nowrap">
                เปิดเช็ค {assemblyStats.totalDays} วัน
              </span>
              <button onClick={() => {
                const mapRowMz = (s: any) => [s.username, s.name, s.level, `${s.presents} วัน`, `${s.percent}%`];
                exportXLSXByLevel("moph-assembly-report.xlsx", ["รหัสนักเรียน", "ชื่อ-นามสกุล", "ชั้นปี", "มาเข้าแถว", "เปอร์เซ็นต์"], displayMz, filterLevel, mapRowMz);
              }} className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold shadow-sm transition">
                ⬇️ Export Excel
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-700 text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/40 sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-3 text-left font-bold text-slate-500 tracking-wider">รหัส/ชื่อ</th>
                  <th className="px-5 py-3 text-center font-bold text-slate-500 tracking-wider">ระดับชั้น</th>
                  <th className="px-5 py-3 text-center font-bold text-amber-600 tracking-wider">การมาแถว (%)</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-50 dark:divide-slate-700">
                {(() => {
                  if (displayMz.length === 0) {
                    return <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-400 italic font-medium">✨ ไม่มีข้อมูลที่ตรงกับการค้นหา</td></tr>;
                  }

                  return displayMz.map(st => (
                    <tr key={`mz-${st.id}`} className="hover:bg-orange-50 dark:hover:bg-slate-700/50 transition">
                      <td className="px-5 py-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">{st.name}</div>
                        <div className="text-xs text-slate-500">{st.username}</div>
                      </td>
                      <td className="px-5 py-3 text-center font-medium text-slate-600 dark:text-slate-400">{st.level || "-"}</td>
                      <td className="px-5 py-3 text-center font-bold">
                        <span className="inline-flex items-center px-2.5 py-1 rounded border shadow-sm bg-orange-100 text-orange-700 border-orange-200">
                          {st.percent}%
                        </span>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
