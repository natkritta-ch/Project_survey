"use client";

import React, { useState } from "react";
import AttendanceHistory from "../../../components/AttendanceHistory";
import TranscriptView from "../../../components/TranscriptView";
import LogoutButton from "../../../components/LogoutButton";
import StudentStatusOverview from "../../../components/StudentStatusOverview";
import { User, Clock, GraduationCap, Menu, X, Users, Home } from "lucide-react";

export default function ParentDashboardClient({
  session,
  parentData,
  childId,
  childData,
  attendances,
  childSubjects,
  childSchedules,
  childGrades
}: any) {
  const [activeTab, setActiveTab] = useState("overview"); // overview, attendance, transcript
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const tabs = [
    { id: "overview", label: "ข้อมูลทั่วไป", icon: <Home className="w-5 h-5" /> },
    { id: "attendance", label: "ประวัติบุตรหลาน", icon: <Clock className="w-5 h-5" /> },
    { id: "transcript", label: "ผลการเรียน", icon: <GraduationCap className="w-5 h-5" /> }
  ];

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  if (!childId) {
    return (
      <div className="min-h-screen bg-background flex flex-col p-8 font-sans">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-[var(--text-3xl)] font-bold text-foreground mb-2">ข้อมูลสำหรับผู้ปกครอง</h1>
          </div>
          <div className="text-sm text-muted-foreground bg-card px-5 py-3 rounded-xl shadow-sm border border-border text-right">
            <div>ผู้ใช้งาน: <span className="font-semibold text-primary text-base">{session?.user?.name}</span></div>
            <div className="mt-1.5"><LogoutButton /></div>
          </div>
        </div>
        <div className="bg-orange-50 dark:bg-orange-950/20 border-l-4 border-orange-400 p-4 rounded-xl shadow-sm max-w-2xl">
          <p className="text-orange-800 dark:text-orange-200 font-medium">
            ระบบตรวจพบว่าบัญชีของคุณยังไม่ได้ผูกกับรหัสนักเรียนใดๆ หรือรหัสนักเรียนไม่ถูกต้อง
          </p>
          <p className="text-orange-700 dark:text-orange-300 text-sm mt-2">โปรดติดต่อนักเรียนเพื่อขอ "รหัสผูกบัญชีผู้ปกครอง" หรือติดต่อฝ่ายทะเบียน</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans">
      
      {/* Mobile Top Header */}
      <div className="md:hidden bg-primary/95 backdrop-blur-md text-primary-foreground p-4 flex items-center shadow-md sticky top-0 z-40">
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg mr-3 transition-colors">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <div className="font-bold text-lg flex items-center gap-2 tracking-tight">
          <Users className="w-5 h-5" />
          ระบบผู้ปกครอง
        </div>
      </div>

      {/* Sidebar (Desktop) / Dropdown Menu (Mobile) */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-72 bg-card shadow-2xl md:shadow-none border-r border-border flex flex-col transition-transform duration-300 ease-in-out md:static md:translate-x-0 md:w-64
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-border hidden md:block bg-primary text-primary-foreground">
          <h2 className="text-xl font-bold flex items-center gap-2 tracking-tight">
            <Users className="w-6 h-6" />
            ระบบผู้ปกครอง
          </h2>
          <p className="text-primary-foreground/80 text-sm mt-1">ผู้ปกครองของ {childData?.name?.split(' ')[0]}</p>
        </div>
        
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
            P
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-foreground truncate">{parentData?.name}</p>
            <p className="text-xs text-muted-foreground truncate">ผู้ปกครอง</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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
        <div className="max-w-4xl mx-auto space-y-6 pb-24 md:pb-0">
          
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="mb-6">
                <h1 className="text-2xl md:text-[var(--text-3xl)] font-extrabold text-foreground mb-2 tracking-tight">ข้อมูลผู้ปกครองและนักเรียน</h1>
                <p className="text-muted-foreground">ตรวจสอบข้อมูลการติดต่อและข้อมูลพื้นฐานของบุตรหลาน</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
                  <h3 className="font-bold text-lg mb-4 text-foreground flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" /> ข้อมูลนักเรียนในความดูแล
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-xl border border-border">
                      <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase">รหัสนักเรียน (Username)</p>
                      <p className="font-bold text-lg text-foreground">{childData?.username}</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-xl border border-border">
                      <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase">ชื่อ-นามสกุล</p>
                      <p className="font-bold text-lg text-foreground">{childData?.name}</p>
                    </div>
                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                      <p className="text-xs text-primary/70 mb-1 font-semibold uppercase">ชั้นปี</p>
                      <p className="font-bold text-lg text-primary">{childData?.level || "ไม่ระบุ"}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-card p-6 rounded-2xl shadow-sm border border-border flex flex-col">
                  <h3 className="font-bold text-lg mb-4 text-foreground flex items-center gap-2">
                    <Users className="w-5 h-5 text-orange-500" /> ข้อมูลส่วนตัวผู้ปกครอง
                  </h3>
                  <div className="flex-1 p-5 bg-orange-50/60 dark:bg-orange-950/10 rounded-xl border border-orange-100 dark:border-orange-900/30 space-y-4">
                    <div>
                      <p className="text-xs text-orange-600/80 dark:text-orange-400/80 font-semibold uppercase tracking-wider mb-1">Username (รหัสผ่านเข้าสู่ระบบ)</p>
                      <p className="font-bold text-orange-900 dark:text-orange-200">{parentData?.username || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-orange-600/80 dark:text-orange-400/80 font-semibold uppercase tracking-wider mb-1">ชื่อ-นามสกุล</p>
                      <p className="font-bold text-orange-900 dark:text-orange-200">{parentData?.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-orange-600/80 dark:text-orange-400/80 font-semibold uppercase tracking-wider mb-1">เบอร์โทรติดต่อ</p>
                      <p className="font-bold text-orange-900 dark:text-orange-200">{parentData?.phone || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-orange-600/80 dark:text-orange-400/80 font-semibold uppercase tracking-wider mb-1">ที่อยู่</p>
                      <p className="text-sm text-orange-900 dark:text-orange-200 leading-relaxed bg-background/60 p-3 rounded-lg border border-orange-100/50 dark:border-orange-900/20">{parentData?.address || "-"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <StudentStatusOverview attendances={attendances} subjects={childSubjects} />
              </div>
            </div>
          )}

          {/* Attendance Tab */}
          {activeTab === "attendance" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h2 className="text-[var(--text-2xl)] font-bold text-foreground mb-6">ประวัติการสแกนเข้าเรียนของบุตรหลาน</h2>
              <div className="bg-card p-2 sm:p-6 rounded-2xl shadow-sm border border-border">
                <AttendanceHistory attendances={attendances} subjects={childSubjects} schedules={childSchedules} />
              </div>
            </div>
          )}

          {/* Transcript Tab */}
          {activeTab === "transcript" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="mb-6">
                <h2 className="text-[var(--text-2xl)] font-bold text-foreground mb-2">ระเบียนแสดงผลการเรียน (Transcript)</h2>
                <p className="text-muted-foreground">ผลการเรียนรวมของ {childData?.name}</p>
              </div>
              <div className="bg-card p-4 sm:p-8 rounded-2xl shadow-sm border border-border print:shadow-none print:border-none print:bg-transparent print:p-0">
                <TranscriptView grades={childGrades} />
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
