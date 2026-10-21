"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Users, AlertTriangle, BookOpen, UserCheck, ShieldAlert, BadgeCheck, Search, ChevronDown, Clock } from "lucide-react";
import * as XLSX from "xlsx";
import { resetAllFaces } from "./actions";
import { showSuccess, showError, showConfirm } from "@/lib/alerts";

export default function HeadAdminOverview({ subjects, users, levelsOptions, termConfigs = [] }: { subjects: any[], users: any[], levelsOptions: string[], termConfigs?: any[] }) {
  const [filterLevel, setFilterLevel] = useState("ทั้งหมด");
  const [searchKr, setSearchKr] = useState("");
  const [filterSubjectKr, setFilterSubjectKr] = useState("ทั้งหมด");
  const [isSubjectKrDropdownOpen, setIsSubjectKrDropdownOpen] = useState(false);
  const [subjectKrSearch, setSubjectKrSearch] = useState("");
  const [filterLevelKr, setFilterLevelKr] = useState("ทั้งหมด");
  const [searchMz, setSearchMz] = useState("");
  const [filterLevelMz, setFilterLevelMz] = useState("ทั้งหมด");
  
  const currentBEYear = new Date().getFullYear() + 543;
  const initTerm = termConfigs.find(t => t.isCurrent) || termConfigs[0];
  const [selectedTermConfigId, setSelectedTermConfigId] = useState(initTerm ? initTerm.id : "all");
  const [assemblyStartDate, setAssemblyStartDate] = useState(initTerm?.startDate ? new Date(initTerm.startDate).toISOString().split('T')[0] : "");
  const [assemblyEndDate, setAssemblyEndDate] = useState(initTerm?.endDate ? new Date(initTerm.endDate).toISOString().split('T')[0] : "");

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

  const students = useMemo(() => users.filter(u => !u.deletedAt && u.role === "STUDENT" && (filterLevel === "ทั้งหมด" ? (u.level !== "จบการศึกษา" && u.level !== "พ้นสภาพ") : u.level === filterLevel)), [users, filterLevel]);
  const activeTeachers = useMemo(() => users.filter(u => !u.deletedAt && u.role === "TEACHER").length, [users]);
  const activeSubjects = useMemo(() => subjects.filter(s => !s.deletedAt && (filterLevel === "ทั้งหมด" || s.level === filterLevel)).length, [subjects, filterLevel]);

  // Assembly Stats
  const assemblyStats = useMemo(() => {
    let allAssemblyLogs = users.filter((u: any) => u.role === "STUDENT").flatMap((s: any) => s.attendances?.filter((a: any) => a.type === "assembly" || !a.subjectId) || []);
    
    if (assemblyStartDate) {
      const start = new Date(assemblyStartDate).getTime();
      allAssemblyLogs = allAssemblyLogs.filter((a: any) => new Date(a.timestamp).getTime() >= start);
    }
    if (assemblyEndDate) {
      const end = new Date(assemblyEndDate).getTime() + 86399999;
      allAssemblyLogs = allAssemblyLogs.filter((a: any) => new Date(a.timestamp).getTime() <= end);
    }

    const uniqueAssemblyDates = new Set(allAssemblyLogs.map((a: any) => 
      new Date(a.timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
    ));
    const totalDays = uniqueAssemblyDates.size;

    let failedCount = 0;
    const failingStudentsList: any[] = [];

    students.forEach((s: any) => {
      let myAsmLogs = (s.attendances || []).filter((a: any) => (!a.subjectId || a.type === "assembly"));
      if (assemblyStartDate) {
        const start = new Date(assemblyStartDate).getTime();
        myAsmLogs = myAsmLogs.filter((a: any) => new Date(a.timestamp).getTime() >= start);
      }
      if (assemblyEndDate) {
        const end = new Date(assemblyEndDate).getTime() + 86399999;
        myAsmLogs = myAsmLogs.filter((a: any) => new Date(a.timestamp).getTime() <= end);
      }

      if (totalDays === 0) return;

      // จัดกลุ่มประวัติตามวันที่ในเวลาไทย ป้องกันการนับซ้ำในวันเดียวกัน
      const dayStatusMap = new Map<string, string>();
      myAsmLogs.forEach((a: any) => {
        const dStr = new Date(a.timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
        if (!dayStatusMap.has(dStr)) {
          dayStatusMap.set(dStr, a.status);
        } else {
          const prev = dayStatusMap.get(dStr);
          if (prev !== 'PRESENT' && a.status === 'PRESENT') dayStatusMap.set(dStr, a.status);
          else if (prev === 'ABSENT' && a.status === 'LATE') dayStatusMap.set(dStr, a.status);
        }
      });

      const presents = Array.from(dayStatusMap.values()).filter((status: string) => ["PRESENT", "LATE"].includes(status)).length;
      const percent = Math.round((presents / totalDays) * 100);
      if (percent < 60) {
        failedCount++;
        failingStudentsList.push({ ...s, percent, presents });
      }
    });

    failingStudentsList.sort((a, b) => a.percent - b.percent);

    return { totalDays, failedCount, failingStudentsList };
  }, [students, users, assemblyStartDate, assemblyEndDate]);

  // Subject Stats (ขร.)
  const subjectStats = useMemo(() => {
    let khorRorCount = 0;
    let warningCount = 0; // ขาด 3 ครั้ง
    const khorRorStudentsList: any[] = [];

    students.forEach(s => {
      const subjAbsents: Record<string, number> = {};
      (s.attendances || []).filter((a: any) => a.subjectId).forEach((a: any) => {
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
        // Bug #6 fix: เก็บ targetSubjectId และ code ไว้ใน list เพื่อใช้ตอน Export
        khorRorStudentsList.push({ ...s, maxAbsents, subjectName, targetSubjectId, targetSubjectCode: subjectCode });
      }
    });

    // Sort heavily absent first
    khorRorStudentsList.sort((a, b) => b.maxAbsents - a.maxAbsents);

    return { khorRorCount, warningCount, khorRorStudentsList };
  }, [students, subjects]);

  const displayKr = useMemo(() => subjectStats.khorRorStudentsList.filter((st: any) => {
    if (filterSubjectKr !== "ทั้งหมด" && st.subjectName !== filterSubjectKr) return false;
    if (filterLevelKr !== "ทั้งหมด" && st.level !== filterLevelKr) return false;
    if (searchKr && !st.name.toLowerCase().includes(searchKr.toLowerCase()) && !st.username.toLowerCase().includes(searchKr.toLowerCase())) return false;
    return true;
  }), [subjectStats.khorRorStudentsList, filterSubjectKr, filterLevelKr, searchKr]);

  const displayMz = useMemo(() => assemblyStats.failingStudentsList.filter((st: any) => {
    if (filterLevelMz !== "ทั้งหมด" && st.level !== filterLevelMz) return false;
    if (searchMz && !st.name.toLowerCase().includes(searchMz.toLowerCase()) && !st.username.toLowerCase().includes(searchMz.toLowerCase())) return false;
    return true;
  }), [assemblyStats.failingStudentsList, filterLevelMz, searchMz]);

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
              value={selectedTermConfigId} 
              onChange={e => {
                const id = e.target.value;
                setSelectedTermConfigId(id);
                if (id === "all") {
                  setAssemblyStartDate("");
                  setAssemblyEndDate("");
                } else {
                  const tc = termConfigs.find(t => t.id === id);
                  if (tc) {
                    setAssemblyStartDate(new Date(tc.startDate).toISOString().split('T')[0]);
                    setAssemblyEndDate(new Date(tc.endDate).toISOString().split('T')[0]);
                  }
                }
              }} 
              className="bg-transparent text-sm font-bold text-indigo-600 dark:text-indigo-400 outline-none cursor-pointer pr-1"
            >
              {termConfigs.map(tc => (
                <option key={tc.id} value={tc.id} className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">
                  {tc.isCurrent ? `★ เทอม ${tc.term}/${tc.academicYear} (ปัจจุบัน)` : `เทอม ${tc.term}/${tc.academicYear}`}
                </option>
              ))}
              {termConfigs.length === 0 && (
                <option value="none" className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">
                  เทอม 1/{currentBEYear} (ค่าเริ่มต้น)
                </option>
              )}
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
                exportXLSXByLevel("khor-ror-report.xlsx", ["รหัสนักเรียน", "ชื่อ-นามสกุล", "ชั้นปี", "จำนวนขาด (สูงสุด)", "รหัสวิชาที่ติด", "ชื่อวิชาที่ติด"], displayKr, filterLevelKr, mapRowKr);
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
              <select 
                value={filterLevelKr} 
                onChange={e => setFilterLevelKr(e.target.value)} 
                className="px-3 py-1.5 border border-rose-200 dark:border-slate-600 rounded-lg w-full sm:w-auto outline-none focus:border-rose-400 dark:bg-slate-900 dark:text-white max-w-[120px]"
              >
                <option value="ทั้งหมด">- ทุกชั้นปี -</option>
                {levelsOptions.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
              </select>
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
              <h3 className="font-bold text-orange-900 dark:text-orange-200 text-lg">รายชื่อนักเรียนติด มผ. (เข้าแถว {"<"} 60%)</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold shadow-sm whitespace-nowrap">
                เปิดเช็ค {assemblyStats.totalDays} วัน
              </span>
              <button onClick={() => {
                const mapRowMz = (s: any) => [s.username, s.name, s.level, `${s.presents} วัน`, `${s.percent}%`];
                exportXLSXByLevel("moph-assembly-report.xlsx", ["รหัสนักเรียน", "ชื่อ-นามสกุล", "ชั้นปี", "มาเข้าแถว", "เปอร์เซ็นต์"], displayMz, filterLevelMz, mapRowMz);
              }} className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold shadow-sm transition">
                ⬇️ Export Excel
              </button>
            </div>
          </div>

          {/* Sub-Filters / Search for Mz */}
          <div className="px-5 py-3 border-b border-orange-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col sm:flex-row gap-3 justify-between items-center text-sm">
            <input 
              type="text" 
              placeholder="ค้นหาชื่อ หรือ รหัส..." 
              value={searchMz} 
              onChange={e => setSearchMz(e.target.value)} 
              className="px-3 py-1.5 border border-orange-200 dark:border-slate-600 rounded-lg w-full sm:w-64 outline-none focus:border-orange-400 dark:bg-slate-900 dark:text-white" 
            />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="font-semibold text-slate-500 whitespace-nowrap hidden sm:inline-block">ชั้นปี:</span>
              <select 
                value={filterLevelMz} 
                onChange={e => setFilterLevelMz(e.target.value)} 
                className="px-3 py-1.5 border border-orange-200 dark:border-slate-600 rounded-lg w-full sm:w-auto outline-none focus:border-orange-400 dark:bg-slate-900 dark:text-white"
              >
                <option value="ทั้งหมด">- ทุกชั้นปี -</option>
                {levelsOptions.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
              </select>
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

      {/* Danger Zone: Reset Faces */}
      <div className="mt-12 p-6 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 rounded-2xl">
        <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5" />
          เขตอันตราย (Danger Zone)
        </h3>
        <p className="text-sm text-red-600/80 dark:text-red-400/80 mb-6 max-w-3xl">
          การดำเนินการในส่วนนี้จะส่งผลกระทบต่อข้อมูลสำคัญของระบบ ไม่สามารถย้อนกลับได้ โปรดใช้งานด้วยความระมัดระวัง
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-red-100 dark:border-red-900/30">
          <div>
            <h4 className="font-semibold text-slate-800 dark:text-slate-200">รีเซ็ตใบหน้านักเรียนทั้งหมด</h4>
            <p className="text-sm text-slate-500 mt-1">ลบรูปถ่ายและล้างค่าการจดจำใบหน้าของนักเรียนทุกคนออกจากระบบ เพื่อบังคับให้นักเรียนถ่ายรูปใหม่</p>
          </div>
          <button 
            onClick={async () => {
              const ok = await showConfirm({
                title: "คำเตือน: ลบข้อมูลใบหน้านักเรียนทุกคน?",
                text: "การกระทำนี้จะล้างข้อมูลใบหน้าของนักเรียนทุกคนในระบบ\nส่งผลให้นักเรียนทุกคนสแกนหน้าไม่ผ่าน จนกว่าจะเข้าสู่ระบบไปถ่ายรูปใหม่ในหน้าโปรไฟล์\n\nคุณแน่ใจหรือไม่ว่าต้องการดำเนินการต่อ?",
                confirmText: "ยืนยันล้างข้อมูลใบหน้า",
                cancelText: "ยกเลิก",
                isDanger: true,
              });
              if (ok) {
                try {
                  await resetAllFaces();
                  showSuccess("รีเซ็ตใบหน้านักเรียนทุกคนสำเร็จแล้ว!", "นักเรียนทุกคนจะต้องถ่ายภาพใบหน้าใหม่ก่อนสแกนเข้าเรียน");
                } catch(e) {
                  showError("เกิดข้อผิดพลาดในการลบข้อมูล");
                }
              }
            }}
            className="px-4 py-2 bg-red-100 hover:bg-red-600 text-red-700 hover:text-white rounded-lg font-medium transition whitespace-nowrap"
          >
            ล้างข้อมูลใบหน้า
          </button>
        </div>
      </div>


    </div>
  );
}
