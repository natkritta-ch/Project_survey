"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Flag, 
  BookOpen, 
  Calendar, 
  Sparkles, 
  ChevronRight,
  MapPin,
  Smile,
  ShieldCheck,
  AlertTriangle
} from "lucide-react";

interface StudentDailyLiveStatusProps {
  mySchedules: any[];
  makeupClasses: any[];
  attendances: any[];
  onNavigateToSchedule?: () => void;
}

export default function StudentDailyLiveStatus({
  mySchedules = [],
  makeupClasses = [],
  attendances = [],
  onNavigateToSchedule
}: StudentDailyLiveStatusProps) {
  // Live clock: triggers re-calculation every 30 seconds
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Bangkok Date & Time Calculations
  const {
    todayStr,
    dayOfWeek,
    currentMinutes,
    timeDisplayStr
  } = useMemo(() => {
    const dateStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
    const timeStr = now.toLocaleTimeString("en-GB", { timeZone: "Asia/Bangkok", hour12: false });
    const [hours, minutes] = timeStr.split(":").map(Number);
    
    // Day of week in Bangkok: 1 = Monday ... 7 = Sunday
    const bkkDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const rawDay = bkkDate.getDay();
    const dow = rawDay === 0 ? 7 : rawDay;

    return {
      todayStr: dateStr,
      dayOfWeek: dow,
      currentMinutes: (hours || 0) * 60 + (minutes || 0),
      timeDisplayStr: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    };
  }, [now]);

  // Helper to format Date or timestamp to HH:mm
  const formatTime = (ts: any) => {
    if (!ts) return "";
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // 1. Calculate Assembly State (Activities on Mon-Fri: dayOfWeek 1..5)
  // Normal assembly: 07:40 - 08:00 | Scan window (with buffer): 07:10 - 08:30
  // 30 mins before scanning opens: 06:40
  const isSchoolDay = dayOfWeek >= 1 && dayOfWeek <= 5;
  const assemblyLog = useMemo(() => {
    if (!isSchoolDay) return null;
    return attendances.find((a: any) => {
      const isAssembly = a.type === "assembly" || !a.subjectId || !a.subject;
      if (!isAssembly) return false;
      const dStr = new Date(a.timestamp).toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
      return dStr === todayStr;
    });
  }, [attendances, todayStr, isSchoolDay]);

  const assemblyItem = useMemo(() => {
    if (!isSchoolDay) return null;

    const SCAN_START = 7 * 60 + 10; // 07:10
    const SCAN_END = 8 * 60 + 30;   // 08:30
    const BUFFER_START = 6 * 60 + 40; // 06:40 (30 mins before scan start)

    let state: "UPCOMING_FAR" | "ABOUT_TO_START" | "IN_PROGRESS" | "CHECKED" | "MISSED" = "UPCOMING_FAR";
    let title = "";
    let desc = "";
    let badge = "";

    if (assemblyLog) {
      state = "CHECKED";
      const isLate = assemblyLog.status === "LATE";
      title = isLate 
        ? `✓ เช็คชื่อเข้าแถวสำเร็จแล้ว (${formatTime(assemblyLog.timestamp)} น. - มาสาย)`
        : `✓ เช็คชื่อเข้าแถวสำเร็จแล้ว (${formatTime(assemblyLog.timestamp)} น.)`;
      desc = "บันทึกการเข้าร่วมกิจกรรมหน้าเสาธงประจำวันเรียบร้อยแล้ว";
      badge = isLate ? "มาสาย" : "เข้าแถวแล้ว";
    } else {
      if (currentMinutes < BUFFER_START) {
        state = "UPCOMING_FAR";
        title = "กิจกรรมหน้าเสาธง (07:40 - 08:00 น.)";
        desc = "ระบบจะเปิดสแกนเช็คชื่อเวลา 07:10 - 08:30 น.";
        badge = "รอเช็คชื่อ";
      } else if (currentMinutes >= BUFFER_START && currentMinutes < SCAN_START) {
        state = "ABOUT_TO_START";
        const minsLeft = Math.max(1, SCAN_START - currentMinutes);
        title = `อีก ${minsLeft} นาที: เตรียมตัวเช็คชื่อกิจกรรมหน้าเสาธง`;
        desc = "ระบบจะเปิดกล้องสแกนเช็คชื่อเวลา 07:10 น. (บริเวณหน้าเสาธง)";
        badge = "อีก 30 นาที";
      } else if (currentMinutes >= SCAN_START && currentMinutes <= SCAN_END) {
        state = "IN_PROGRESS";
        title = "กิจกรรมหน้าเสาธงกำลังเปิดเช็คชื่อ (ยังไม่สแกน)";
        desc = "เปิดเช็คชื่อช่วงเวลา 07:10 - 08:30 น. กรุณาสแกนใบหน้ากับอาจารย์ผู้ตรวจเช็ค";
        badge = "กำลังเปิดเช็คชื่อ";
      } else {
        state = "MISSED";
        title = "คุณขาดกิจกรรมหน้าเสาธงวันนี้";
        desc = "หมดเวลาเช็คชื่อกิจกรรมหน้าเสาธงแล้ว (ปิดระบบเวลา 08:30 น.)";
        badge = "ขาดกิจกรรม";
      }
    }

    return {
      id: "assembly",
      type: "ASSEMBLY",
      name: "กิจกรรมหน้าเสาธง",
      code: "ASSEMBLY",
      room: "ลานหน้าเสาธง",
      startTime: "07:40",
      endTime: "08:00",
      scanStartTime: "07:10",
      scanEndTime: "08:30",
      startMinutes: SCAN_START,
      endMinutes: SCAN_END,
      state,
      title,
      desc,
      badge,
      log: assemblyLog
    };
  }, [isSchoolDay, assemblyLog, currentMinutes]);

  // 2. Calculate Today's Classes (Regular + Make-up)
  const todayClasses = useMemo(() => {
    // 2.1 Regular Schedules for today
    const regular = mySchedules
      .filter((s: any) => s.dayOfWeek === dayOfWeek && s.subject)
      .map((s: any) => {
        const [sh, sm] = (s.startTime || "00:00").split(":").map(Number);
        const [eh, em] = (s.endTime || "00:00").split(":").map(Number);
        return {
          id: s.id,
          type: "REGULAR",
          subject: s.subject,
          startTime: s.startTime,
          endTime: s.endTime,
          startMinutes: (sh || 0) * 60 + (sm || 0),
          endMinutes: (eh || 0) * 60 + (em || 0),
          room: s.subject.room,
          group: s.subject.group,
          teacherName: s.subject.teacher?.name
        };
      });

    // 2.2 Make-up Classes for today
    const makeups = makeupClasses
      .filter((m: any) => {
        if (!m.subject) return false;
        const dStr = new Date(m.date).toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
        return dStr === todayStr;
      })
      .map((m: any) => {
        const [sh, sm] = (m.startTime || "00:00").split(":").map(Number);
        const [eh, em] = (m.endTime || "00:00").split(":").map(Number);
        return {
          id: m.id,
          type: "MAKEUP",
          subject: m.subject,
          startTime: m.startTime,
          endTime: m.endTime,
          startMinutes: (sh || 0) * 60 + (sm || 0),
          endMinutes: (eh || 0) * 60 + (em || 0),
          room: m.subject.room,
          group: m.subject.group,
          teacherName: m.subject.teacher?.name,
          remark: m.remark || "สอนชดเชย"
        };
      });

    // Merge and sort chronologically
    const all = [...regular, ...makeups].sort((a, b) => a.startMinutes - b.startMinutes);

    // Compute status for each class relative to attendances and current time
    return all.map((c: any) => {
      // Find today's attendance for this subject
      const att = attendances.find((a: any) => {
        const subId = a.subjectId || a.subject?.id;
        if (subId !== c.subject.id) return false;
        const dStr = new Date(a.timestamp).toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
        return dStr === todayStr;
      });

      let state: "UPCOMING_FAR" | "ABOUT_TO_START" | "IN_PROGRESS" | "CHECKED" | "MISSED" = "UPCOMING_FAR";
      let title = "";
      let desc = "";
      let badge = "";

      if (att) {
        state = "CHECKED";
        const isLate = att.status === "LATE";
        const isLeave = att.status?.startsWith("LEAVE");
        const statusLabel = isLeave ? (att.status === "LEAVE_SICK" ? "ลาป่วย" : "ลากิจ") : (isLate ? "มาสาย" : "มาเรียน");
        
        title = `✓ เช็คชื่อวิชา [${c.subject.code}] ${c.subject.name} สำเร็จ (${formatTime(att.timestamp)} น.)`;
        desc = `สถานะ: ${statusLabel}${c.room ? ` • ห้อง ${c.room}` : ""}${c.teacherName ? ` • อ.${c.teacherName}` : ""}`;
        badge = statusLabel;
      } else {
        if (currentMinutes < c.startMinutes - 30) {
          state = "UPCOMING_FAR";
          title = `วิชา [${c.subject.code}] ${c.subject.name} (${c.startTime} - ${c.endTime} น.)`;
          desc = `ห้องเรียน: ${c.room || "-"} • อาจารย์ผู้สอน: ${c.teacherName || "-"}`;
          badge = "รอเรียนตามตาราง";
        } else if (currentMinutes >= c.startMinutes - 30 && currentMinutes < c.startMinutes) {
          state = "ABOUT_TO_START";
          const minsLeft = Math.max(1, c.startMinutes - currentMinutes);
          title = `อีก ${minsLeft} นาที จะเช็คชื่อวิชา [${c.subject.code}] ${c.subject.name}`;
          desc = `คาบเรียนเวลา ${c.startTime} - ${c.endTime} น. • ห้อง ${c.room || "-"}${c.teacherName ? ` • อ.${c.teacherName}` : ""}`;
          badge = `อีก ${minsLeft} นาที`;
        } else if (currentMinutes >= c.startMinutes && currentMinutes <= c.endMinutes) {
          state = "IN_PROGRESS";
          title = `วิชา [${c.subject.code}] ${c.subject.name} กำลังเปิดเช็คชื่อ`;
          desc = `คาบเรียน ${c.startTime} - ${c.endTime} น. (ยังไม่พบการสแกน) • ห้อง ${c.room || "-"}`;
          badge = "กำลังเปิดเช็คชื่อ";
        } else {
          state = "MISSED";
          title = `คุณขาดเรียนวิชา [${c.subject.code}] ${c.subject.name}`;
          desc = `หมดคาบเรียนแล้ว (${c.startTime} - ${c.endTime} น.) ไม่พบการสแกนเข้าเรียน`;
          badge = "ขาดเรียน";
        }
      }

      return {
        ...c,
        att,
        state,
        title,
        desc,
        badge
      };
    });
  }, [mySchedules, makeupClasses, attendances, dayOfWeek, todayStr, currentMinutes]);

  // 3. Combine All Daily Items (Assembly + Classes)
  const allDailyItems = useMemo(() => {
    const items: any[] = [];
    if (assemblyItem) items.push(assemblyItem);
    items.push(...todayClasses);
    return items;
  }, [assemblyItem, todayClasses]);

  // 4. Determine Active / "Hero" Event
  const heroEvent = useMemo(() => {
    if (allDailyItems.length === 0) return null;

    // 1st Priority: Any item currently IN_PROGRESS (still not checked or in progress)
    const inProgressUnchecked = allDailyItems.find(i => i.state === "IN_PROGRESS");
    if (inProgressUnchecked) return inProgressUnchecked;

    // 2nd Priority: Any item ABOUT_TO_START (within 30 mins)
    const aboutToStart = allDailyItems.find(i => i.state === "ABOUT_TO_START");
    if (aboutToStart) return aboutToStart;

    // 3rd Priority: Any item currently IN_PROGRESS that is already checked
    const inProgressChecked = allDailyItems.find(i => 
      i.state === "CHECKED" && 
      currentMinutes >= i.startMinutes && 
      currentMinutes <= i.endMinutes
    );
    if (inProgressChecked) return inProgressChecked;

    // 4th Priority: Next upcoming item today (UPCOMING_FAR)
    const nextUpcoming = allDailyItems.find(i => i.state === "UPCOMING_FAR");
    if (nextUpcoming) return nextUpcoming;

    // 5th Priority: If all items are completed or missed, return the last completed/missed item or summary
    return allDailyItems[allDailyItems.length - 1];
  }, [allDailyItems, currentMinutes]);

  // 5. Daily Summary Statistics
  const dailyStats = useMemo(() => {
    const classCount = todayClasses.length;
    const checkedClasses = todayClasses.filter(c => c.state === "CHECKED").length;
    const missedClasses = todayClasses.filter(c => c.state === "MISSED").length;
    const pendingClasses = todayClasses.filter(c => ["UPCOMING_FAR", "ABOUT_TO_START", "IN_PROGRESS"].includes(c.state)).length;

    const assemblyDone = assemblyItem?.state === "CHECKED";
    const assemblyMissed = assemblyItem?.state === "MISSED";

    return {
      classCount,
      checkedClasses,
      missedClasses,
      pendingClasses,
      assemblyDone,
      assemblyMissed,
      isDayEnded: allDailyItems.length > 0 && allDailyItems.every(i => ["CHECKED", "MISSED"].includes(i.state))
    };
  }, [todayClasses, assemblyItem, allDailyItems]);

  // Color & Theme Helpers for Hero Card
  const getCardTheme = (state: string) => {
    switch (state) {
      case "CHECKED":
        return {
          border: "border-emerald-300 dark:border-emerald-800",
          bg: "bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent",
          iconBg: "bg-emerald-600 text-white shadow-emerald-200 dark:shadow-none",
          badgeBg: "bg-emerald-500 text-white",
          textTitle: "text-emerald-950 dark:text-emerald-200",
          textDesc: "text-emerald-800/80 dark:text-emerald-300/80",
          icon: <CheckCircle2 className="w-5 h-5" />
        };
      case "IN_PROGRESS":
        return {
          border: "border-amber-400 dark:border-amber-600 shadow-md ring-2 ring-amber-400/20",
          bg: "bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5",
          iconBg: "bg-amber-500 text-white shadow-amber-200 dark:shadow-none animate-pulse",
          badgeBg: "bg-amber-500 text-white animate-pulse",
          textTitle: "text-amber-950 dark:text-amber-100",
          textDesc: "text-amber-800/90 dark:text-amber-200/90",
          icon: <Clock className="w-5 h-5 animate-spin-slow" />
        };
      case "ABOUT_TO_START":
        return {
          border: "border-indigo-400 dark:border-indigo-600 shadow-sm",
          bg: "bg-gradient-to-r from-indigo-500/15 via-blue-500/10 to-transparent",
          iconBg: "bg-indigo-600 text-white shadow-indigo-200 dark:shadow-none animate-bounce-subtle",
          badgeBg: "bg-indigo-600 text-white",
          textTitle: "text-indigo-950 dark:text-indigo-200",
          textDesc: "text-indigo-800/80 dark:text-indigo-300/80",
          icon: <Clock className="w-5 h-5" />
        };
      case "MISSED":
        return {
          border: "border-rose-300 dark:border-rose-800",
          bg: "bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent",
          iconBg: "bg-rose-600 text-white shadow-rose-200 dark:shadow-none",
          badgeBg: "bg-rose-600 text-white",
          textTitle: "text-rose-950 dark:text-rose-200",
          textDesc: "text-rose-800/80 dark:text-rose-300/80",
          icon: <XCircle className="w-5 h-5" />
        };
      default: // UPCOMING_FAR
        return {
          border: "border-slate-300 dark:border-slate-700",
          bg: "bg-gradient-to-r from-slate-500/10 via-slate-500/5 to-transparent",
          iconBg: "bg-slate-600 text-white",
          badgeBg: "bg-slate-600 text-white",
          textTitle: "text-slate-900 dark:text-slate-200",
          textDesc: "text-slate-600 dark:text-slate-400",
          icon: <Calendar className="w-5 h-5" />
        };
    }
  };

  // If today has NO activities and NO classes (e.g. Weekend without makeup)
  if (allDailyItems.length === 0) {
    return (
      <div className="mb-6 p-5 rounded-2xl bg-card border border-border shadow-2xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Smile className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-base text-foreground flex items-center gap-2">
              วันนี้ไม่มีตารางเรียน พักผ่อนให้เต็มที่ 🏖️
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              ไม่มีกิจกรรมหน้าเสาธงหรือคาบเรียนที่กำหนดไว้ในวันนี้
            </p>
          </div>
        </div>
        {onNavigateToSchedule && (
          <button
            onClick={onNavigateToSchedule}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-accent text-foreground transition shrink-0 hidden sm:inline-flex items-center gap-1"
          >
            ดูตารางเรียนทั้งหมด <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  const theme = heroEvent ? getCardTheme(heroEvent.state) : getCardTheme("UPCOMING_FAR");

  return (
    <div className="mb-8 space-y-3">
      {/* 🌟 HERO CARD: CURRENT ACTIVE STATUS */}
      {heroEvent && (
        <div className={`p-5 rounded-2xl border-2 ${theme.border} ${theme.bg} shadow-sm transition-all duration-300`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className={`p-2.5 rounded-xl shrink-0 ${theme.iconBg}`}>
                {theme.icon}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${theme.badgeBg}`}>
                    {heroEvent.badge}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3 opacity-70" /> {timeDisplayStr} น.
                  </span>
                </div>
                <h3 className={`font-extrabold text-base sm:text-lg mt-1 tracking-tight ${theme.textTitle}`}>
                  {heroEvent.title}
                </h3>
              </div>
            </div>

            {onNavigateToSchedule && (
              <button
                onClick={onNavigateToSchedule}
                className="self-start sm:self-auto text-xs font-bold px-3 py-1.5 rounded-xl bg-background/80 hover:bg-background border border-border/80 text-foreground transition shadow-2xs flex items-center gap-1 shrink-0"
              >
                ดูตารางวันนี้ <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <p className={`text-xs md:text-sm pl-1 ${theme.textDesc}`}>
            {heroEvent.desc}
          </p>
        </div>
      )}

      {/* 📅 TODAY'S TIMELINE STEPPER & DAILY SUMMARY */}
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 shadow-2xs">
        {/* Top Header of Today's Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm text-foreground">
              ไทม์ไลน์การเช็คชื่อวันนี้ ({new Date().toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "short", year: "numeric" })})
            </span>
          </div>

          {/* Mini Stat Chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {isSchoolDay && (
              <span className={`px-2 py-0.5 rounded-md font-semibold border ${
                dailyStats.assemblyDone 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" 
                  : dailyStats.assemblyMissed
                  ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                  : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
              }`}>
                {dailyStats.assemblyDone ? "✓ หน้าเสาธง" : dailyStats.assemblyMissed ? "✕ ขาดหน้าเสาธง" : "⏳ รอหน้าเสาธง"}
              </span>
            )}

            <span className="px-2 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
              เข้าเรียน {dailyStats.checkedClasses}/{dailyStats.classCount} วิชา
            </span>

            {dailyStats.missedClasses > 0 && (
              <span className="px-2 py-0.5 rounded-md font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 animate-pulse">
                ขาด {dailyStats.missedClasses} วิชา
              </span>
            )}
          </div>
        </div>

        {/* Timeline Items List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {allDailyItems.map((item: any, idx: number) => {
            const isChecked = item.state === "CHECKED";
            const isInProgress = item.state === "IN_PROGRESS";
            const isAboutToStart = item.state === "ABOUT_TO_START";
            const isMissed = item.state === "MISSED";

            return (
              <div 
                key={`${item.id}-${idx}`}
                className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                  isChecked 
                    ? "bg-emerald-50/50 dark:bg-emerald-950/15 border-emerald-200 dark:border-emerald-800/60"
                    : isInProgress
                    ? "bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/80 shadow-2xs ring-1 ring-amber-400/30"
                    : isAboutToStart
                    ? "bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/60"
                    : isMissed
                    ? "bg-rose-50/40 dark:bg-rose-950/15 border-rose-200 dark:border-rose-800/60"
                    : "bg-muted/15 border-border"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isChecked
                      ? "bg-emerald-500 text-white"
                      : isInProgress
                      ? "bg-amber-500 text-white animate-pulse"
                      : isAboutToStart
                      ? "bg-indigo-500 text-white"
                      : isMissed
                      ? "bg-rose-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {item.type === "ASSEMBLY" ? (
                      <Flag className="w-4 h-4" />
                    ) : (
                      <BookOpen className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="font-bold text-xs sm:text-sm text-foreground truncate">
                      {item.type === "ASSEMBLY" ? "กิจกรรมหน้าเสาธง" : `[${item.subject?.code}] ${item.subject?.name}`}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {item.startTime} - {item.endTime} น. • {item.room || "ห้องไม่ระบุ"}
                      {item.type === "MAKEUP" && " (ชดเชย)"}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    isChecked
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800"
                      : isInProgress
                      ? "bg-amber-500 text-white animate-pulse"
                      : isAboutToStart
                      ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-800"
                      : isMissed
                      ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200 border border-rose-300 dark:border-rose-800"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {isChecked ? "✓ เช็คแล้ว" : isInProgress ? "เปิดเช็คชื่อ" : isAboutToStart ? "อีก 30 นาที" : isMissed ? "✕ ขาด" : "รอเรียน"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
