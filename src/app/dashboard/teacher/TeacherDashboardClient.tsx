"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Filter, Camera, Clock, Calendar, Users, MapPin } from "lucide-react";

export default function TeacherDashboardClient({ schedules, allLevels, initialTerm = "ทั้งหมด" }: { schedules: any[], allLevels: string[], initialTerm?: string }) {
  const [filterLevel, setFilterLevel] = useState("ทั้งหมด");
  const [filterTerm, setFilterTerm] = useState(initialTerm);

  // สร้างรายการเทอมจากข้อมูลจริง
  const allTerms = Array.from(new Set(schedules.map(sc => sc.subject?.term || "-"))).sort();

  const displaySchedules = schedules.filter(sc => {
    if (filterLevel !== "ทั้งหมด" && (sc.subject?.level || "ไม่ระบุ") !== filterLevel) return false;
    if (filterTerm !== "ทั้งหมด" && (sc.subject?.term || "-") !== filterTerm) return false;
    return true;
  });

  const daysMap: Record<number, string> = {
    1: "วันจันทร์", 2: "วันอังคาร", 3: "วันพุธ", 4: "วันพฤหัสบดี", 5: "วันศุกร์", 6: "วันเสาร์", 7: "วันอาทิตย์"
  };

  return (
    <div className="mt-10 font-sans">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-card p-5 sm:p-6 rounded-2xl border border-border shadow-sm mb-8 gap-5">
        <div>
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" /> ตารางสอน อาจารย์
          </h3>
          <p className="text-sm text-muted-foreground mt-1">เลือกชั้นปีและเทอมเพื่อดูตารางเรียนรายสัปดาห์</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-background px-3 py-2 rounded-xl border border-border shadow-sm flex-1 md:flex-none">
            <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap flex-shrink-0">ชั้นปี:</span>
            <select 
              value={filterLevel} 
              onChange={e => setFilterLevel(e.target.value)} 
              className="bg-transparent border-none text-sm font-bold text-foreground focus:ring-0 cursor-pointer w-full"
            >
              <option value="ทั้งหมด">ทั้งหมด</option>
              {allLevels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          
          <div className="flex items-center gap-2 bg-background px-3 py-2 rounded-xl border border-border shadow-sm flex-1 md:flex-none">
            <Search className="w-4 h-4 text-muted-foreground hidden sm:block" />
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap flex-shrink-0">เทอม:</span>
            <select 
              value={filterTerm} 
              onChange={e => setFilterTerm(e.target.value)} 
              className="bg-transparent border-none text-sm font-bold text-foreground focus:ring-0 cursor-pointer w-full"
            >
              <option value="ทั้งหมด">ทั้งหมด</option>
              {allTerms.map(t => <option key={t} value={t}>เทอม {t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Weekdays Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map(day => {
          const daySchedules = displaySchedules.filter(sc => sc.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
          
          return (
            <div key={day} className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
              <div className="bg-muted/50 p-3 text-center border-b border-border flex justify-center items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <h4 className="font-bold text-foreground text-sm tracking-wide">{daysMap[day]}</h4>
              </div>
              
              <div className="p-3 flex-1 flex flex-col gap-3 bg-muted/10">
                {daySchedules.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-muted-foreground opacity-60">
                    <Calendar className="w-8 h-8 mb-2 stroke-[1.5]" />
                    <span className="text-xs font-medium tracking-wider uppercase">ว่าง</span>
                  </div>
                ) : (
                  daySchedules.map(sc => (
                    <div key={sc.id} className="p-4 rounded-xl border border-border bg-background shadow-sm flex flex-col group relative overflow-hidden transition-all hover:border-primary/40">
                      <div className="text-[10px] font-mono text-muted-foreground mb-1 bg-muted w-fit px-1.5 py-0.5 rounded">
                        {sc.subject?.code}
                      </div>
                      <div className="font-bold text-sm text-foreground mb-3 leading-snug">
                        {sc.subject?.name}
                      </div>
                      
                      <div className="flex flex-col gap-2 mt-auto">
                        <div className="text-xs font-bold text-primary flex items-center gap-1.5 bg-primary/10 w-fit px-2 py-1 rounded-md">
                          <Clock className="w-3.5 h-3.5" />
                          {sc.startTime} - {sc.endTime}
                        </div>
                        
                        <div className="flex flex-wrap gap-1.5">
                          <span className="text-[10px] font-bold bg-accent text-accent-foreground px-2 py-1 rounded-md flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {sc.subject?.level || "-"} {sc.subject?.group ? `(${sc.subject.group})` : ""}
                          </span>
                          
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 ${sc.subject?.room ? 'bg-primary/5 text-primary border border-primary/10' : 'bg-muted text-muted-foreground'}`}>
                            <MapPin className="w-3 h-3" />
                            {sc.subject?.room || "ไม่ระบุห้อง"}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-border">
                        <Link href={`/dashboard/teacher/scan?type=class&subjectId=${sc.subject?.id}`} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2 px-3 rounded-lg font-bold shadow-sm transition-colors flex gap-1.5 items-center justify-center text-xs">
                          <Camera className="w-4 h-4" />
                          สแกนชื่อเข้าเรียน
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Weekend Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mt-6">
        {[6, 7].map(day => {
          const daySchedules = displaySchedules.filter(sc => sc.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
          if (daySchedules.length === 0) return null;
          
          return (
            <div key={day} className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden flex flex-col h-full bg-orange-50/30 dark:bg-orange-950/20">
              <div className="bg-orange-100 dark:bg-orange-900/40 p-3 text-center border-b border-orange-200 dark:border-orange-800/50 flex justify-center items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <h4 className="font-bold text-orange-900 dark:text-orange-200 text-sm">{daysMap[day]}</h4>
              </div>
              <div className="p-4 flex-1 flex flex-col gap-3">
                {daySchedules.map(sc => (
                  <div key={sc.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center bg-background rounded-xl border border-orange-100 dark:border-orange-800/50 shadow-sm gap-4">
                    <div>
                      <div className="text-[10px] font-mono text-muted-foreground mb-1 bg-muted w-fit px-1.5 py-0.5 rounded">
                        {sc.subject?.code}
                      </div>
                      <div className="font-bold text-sm text-foreground mb-2">{sc.subject?.name}</div>
                      
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-xs font-bold text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded-md flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {sc.startTime} - {sc.endTime}
                        </span>
                        <span className="text-[10px] font-bold bg-accent text-accent-foreground px-2 py-1 rounded-md">
                          {sc.subject?.level || "-"} {sc.subject?.group ? `(${sc.subject.group})` : ""}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 ${sc.subject?.room ? 'bg-primary/5 text-primary border border-primary/10' : 'bg-muted text-muted-foreground'}`}>
                          <MapPin className="w-3 h-3" />
                          {sc.subject?.room || "ไม่ระบุ"}
                        </span>
                      </div>
                    </div>
                    
                    <Link href={`/dashboard/teacher/scan?type=class&subjectId=${sc.subject?.id}`} className="bg-primary hover:bg-primary/90 text-primary-foreground py-2 px-4 rounded-lg font-bold shadow-sm transition-colors flex gap-1.5 items-center justify-center text-xs whitespace-nowrap">
                       <Camera className="w-4 h-4" />
                       สแกน
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
