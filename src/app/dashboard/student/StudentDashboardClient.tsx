"use client";

import React, { useState } from "react";
import StudentEditProfile from "./StudentEditProfile";
import AttendanceHistory from "../../../components/AttendanceHistory";
import StudentGrades from "./StudentGrades";
import TranscriptView from "../../../components/TranscriptView";
import LogoutButton from "../../../components/LogoutButton";
import StudentStatusOverview from "../../../components/StudentStatusOverview";
import { User, Calendar, Clock, BookOpen, GraduationCap, Menu, X, Settings, Camera } from "lucide-react";

export default function StudentDashboardClient({
  session,
  myInfo,
  attendances,
  mySubjects,
  mySchedules,
  myGrades,
  groupedSchedules,
  dayColors,
  daysMap
}: any) {
  const [activeTab, setActiveTab] = useState("overview"); // overview, schedule, attendance, grades, transcript
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const tabs = [
    { id: "overview", label: "ข้อมูลของฉัน", icon: <User className="w-5 h-5" /> },
    { id: "schedule", label: "ตารางเรียน", icon: <Calendar className="w-5 h-5" /> },
    { id: "attendance", label: "ประวัติเข้าเรียน", icon: <Clock className="w-5 h-5" /> },
    { id: "grades", label: "ผลการเรียน", icon: <BookOpen className="w-5 h-5" /> },
    { id: "transcript", label: "Transcript", icon: <GraduationCap className="w-5 h-5" /> }
  ];

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans">
      
      {/* Mobile Top Header */}
      <div className="md:hidden bg-primary/95 backdrop-blur-md text-primary-foreground p-4 flex items-center shadow-sm sticky top-0 z-40 border-b border-primary/20">
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-lg mr-3">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <div className="font-bold text-lg tracking-tight">ระบบนักเรียน</div>
      </div>

      {/* Sidebar (Desktop) / Dropdown Menu (Mobile) */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-card shadow-2xl md:shadow-none border-r border-border flex flex-col transition-transform duration-300 ease-in-out md:static md:translate-x-0 md:w-64
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-border hidden md:block bg-primary text-primary-foreground">
          <h2 className="text-xl font-extrabold tracking-tight">ระบบนักเรียน</h2>
          <p className="text-primary-foreground/80 text-sm font-medium mt-1">{myInfo?.level || 'ไม่ระบุชั้นปี'}</p>
        </div>
        
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
            {myInfo?.name?.charAt(0) || "U"}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-foreground truncate">{myInfo?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{myInfo?.username}</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-left group
                ${activeTab === tab.id 
                  ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20' 
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }
              `}
            >
              <span className={`transition-transform duration-200 ${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <LogoutButton />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto w-full p-4 md:p-8">
        
        {/* Active Tab Content */}
        <div className="max-w-4xl mx-auto space-y-6 pb-24 md:pb-0">
          
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
              <div className="mb-8">
                <h1 className="text-2xl md:text-[var(--text-3xl)] font-extrabold text-foreground mb-2 tracking-tight">ยินดีต้อนรับ, <span className="text-primary">{myInfo?.nickname || myInfo?.name?.split(' ')[0]}</span> 👋</h1>
                <p className="text-muted-foreground text-sm md:text-base">ตรวจสอบข้อมูลส่วนตัวและจัดการการผูกบัญชีผู้ปกครอง</p>
              </div>

              <div className="bg-card p-6 rounded-2xl shadow-sm border border-border mb-8 transition-shadow hover:shadow-md">
                <h3 className="font-bold text-lg mb-5 text-foreground flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" /> ข้อมูลบัญชี
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  <div className="p-5 bg-primary/5 rounded-xl border border-primary/10 hover:-translate-y-1 transition-transform duration-200">
                    <p className="text-xs text-primary/70 font-bold mb-1.5 uppercase tracking-wider">รหัสนักเรียน</p>
                    <p className="font-extrabold text-2xl text-primary">{myInfo?.username}</p>
                  </div>
                  <div className="p-5 bg-accent/50 rounded-xl border border-border hover:-translate-y-1 transition-transform duration-200">
                    <p className="text-xs text-muted-foreground font-bold mb-1.5 uppercase tracking-wider">ชั้นปี</p>
                    <p className="font-extrabold text-2xl text-foreground">{myInfo?.level || "ไม่ระบุ"}</p>
                  </div>
                  <div className="p-5 bg-orange-50 dark:bg-orange-950/20 rounded-xl border border-orange-100 dark:border-orange-900/30 sm:col-span-2 lg:col-span-1 hover:-translate-y-1 transition-transform duration-200">
                    <p className="text-xs text-orange-600/70 dark:text-orange-400/70 font-bold mb-1.5 uppercase tracking-wider">รหัสผูกบัญชีผู้ปกครอง</p>
                    <p className="font-extrabold text-2xl text-orange-900 dark:text-orange-100">{myInfo?.username}</p>
                    <p className="text-[11px] font-medium text-orange-700/80 dark:text-orange-500/80 mt-2">ให้ผู้ปกครองนำรหัสนี้ไปใช้ตอนสมัครบัญชี</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div><p className="text-xs text-muted-foreground mb-1">ชื่อเล่น</p><p className="font-semibold text-foreground">{myInfo?.nickname || "-"}</p></div>
                  <div><p className="text-xs text-muted-foreground mb-1">เพศ</p><p className="font-semibold text-foreground">{myInfo?.gender || "-"}</p></div>
                  <div><p className="text-xs text-muted-foreground mb-1">หมู่เลือด</p><p className="font-semibold text-destructive">{myInfo?.bloodType || "-"}</p></div>
                  <div><p className="text-xs text-muted-foreground mb-1">เบอร์โทรติดต่อ</p><p className="font-semibold text-foreground">{myInfo?.phone || "-"}</p></div>
                  <div className="col-span-2 sm:col-span-1"><p className="text-xs text-muted-foreground mb-1">อีเมล</p><p className="font-semibold text-foreground truncate" title={myInfo?.email}>{myInfo?.email || "-"}</p></div>
                </div>
              </div>

              <StudentStatusOverview attendances={attendances} subjects={mySubjects} />

              <div className="bg-card p-6 rounded-2xl shadow-sm border border-border transition-shadow hover:shadow-md mt-8">
                <h3 className="font-bold text-lg mb-5 text-foreground flex items-center gap-2">
                  <Camera className="w-5 h-5 text-primary" /> อัปเดตข้อมูลใบหน้า
                </h3>
                <StudentEditProfile canEdit={myInfo?.canEditProfile || false} />
              </div>
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === "schedule" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h2 className="text-[var(--text-2xl)] font-bold text-foreground mb-6">ตารางเรียน {myInfo?.level ? `(${myInfo.level})` : ""}</h2>
              
              <div className="space-y-4">
                {groupedSchedules.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12 bg-card rounded-2xl border border-dashed border-border">
                    ไม่มีข้อมูลตารางเรียนในระบบ
                  </div>
                ) : (
                  groupedSchedules.map(({ day, schedules }: any) => (
                    <div key={day} className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border">
                      <div className={`px-5 py-3 font-bold flex items-center gap-2 ${dayColors[day].bg} text-white`}>
                        🗓️ {daysMap[day]}
                      </div>
                      <div className="p-3 space-y-3">
                        {schedules.map((sc: any) => (
                          <div key={sc.id} className={`flex flex-col sm:flex-row justify-between sm:items-center p-4 rounded-xl border ${dayColors[day].itemBg}`}>
                            <div className="mb-2 sm:mb-0">
                              <span className={`font-bold block text-lg ${dayColors[day].text}`}>{sc.subject.name}</span>
                              <div className="flex flex-wrap gap-2 items-center mt-1">
                                <span className={`text-sm font-semibold opacity-90 ${dayColors[day].text}`}>รหัสวิชา: {sc.subject.code}</span>
                                <span className="text-[10px] font-bold bg-white/40 dark:bg-black/20 px-2 py-0.5 rounded border border-white/30 text-foreground">กลุ่ม: {sc.subject.group || "-"}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${sc.subject.room ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted border-border text-muted-foreground'}`}>ห้อง: {sc.subject.room || "-"}</span>
                              </div>
                            </div>
                            <div className={`inline-flex items-center justify-center font-bold px-4 py-2 bg-background rounded-lg shadow-sm border border-border ${dayColors[day].text}`}>
                              <Clock className="w-4 h-4 mr-2 opacity-70" />
                              {sc.startTime} - {sc.endTime} น.
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Attendance Tab */}
          {activeTab === "attendance" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h2 className="text-[var(--text-2xl)] font-bold text-foreground mb-6">ประวัติการเข้าเรียน</h2>
              <div className="bg-card p-2 sm:p-6 rounded-2xl shadow-sm border border-border">
                <AttendanceHistory attendances={attendances} subjects={mySubjects} schedules={mySchedules} />
              </div>
            </div>
          )}

          {/* Grades Tab */}
          {activeTab === "grades" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="mb-6">
                <h2 className="text-[var(--text-2xl)] font-bold text-foreground mb-2">ผลการเรียน (เกรด)</h2>
                <p className="text-muted-foreground">ตรวจสอบและอัปเดตเกรดรายวิชา หากได้รับอนุญาตให้แก้ไขได้</p>
              </div>
              <div className="bg-card p-4 sm:p-6 rounded-2xl shadow-sm border border-border">
                <StudentGrades subjects={mySubjects} initialGrades={myGrades} canSubmitGrades={myInfo?.canSubmitGrades || false} />
              </div>
            </div>
          )}

          {/* Transcript Tab */}
          {activeTab === "transcript" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h2 className="text-[var(--text-2xl)] font-bold text-foreground mb-6 no-print">ระเบียนแสดงผลการเรียน (Transcript)</h2>
              <div className="bg-card p-4 sm:p-8 rounded-2xl shadow-sm border border-border print:shadow-none print:border-none print:bg-transparent print:p-0">
                <TranscriptView grades={myGrades} />
              </div>
            </div>
          )}

        </div>
      </div>
      
      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
