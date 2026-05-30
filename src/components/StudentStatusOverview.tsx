"use client";

import React, { useMemo } from "react";
import { AlertTriangle, XCircle, CheckCircle2, ShieldAlert } from "lucide-react";

export default function StudentStatusOverview({ attendances, subjects }: { attendances: any[], subjects: any[] }) {
  const { assemblyStats, subjectStats } = useMemo(() => {
    // Assembly Stats
    const assemblyLogs = attendances.filter(a => a.type === "assembly" || !a.subjectId);
    
    // Deduplicate by date to get total valid assembly days for this student
    const uniqueDaysMap = new Map();
    assemblyLogs.forEach(a => {
      const dateStr = new Date(a.timestamp).toISOString().split('T')[0];
      // If multiple logs on same day, take the best status
      if (!uniqueDaysMap.has(dateStr)) {
         uniqueDaysMap.set(dateStr, a);
      } else {
         const existing = uniqueDaysMap.get(dateStr);
         if (existing.status !== "PRESENT" && a.status === "PRESENT") uniqueDaysMap.set(dateStr, a);
         if (existing.status === "ABSENT" && a.status === "LATE") uniqueDaysMap.set(dateStr, a);
      }
    });
    
    const finalAssemblyLogs = Array.from(uniqueDaysMap.values());
    const totalDays = finalAssemblyLogs.length;
    const presents = finalAssemblyLogs.filter((a: any) => ["PRESENT", "LATE"].includes(a.status)).length;
    const absents = finalAssemblyLogs.filter((a: any) => ["ABSENT"].includes(a.status)).length;
    const leaves = finalAssemblyLogs.filter((a: any) => ["LEAVE_PERSONAL", "LEAVE_SICK"].includes(a.status)).length;
    const percent = totalDays > 0 ? (presents / totalDays) * 100 : 0;
    const isPass = totalDays === 0 || percent >= 80;

    const assemblyStats = { totalDays, presents, absents, leaves, percent: Math.round(percent), isPass };

    // Subject Stats
    const subjectStats = subjects.map(subj => {
      const logs = attendances.filter(a => a.subjectId === subj.id);
      const absents = logs.filter(a => a.status === "ABSENT").length;
      return { subj, absents, isFail: absents >= 4, isWarning: absents === 3 };
    }).sort((a, b) => b.absents - a.absents); // Highest absences first

    return { assemblyStats, subjectStats };
  }, [attendances, subjects]);

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-shadow hover:shadow-md mb-8">
      <h3 className="font-bold text-lg mb-5 text-slate-800 dark:text-white flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-indigo-500" /> สรุปสถานะการเข้าเรียน (คัดกรอง ขร. / มผ.)
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Assembly Status Panel */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-slate-700 dark:text-slate-200">กิจกรรมเข้าแถวหน้าเสาธง (เกณฑ์ผ่าน 80%)</h4>
          </div>
          <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">สถิติการเข้าร่วม</p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-extrabold text-slate-800 dark:text-white">{assemblyStats.presents}</span>
                <span className="text-slate-500 font-medium">/ {assemblyStats.totalDays} วัน</span>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="text-slate-600 dark:text-slate-400 bg-rose-50 border border-rose-100 dark:bg-rose-900/10 dark:border-rose-900/30 px-2 py-0.5 rounded-md">ขาด: <span className="font-bold text-rose-600">{assemblyStats.absents}</span></span>
                <span className="text-slate-600 dark:text-slate-400 bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 px-2 py-0.5 rounded-md">ลา: <span className="font-bold">{assemblyStats.leaves}</span></span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">เปอร์เซ็นต์</p>
                <span className={`text-xl font-bold ${assemblyStats.isPass ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {assemblyStats.percent}%
                </span>
              </div>
              <div className="h-10 w-px bg-slate-200 dark:bg-slate-700"></div>
              <div className="text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">ผลประเมิน</p>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${assemblyStats.isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {assemblyStats.isPass ? <><CheckCircle2 className="w-4 h-4 mr-1" /> ผ.</> : <><XCircle className="w-4 h-4 mr-1" /> มผ.</>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subjects Status Panel */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden flex flex-col">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <h4 className="font-bold text-slate-700 dark:text-slate-200">รายวิชาเรียน (เกณฑ์ ขร. ขาด 4 ครั้ง)</h4>
            {subjectStats.some(s => s.isFail || s.isWarning) && (
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
            )}
          </div>
          <div className="p-0 overflow-y-auto max-h-[220px]">
            {subjectStats.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">ไม่มีข้อมูลรายวิชาเรียน</div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {subjectStats.map((stat, idx) => (
                  <li key={idx} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition flex items-center justify-between gap-4">
                    <div className="truncate">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate" title={stat.subj.name}>{stat.subj.name}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{stat.subj.code}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-xs text-slate-500 mr-2">ขาดเรียน</span>
                        <span className={`text-lg font-bold ${stat.absents === 0 ? 'text-slate-400' : stat.absents >= 4 ? 'text-rose-600' : stat.absents === 3 ? 'text-amber-500' : 'text-slate-700 dark:text-slate-300'}`}>
                          {stat.absents}
                        </span>
                      </div>
                      
                      <div className="w-20 text-right">
                        {stat.isFail ? (
                          <span className="inline-flex items-center text-xs font-bold px-2 py-1 bg-rose-100 text-rose-800 rounded">
                            <XCircle className="w-3 h-3 mr-1" /> ขร.
                          </span>
                        ) : stat.isWarning ? (
                          <span className="inline-flex items-center text-xs font-bold px-2 py-1 bg-amber-100 text-amber-800 rounded">
                            <AlertTriangle className="w-3 h-3 mr-1" /> เสี่ยง ขร.
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs font-bold px-2 py-1 bg-emerald-50 text-emerald-700 rounded border border-emerald-100">
                            ปกติ
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
