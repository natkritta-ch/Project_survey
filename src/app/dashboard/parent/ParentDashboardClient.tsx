"use client";

import React, { useState, useRef } from "react";
import AttendanceHistory from "../../../components/AttendanceHistory";
import TranscriptView from "../../../components/TranscriptView";
import LogoutButton from "../../../components/LogoutButton";
import StudentStatusOverview from "../../../components/StudentStatusOverview";
import { User, Clock, GraduationCap, Menu, X, Users, Home, ChevronDown, Search, Loader2, Sparkles } from "lucide-react";
import { showSuccess, showError } from "@/lib/alerts";

export default function ParentDashboardClient({
  session,
  parentData,
  childrenData,
  allAttendances,
  allSubjects,
  allSchedules,
  allGrades,
  allSubmissions = {}
}: any) {
  const [activeTab, setActiveTab] = useState("overview"); // overview, attendance, transcript
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const approvedChildren = childrenData?.filter((c: any) => c.linkStatus === "APPROVED") || [];
  const pendingChildren = childrenData?.filter((c: any) => c.linkStatus === "PENDING") || [];
  const rejectedChildren = childrenData?.filter((c: any) => c.linkStatus === "REJECTED") || [];
  const [activeChildId, setActiveChildId] = useState(approvedChildren[0]?.id || null);

  const [addStudentUsername, setAddStudentUsername] = useState("");
  const [addStudentNationalId, setAddStudentNationalId] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Searchable Select สำหรับเลือกนักเรียนที่จะเพิ่ม
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentSuggestions, setStudentSuggestions] = useState<any[]>([]);
  const [isSearchingStudent, setIsSearchingStudent] = useState(false);
  const [selectedStudentInfo, setSelectedStudentInfo] = useState<any | null>(null);
  const searchTimeoutRef = useRef<any>(null);

  const handleStudentSearchChange = (query: string) => {
    setStudentSearch(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!query || query.trim().length < 1) {
      setStudentSuggestions([]);
      return;
    }

    setIsSearchingStudent(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/register/search-student?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (data.success) {
          setStudentSuggestions(data.students || []);
        }
      } catch (err) {
        console.error("Failed to search students:", err);
      } finally {
        setIsSearchingStudent(false);
      }
    }, 250);
  };

  const handleSelectStudent = (st: any) => {
    setAddStudentUsername(st.username);
    setSelectedStudentInfo(st);
    setIsStudentDropdownOpen(false);
    setStudentSearch("");
  };

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      const res = await fetch("/api/parent-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentUsername: addStudentUsername, studentNationalId: addStudentNationalId })
      });
      const data = await res.json();
      if (data.success) {
        await showSuccess("ส่งคำขอสำเร็จ", data.message || "กรุณารอให้นักเรียนกดยืนยันการผูกบัญชีจากหน้าจอของนักเรียน");
        setAddStudentUsername("");
        setAddStudentNationalId("");
        window.location.reload(); // Refresh to show pending child
      } else {
        showError("ไม่สามารถส่งคำขอได้", data.message || "กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง");
      }
    } catch (e) {
      showError("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
    }
    setIsAdding(false);
  };

  const tabs = [
    { id: "overview", label: "ข้อมูลทั่วไป", icon: <Home className="w-5 h-5" /> },
    { id: "attendance", label: "ประวัติเข้าเรียน", icon: <Clock className="w-5 h-5" /> },
    { id: "transcript", label: "ผลการเรียน", icon: <GraduationCap className="w-5 h-5" /> }
  ];

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  const activeChild = approvedChildren.find((c: any) => c.id === activeChildId);
  const attendances = activeChildId ? (allAttendances[activeChildId] || []) : [];
  const childSubjects = activeChildId ? (allSubjects[activeChildId] || []) : [];
  const childSchedules = activeChildId ? (allSchedules[activeChildId] || []) : [];
  const childGrades = activeChildId ? (allGrades[activeChildId] || []) : [];
  const childSubmissions = activeChildId ? (allSubmissions[activeChildId] || []) : [];

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
              disabled={!activeChildId}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-left group
                ${activeTab === tab.id 
                  ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20' 
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }
                ${!activeChildId ? 'opacity-50 cursor-not-allowed' : ''}
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
          
          {/* Child Selector */}
          {approvedChildren.length > 0 && (
            <div className="bg-card p-4 rounded-2xl shadow-sm border border-border flex items-center gap-4 flex-wrap">
              <span className="font-semibold text-foreground">เลือกบุตรหลานที่ต้องการดูข้อมูล:</span>
              <div className="flex gap-2 flex-wrap">
                {approvedChildren.map((child: any) => (
                  <button
                    key={child.id}
                    onClick={() => setActiveChildId(child.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
                      activeChildId === child.id 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'bg-background text-foreground border-border hover:bg-accent'
                    }`}
                  >
                    {child.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* แจ้งเตือนกรณีถูกยกเลิกการผูกบัญชี */}
          {rejectedChildren.length > 0 && (
            <div className="bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 p-4 rounded-xl shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-red-800 dark:text-red-200 font-bold flex items-center gap-2">
                    <span>⚠️</span> การผูกบัญชีกับบุตรหลานถูกยกเลิก:
                  </p>
                  <ul className="mt-1 text-sm text-red-700 dark:text-red-300 list-disc list-inside">
                    {rejectedChildren.map((child: any) => (
                      <li key={child.id}>{child.name} ({child.username})</li>
                    ))}
                  </ul>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    หากนักเรียนเผลอยกเลิกผิดพลาดหรือต้องการเชื่อมต่อใหม่ สามารถกดปุ่มเพื่อส่งคำขอผูกใหม่อีกครั้งได้ทันที
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {rejectedChildren.map((child: any) => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => {
                        setAddStudentUsername(child.username);
                        setSelectedStudentInfo(child);
                      }}
                      className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-2 rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      ส่งคำขอผูกกับ {child.name} ใหม่
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* แจ้งเตือนกรณีผู้ปกครองใหม่ที่ยังไม่มีนักเรียนเลย */}
          {approvedChildren.length === 0 && pendingChildren.length === 0 && rejectedChildren.length === 0 && (
            <div className="bg-orange-50 dark:bg-orange-950/20 border-l-4 border-orange-400 p-4 rounded-xl shadow-sm">
              <p className="text-orange-800 dark:text-orange-200 font-bold">
                ระบบตรวจพบว่าบัญชีของคุณยังไม่ได้ผูกกับรหัสนักเรียนใดๆ
              </p>
              <p className="text-orange-700 dark:text-orange-300 text-sm mt-1">
                โปรดค้นหาและเลือกชื่อนักเรียน หรือระบุรหัสนักเรียน และเลขบัตรประชาชน 4 ตัวท้ายในแบบฟอร์มด้านล่างเพื่อส่งคำขอผูกบัญชี
              </p>
            </div>
          )}

          {pendingChildren.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded-xl shadow-sm">
              <p className="text-yellow-800 dark:text-yellow-200 font-bold">รอการอนุมัติการเข้าถึงข้อมูลจากนักเรียน:</p>
              <ul className="mt-2 text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                {pendingChildren.map((child: any) => (
                  <li key={child.id}>{child.name} (รหัส: {child.username})</li>
                ))}
              </ul>
              <p className="text-xs text-yellow-700/90 dark:text-yellow-400 mt-1">
                (กรุณาแจ้งให้นักเรียนเข้าสู่ระบบบัญชีนักเรียนเพื่อกดปุ่ม &quot;อนุมัติ&quot;)
              </p>
            </div>
          )}

          {/* Form ขอเพิ่มบุตรหลาน */}
          <div className="bg-card p-4 rounded-2xl shadow-sm border border-border mt-4">
            <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> เพิ่มบัญชีบุตรหลานที่ต้องการติดตาม
            </h3>
            <form onSubmit={handleAddChild} className="flex flex-col sm:flex-row gap-3">
              {/* Searchable Select Combobox สำหรับค้นหาและเลือกนักเรียน */}
              <div className="flex-1 relative">
                {isStudentDropdownOpen && (
                  <div className="fixed inset-0 z-40" onClick={() => setIsStudentDropdownOpen(false)}></div>
                )}

                <div className="relative z-40">
                  <div
                    onClick={() => setIsStudentDropdownOpen(!isStudentDropdownOpen)}
                    className={`flex items-center justify-between w-full px-4 py-2 bg-background border rounded-xl text-sm cursor-pointer transition-colors ${
                      isStudentDropdownOpen 
                        ? 'border-primary ring-2 ring-primary/20' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Users className="w-4 h-4 text-primary shrink-0" />
                      <span className={addStudentUsername ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                        {selectedStudentInfo 
                          ? `${selectedStudentInfo.name} (${selectedStudentInfo.username}) - ชั้น ${selectedStudentInfo.level || "ไม่ระบุ"}`
                          : (addStudentUsername || "-- ค้นหาและเลือกนักเรียน --")
                        }
                      </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${isStudentDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {isStudentDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1.5 w-full sm:w-96 bg-card border border-border rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50 animate-in fade-in zoom-in-95">
                      <div className="p-2.5 sticky top-0 bg-card border-b border-border z-10 shadow-sm">
                        <div className="relative">
                          <input
                            type="text"
                            value={studentSearch}
                            onChange={e => handleStudentSearchChange(e.target.value)}
                            placeholder="พิมพ์ชื่อ หรือ รหัสนักเรียน..."
                            className="w-full pl-8 pr-3 py-1.5 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            autoFocus
                          />
                          <Search className="w-4 h-4 text-muted-foreground absolute left-2.5 top-2" />
                          {isSearchingStudent && (
                            <Loader2 className="w-4 h-4 animate-spin text-primary absolute right-2.5 top-2" />
                          )}
                        </div>
                      </div>

                      <div className="py-1 divide-y divide-border">
                        {studentSuggestions.map(st => (
                          <div
                            key={st.id}
                            onClick={() => handleSelectStudent(st)}
                            className={`p-3 cursor-pointer transition-colors flex items-center justify-between hover:bg-primary/10 ${
                              addStudentUsername === st.username ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">{st.name}</span>
                                <span className="text-xs text-muted-foreground font-mono">({st.username})</span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                ชั้น {st.level || "ไม่ระบุ"}
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              {st.level || "-"}
                            </span>
                          </div>
                        ))}

                        {studentSearch && !isSearchingStudent && studentSuggestions.length === 0 && (
                          <div className="p-4 text-center text-xs text-muted-foreground italic">
                            ไม่พบนักเรียนที่ค้นหา
                          </div>
                        )}

                        {!studentSearch && studentSuggestions.length === 0 && (
                          <div className="p-3 text-center text-xs text-muted-foreground">
                            พิมพ์ชื่อหรือรหัสนักเรียนในช่องค้นหาด้านบน
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <input
                  required
                  type="text"
                  maxLength={4}
                  placeholder="เลขบัตรประชาชน 4 ตัวท้าย"
                  className="w-full px-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  value={addStudentNationalId}
                  onChange={(e) => setAddStudentNationalId(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={isAdding}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
              >
                {isAdding ? "กำลังส่งคำขอ..." : "ส่งคำขอ"}
              </button>
            </form>
          </div>

          {!activeChildId && approvedChildren.length === 0 ? (
            <div className="text-center text-muted-foreground p-10 bg-card rounded-2xl border border-dashed border-border mt-8 shadow-sm">
              <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-bold text-foreground text-base">ยังไม่มีข้อมูลนักเรียนที่ได้รับการอนุมัติ</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                เมื่อนักเรียนกดยืนยันอนุมัติคำขอ ข้อมูลส่วนตัว ผลการเรียน ประวัติการเข้าเรียน และตารางเรียนจะปรากฏที่หน้านี้โดยอัตโนมัติ
              </p>
            </div>
          ) : activeChild && (
            <>
              {/* Overview Tab */}
              {activeTab === "overview" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
                      <h3 className="font-bold text-lg mb-4 text-foreground flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" /> ข้อมูลนักเรียนในความดูแล
                      </h3>
                      <div className="space-y-4">
                        <div className="p-4 bg-muted/50 rounded-xl border border-border">
                          <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase">รหัสนักเรียน</p>
                          <p className="font-bold text-lg text-foreground">{activeChild.username}</p>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-xl border border-border">
                          <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase">ชื่อ-นามสกุล</p>
                          <p className="font-bold text-lg text-foreground">{activeChild.name}</p>
                        </div>
                        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                          <p className="text-xs text-primary/70 mb-1 font-semibold uppercase">ชั้นปี</p>
                          <p className="font-bold text-lg text-primary">{activeChild.level || "ไม่ระบุ"}</p>
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
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 mt-6">
                  <h2 className="text-[var(--text-2xl)] font-bold text-foreground mb-6">ประวัติการสแกนเข้าเรียนของ {activeChild.name}</h2>
                  <div className="bg-card p-2 sm:p-6 rounded-2xl shadow-sm border border-border">
                    <AttendanceHistory attendances={attendances} subjects={childSubjects} schedules={childSchedules} />
                  </div>
                </div>
              )}

              {/* Transcript Tab */}
              {activeTab === "transcript" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 mt-6">
                  <div className="mb-6">
                    <h2 className="text-[var(--text-2xl)] font-bold text-foreground mb-2">ระเบียนแสดงผลการเรียน (Transcript)</h2>
                    <p className="text-muted-foreground">ผลการเรียนรวมของ {activeChild.name}</p>
                  </div>
                  <div className="bg-card p-4 sm:p-8 rounded-2xl shadow-sm border border-border print:shadow-none print:border-none print:bg-transparent print:p-0">
                    <TranscriptView 
                      grades={childGrades} 
                      submissions={childSubmissions} 
                      studentName={activeChild?.name} 
                      studentUsername={activeChild?.username} 
                      studentLevel={activeChild?.level} 
                    />
                  </div>
                </div>
              )}
            </>
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
