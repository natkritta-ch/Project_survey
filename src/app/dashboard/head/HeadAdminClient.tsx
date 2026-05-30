"use client";

import { useState } from "react";
import { createSubject, updateSubject, deleteSubject, deleteManySubjects, restoreSubject, hardDeleteSubject, restoreAllSubjects, hardDeleteAllSubjects, createSchedule, updateSchedule, deleteSchedule, deleteManySchedules, restoreSchedule, hardDeleteSchedule, restoreAllSchedules, hardDeleteAllSchedules, createUser, updateUser, deleteUser, deleteManyUsers, restoreUser, hardDeleteUser, restoreAllUsers, hardDeleteAllUsers, toggleEditPermission, toggleGradeSubmission, toggleAllStudentsGradeSubmission, promoteStudents, clearOldGraduates, getUserDetails } from "./actions";
import AttendanceHistory from "../../../components/AttendanceHistory";
import TranscriptView from "../../../components/TranscriptView";
import HeadAdminOverview from "./HeadAdminOverview";

export default function HeadAdminClient({ subjects, schedules, users, termConfigs = [] }: { subjects: any[], schedules: any[], users: any[], termConfigs?: any[] }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  // ---------- Subjects State ----------
  const [subjId, setSubjId] = useState("");
  const [subjCode, setSubjCode] = useState("");
  const [subjName, setSubjName] = useState("");
  const [subjLevel, setSubjLevel] = useState("ปวช.1");
  const currentBEYear = new Date().getFullYear() + 543; // ปี พ.ศ. ปัจจุบัน
  const [subjAcademicYear, setSubjAcademicYear] = useState(String(currentBEYear));
  const [subjTerm, setSubjTerm] = useState("1");
  const [subjCredit, setSubjCredit] = useState<number>(3.0);
  const [subjGroup, setSubjGroup] = useState("ก.1,2");
  const [subjRoom, setSubjRoom] = useState("");
  const [isRoomDropdownOpen, setIsRoomDropdownOpen] = useState(false);
  const [roomSearchQuery, setRoomSearchQuery] = useState("");
  const [subjTeacherId, setSubjTeacherId] = useState("");
  const [filterLevel, setFilterLevel] = useState("ทั้งหมด");
  const levelsOptions = ["ปวช.1", "ปวช.2", "ปวช.3", "ปวส.1", "ปวส.2", "ปวส.1(ม.6)", "ปวส.2(ม.6)", "ไม่ระบุ"];
  const groupOptions = ["ก.1", "ก.2", "ก.1,2"];
  const roomOptions: Record<string, string[]> = {
    "ช่างเทคนิควิศวกรรมสำรวจ": ["Computer", "Surveying", "Levelling", "Route Survey", "Topographic Map", "Drawing", "สถานประกอบการ", "รง.ชร."],
    "สามัญสัมพันธ์": ["อังกฤษ 1", "อังกฤษ 2", "อังกฤษ 3", "อังกฤษ 4", "Eng 1", "Eng 2", "Eng 3", "Eng 4", "711", "712", "713", "714", "716", "721", "722", "723", "731", "732", "733", "734", "735", "736", "741", "742", "743", "744", "745", "746", "สนามฟุตบอล"],
    "สถาปัตยกรรม": ["สถ.1", "สถ.2", "สถ.3", "สถ.4", "สถ.5"],
  };
  const studentLevelsOptions = ["ปวช.1", "ปวช.2", "ปวช.3", "ปวส.1", "ปวส.2", "ปวส.1(ม.6)", "ปวส.2(ม.6)", "จบการศึกษา", "ดรอปเรียน", "พ้นสภาพ", "ไม่ระบุ"];

  // Filter teachers for the dropdown
  const teachers = users.filter(u => u.role === "TEACHER" || u.role === "HEAD");

  // ---------- Schedules State ----------
  const [schedFilterLevel, setSchedFilterLevel] = useState("ปวช.1");
  const [schedId, setSchedId] = useState("");
  const [schedSubjId, setSchedSubjId] = useState("");
  const [schedDay, setSchedDay] = useState("1");
  const [schedStart, setSchedStart] = useState("08:00");
  const [schedEnd, setSchedEnd] = useState("10:00");
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>([]);
  const [isSchedDropdownOpen, setIsSchedDropdownOpen] = useState(false);
  const [schedSearchQuery, setSchedSearchQuery] = useState("");

  // ---------- Users State ----------
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [userUsername, setUserUsername] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState("TEACHER");
  const [userLevel, setUserLevel] = useState("ปวช.1");
  const [userStudentId, setUserStudentId] = useState("");
  const [userNickname, setUserNickname] = useState("");
  const [userGender, setUserGender] = useState("");
  const [userBloodType, setUserBloodType] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userAddress, setUserAddress] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [filterUserRole, setFilterUserRole] = useState("ทั้งหมด");
  const [filterUserLevel, setFilterUserLevel] = useState("ทั้งหมด");
  const [searchUser, setSearchUser] = useState("");
  
  // ---------- Grades & Attendance State ----------
  const [viewGradesUser, setViewGradesUser] = useState<any>(null);
  const [viewAttendanceUser, setViewAttendanceUser] = useState<any>(null);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isEditSubjectModalOpen, setIsEditSubjectModalOpen] = useState(false);

  const rolesMap: Record<string, string> = { HEAD: "หัวหน้าแผนก", TEACHER: "อาจารย์", STUDENT: "นักเรียน", PARENT: "ผู้ปกครอง" };
  const daysMap: Record<number, string> = { 1: "จันทร์", 2: "อังคาร", 3: "พุธ", 4: "พฤหัสบดี", 5: "ศุกร์", 6: "เสาร์", 7: "อาทิตย์" };

  // สูตรคำนวณปีการศึกษาจากชั้นปี (คำนวณอัตโนมัติจากปีปัจจุบัน)
  // ปวช.1 = ปีปัจจุบัน, ปวช.2 = ปีที่แล้ว, ปวช.3 = 2ปีที่แล้ว, ...
  const levelToYear = (level: string): string => {
    const offsets: Record<string, number> = {
      "ปวช.1": 0,
      "ปวช.2": -1,
      "ปวช.3": -2,
      "ปวส.1": 0,
      "ปวส.2": -1,
      "ปวส.1(ม.6)": 0,
      "ปวส.2(ม.6)": -1,
    };
    const offset = offsets[level] ?? 0;
    return String(currentBEYear + offset);
  };

  // สร้างตัวเลือกปีการศึกษาแบบอัตโนมัติ (ย้อนหลัง 3 ปี)
  const yearOptions = [currentBEYear, currentBEYear - 1, currentBEYear - 2];

  // ================= SUBJECT HANDLERS =================
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = { code: subjCode, name: subjName, level: subjLevel, group: subjGroup, room: subjRoom || null, teacherId: subjTeacherId || null, academicYear: subjAcademicYear, term: subjTerm, credit: subjCredit };
      if (subjId) {
        await updateSubject(subjId, payload);
      } else {
        await createSubject(payload);
      }
      resetSubjectForm();
    } catch {
      alert("เกิดข้อผิดพลาดในการบันทึกวิชา (อาจมีรหัสวิชาซ้ำในเทอมเดียวกัน)");
    } finally {
      setIsLoading(false);
      setIsEditSubjectModalOpen(false);
    }
  };

  const handleDeleteSelectedSubjects = async () => {
    if (selectedSubjects.length === 0) return;
    if (confirm(`คุณแน่ใจหรือไม่ที่จะลบ ${selectedSubjects.length} วิชาที่เลือก? (ข้อมูลจะถูกย้ายไปทื่ถังขยะ และลบถาวรใน 7 วัน)`)) {
      setIsLoading(true);
      await deleteManySubjects(selectedSubjects);
      setSelectedSubjects([]);
      setIsLoading(false);
    }
  };

  const handleEditSubject = (s: any) => {
    setSubjId(s.id); setSubjCode(s.code); setSubjName(s.name); setSubjLevel(s.level || "ไม่ระบุ"); setSubjTeacherId(s.teacherId || "");
    setSubjAcademicYear(s.academicYear || levelToYear(s.level || "")); setSubjTerm(s.term || "1"); setSubjCredit(s.credit !== undefined ? Number(s.credit) : 3.0);
    setSubjGroup(s.group || "ก.1,2");
    setSubjRoom(s.room || "");
    setIsEditSubjectModalOpen(true);
  };

  const resetSubjectForm = () => {
    setSubjId(""); setSubjCode(""); setSubjName(""); setSubjLevel("ปวช.1"); setSubjTeacherId("");
    setSubjAcademicYear(String(currentBEYear)); setSubjTerm("1"); setSubjCredit(3.0); setSubjGroup("ก.1,2"); setSubjRoom("");
    setIsRoomDropdownOpen(false); setRoomSearchQuery("");
    setIsEditSubjectModalOpen(false);
  };

  // ================= SCHEDULE HANDLERS =================
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedSubjId) return alert("กรุณาเลือกวิชา");
    setIsLoading(true);
    try {
      if (schedId) {
        await updateSchedule(schedId, { subjectId: schedSubjId, dayOfWeek: parseInt(schedDay), startTime: schedStart, endTime: schedEnd });
      } else {
        await createSchedule({ subjectId: schedSubjId, dayOfWeek: parseInt(schedDay), startTime: schedStart, endTime: schedEnd });
      }
      resetScheduleForm();
    } catch {
      alert("เกิดข้อผิดพลาดในการบันทึกตารางเรียน");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSchedule = (sc: any) => {
    setSchedId(sc.id); setSchedSubjId(sc.subjectId); setSchedDay(sc.dayOfWeek.toString()); setSchedStart(sc.startTime); setSchedEnd(sc.endTime);
  };

  const resetScheduleForm = () => {
    setSchedId(""); setSchedSubjId(""); setSchedDay("1"); setSchedStart("08:00"); setSchedEnd("10:00");
  };

  // ================= USER HANDLERS =================
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data: any = { 
        name: userName, 
        username: userUsername, 
        role: userRole,
        nickname: userNickname,
        gender: userGender,
        bloodType: userBloodType,
        phone: userPhone,
        address: userAddress,
        email: userEmail || null
      };
      if (userRole === "STUDENT") {
        data.level = userLevel;
        data.studentId = null;
      } else if (userRole === "PARENT") {
        data.level = null;
        data.studentId = userStudentId || null;
      } else {
        data.level = null; // Clear level if not student
        data.studentId = null;
      }
      // อัปเดตพาสเวิร์ดเฉพาะตอนสร้างใหม่ หรือเมื่อมีการพิมพ์พาสเวิร์ดใหม่ตอนแก้ไข
      if (userPassword) data.password = userPassword;
      
      if (userId) {
        await updateUser(userId, data);
      } else {
        if (!userPassword) return alert("กรุณากำหนดรหัสผ่านสำหรับการสร้างผู้ใช้ใหม่");
        await createUser(data);
      }
      resetUserForm();
    } catch {
      alert("เกิดข้อผิดพลาดในการบันทึกผู้ใช้ (อาจมี Username ซ้ำ)");
    } finally {
      setIsLoading(false);
    }
    if (userId && isEditUserModalOpen) {
      setIsEditUserModalOpen(false);
    }
  };

  const handleEditUser = (u: any) => {
    setUserId(u.id); 
    setUserName(u.name); 
    setUserUsername(u.username); 
    setUserPassword(""); 
    setUserRole(u.role); 
    setUserLevel(u.level || "ปวช.1"); 
    setUserStudentId(u.studentId || "");
    setUserNickname(u.nickname || "");
    setUserGender(u.gender || "");
    setUserBloodType(u.bloodType || "");
    setUserPhone(u.phone || "");
    setUserAddress(u.address || "");
    setUserEmail(u.email || "");
    setIsEditUserModalOpen(true);
  };

  const resetUserForm = () => {
    setUserId(""); 
    setUserName(""); 
    setUserUsername(""); 
    setUserPassword(""); 
    setUserRole("TEACHER"); 
    setUserLevel("ปวช.1"); 
    setUserStudentId("");
    setUserNickname("");
    setUserGender("");
    setUserBloodType("");
    setUserPhone("");
    setUserAddress("");
    setUserEmail("");
    setIsEditUserModalOpen(false);
  };

  const handleDeleteSelectedUsers = async () => {
    if (selectedUsers.length === 0) return;
    if (confirm(`คุณแน่ใจหรือไม่ที่จะลบ ${selectedUsers.length} ผู้ใช้งานที่เลือก? (ข้อมูลจะถูกย้ายไปทื่ถังขยะ และลบถาวรใน 7 วัน)`)) {
      setIsLoading(true);
      await deleteManyUsers(selectedUsers);
      setSelectedUsers([]);
      setIsLoading(false);
    }
  };

  // ================= DISPLAY LOGIC =================
  const activeSubjects = subjects.filter(s => !s.deletedAt);
  const trashedSubjects = subjects.filter(s => !!s.deletedAt);
  const activeSchedules = schedules.filter(s => !s.deletedAt && !s.subject?.deletedAt);
  const trashedSchedules = schedules.filter(s => !!s.deletedAt);
  const activeUsers = users.filter(u => !u.deletedAt);
  const trashedUsers = users.filter(u => !!u.deletedAt);

  const displaySubjects = filterLevel === "ทั้งหมด" ? activeSubjects : activeSubjects.filter(s => s.level === filterLevel);
  const displaySchedules = schedFilterLevel === "ทั้งหมด" ? activeSchedules : activeSchedules.filter(sc => (sc.subject?.level || "ไม่ระบุ") === schedFilterLevel);
  const displayUsers = activeUsers.filter(u => {
    if (filterUserRole !== "ทั้งหมด" && u.role !== filterUserRole) return false;
    // Bug #12 fix: กรอง level ได้เสมอ ไม่ต้องกำหนดว่าต้องเลือก role=STUDENT ก่อน
    if (filterUserLevel !== "ทั้งหมด" && u.level !== filterUserLevel) return false;
    if (searchUser) {
      const searchLower = searchUser.toLowerCase();
      const matchName = u.name.toLowerCase().includes(searchLower);
      const matchUsername = u.username.toLowerCase().includes(searchLower);
      if (!matchName && !matchUsername) return false;
    }
    return true;
  });

  const activeStudents = activeUsers.filter(u => u.role === "STUDENT");
  const isAllStudentsGradesUnlocked = activeStudents.length > 0 && activeStudents.every(u => u.canSubmitGrades);

  const handlePromoteStudents = async () => {
    if (confirm("คุณแน่ใจหรือไม่ที่จะเลื่อนชั้นปีนักเรียนทั้งวิทยาลัย?\n\n- ปวช.1 -> ปวช.2, ปวช.2 -> ปวช.3, ปวส.1 -> ปวส.2\n- ปวช.3 และ ปวส.2 จะถูกเลื่อนเป็น จบการศึกษา")) {
      setIsLoading(true);
      try {
        await promoteStudents();
        alert("เลื่อนชั้นปีนักเรียนเสร็จสมบูรณ์");
      } catch (e) {
        alert("เกิดข้อผิดพลาดในการเลื่อนชั้นปี");
      }
      setIsLoading(false);
    }
  };

  const handleClearOldGraduates = async () => {
    if (confirm("คุณแน่ใจหรือไม่ที่จะลบข้อมูลนักเรียนที่ 'จบการศึกษา' ไปแล้วเกิน 2 ปี ถาวร?\n(การกระทำนี้ไม่สามารถกู้คืนได้ และจะช่วยเพิ่มพื้นที่ว่างให้ฐานข้อมูล)")) {
      setIsLoading(true);
      try {
        await clearOldGraduates();
        alert("ล้างข้อมูลผู้ที่จบการศึกษาเกิน 2 ปี เรียบร้อยแล้ว");
      } catch (e) {
        alert("เกิดข้อผิดพลาดในการล้างข้อมูล");
      }
      setIsLoading(false);
    }
  };
  const handleViewAttendance = async (u: any) => {
    setIsLoading(true);
    try {
      const details = await getUserDetails(u.id);
      setViewAttendanceUser({ ...u, ...details });
    } catch (e) {
      alert("เกิดข้อผิดพลาดในการดึงข้อมูลประวัติการเข้าเรียน");
    }
    setIsLoading(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <button onClick={() => {setActiveTab("overview");}} className={`px-6 py-3 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${activeTab === 'overview' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
          ภาพรวม (Overview)
        </button>
        <button onClick={() => {setActiveTab("subjects"); resetSubjectForm();}} className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${activeTab === 'subjects' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>จัดการวิชา</button>
        <button onClick={() => {setActiveTab("schedules"); resetScheduleForm();}} className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${activeTab === 'schedules' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>ตารางเรียน</button>
        <button onClick={() => {setActiveTab("users"); resetUserForm();}} className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${activeTab === 'users' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>จัดการผู้ใช้งาน</button>
        <button onClick={() => {setActiveTab("trash");}} className={`ml-auto px-6 py-3 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${activeTab === 'trash' ? 'border-b-2 border-red-500 text-red-600' : 'text-red-400 hover:text-red-600'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          ถังขยะ
        </button>
      </div>

      <div className="p-6 bg-slate-50 dark:bg-slate-900/50 min-h-screen">
        {/* ================= Overview Tab ================= */}
        {activeTab === "overview" && (
          <HeadAdminOverview subjects={subjects} users={users} levelsOptions={levelsOptions} termConfigs={termConfigs} />
        )}

        {/* ================= Subjects Tab ================= */}
        {activeTab === "subjects" && (
          <div className="space-y-6">
            {!isEditSubjectModalOpen && (
              <>
              <h3 className="text-lg font-bold dark:text-white">เพิ่มรายวิชาใหม่</h3>
              <form onSubmit={handleSaveSubject} className="flex gap-4 items-end flex-wrap p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">รหัสวิชา</label>
                <input required type="text" value={subjCode} onChange={e => setSubjCode(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" placeholder="e.g. CS101" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ชื่อวิชา</label>
                <input required type="text" value={subjName} onChange={e => setSubjName(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" placeholder="e.g. Computer Science" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ชั้นปี</label>
                <select value={subjLevel} onChange={e => { setSubjLevel(e.target.value); setSubjAcademicYear(levelToYear(e.target.value)); }} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border">
                  {levelsOptions.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ปีการศึกษา</label>
                <select value={subjAcademicYear} onChange={e => setSubjAcademicYear(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border">
                  {yearOptions.map(y => <option key={y} value={String(y)}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">เทอม</label>
                <select value={subjTerm} onChange={e => setSubjTerm(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border">
                  <option value="1">1</option>
                  <option value="2">2</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">หน่วยกิต</label>
                <input required type="number" step="0.5" min="0" value={subjCredit} onChange={e => setSubjCredit(parseFloat(e.target.value))} className="mt-1 block w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">กลุ่มเรียน</label>
                <select value={subjGroup} onChange={e => setSubjGroup(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border">
                  {groupOptions.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">อาจารย์ประจำวิชา (เลือกหรือไม่ก็ได้)</label>
                <select value={subjTeacherId} onChange={e => setSubjTeacherId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border">
                  <option value="">-- ไม่ระบุ --</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="relative min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ห้องเรียน</label>
                {isRoomDropdownOpen && (
                  <div className="fixed inset-0 z-40" onClick={() => setIsRoomDropdownOpen(false)}></div>
                )}
                <div className="relative z-40">
                  <div 
                    onClick={() => setIsRoomDropdownOpen(!isRoomDropdownOpen)}
                    className={`mt-1 flex items-center justify-between w-full rounded-md border shadow-sm sm:text-sm px-3 py-2 cursor-pointer bg-white dark:bg-gray-800 transition-colors ${isRoomDropdownOpen ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'}`}
                  >
                    <span className={`${subjRoom ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500'}`}>
                      {subjRoom || "-- ไม่ระบุ --"}
                    </span>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${isRoomDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>

                  {isRoomDropdownOpen && (
                    <div className="absolute w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-xl max-h-60 overflow-y-auto z-50">
                      <div className="p-2 sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 z-10 shadow-sm">
                        <input
                          type="text"
                          value={roomSearchQuery}
                          onChange={e => setRoomSearchQuery(e.target.value)}
                          placeholder="ค้นหาห้องเรียน..."
                          className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                          autoFocus
                        />
                      </div>
                      <div className="py-1">
                        <div 
                          onClick={() => { setSubjRoom(""); setIsRoomDropdownOpen(false); }}
                          className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer italic"
                        >
                          -- ไม่ระบุ --
                        </div>
                        {Object.entries(roomOptions).map(([dept, rooms]) => {
                          const filteredRooms = rooms.filter(r => !roomSearchQuery || r.toLowerCase().includes(roomSearchQuery.toLowerCase()));
                          if (filteredRooms.length === 0) return null;

                          return (
                            <div key={dept}>
                              <div className="px-3 py-1.5 text-[11px] uppercase tracking-wider font-bold bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                                {dept}
                              </div>
                              {filteredRooms.map(r => (
                                <div 
                                  key={r} 
                                  onClick={() => { setSubjRoom(r); setIsRoomDropdownOpen(false); setRoomSearchQuery(""); }}
                                  className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${subjRoom === r ? 'bg-indigo-50 text-indigo-900 border-l-2 border-indigo-500 dark:bg-indigo-900/60 dark:text-indigo-200' : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50 border-l-2 border-transparent'}`}
                                >
                                  {r}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button disabled={isLoading} type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50">
                เพิ่มวิชา
              </button>
            </form>
            </>
            )}

            <div className="flex justify-between items-end mt-8 border-t pt-6">
              <h3 className="text-lg font-bold dark:text-white">รายวิชาทั้งหมด</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm dark:text-gray-300 whitespace-nowrap flex-shrink-0">ตัวกรองชั้นปี:</span>
                <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-1 border">
                  <option value="ทั้งหมด">ทั้งหมด</option>
                  {levelsOptions.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              {selectedSubjects.length > 0 && (
                <div className="mb-3 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg flex items-center justify-between border border-red-100 dark:border-red-800">
                  <span className="text-red-700 dark:text-red-300 font-medium text-sm">
                    เลือกไว้ {selectedSubjects.length} วิชา
                  </span>
                  <button disabled={isLoading} onClick={handleDeleteSelectedSubjects} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm font-medium transition shadow-sm disabled:opacity-50 flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    ลบวิชาที่เลือก
                  </button>
                </div>
              )}
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left w-12">
                      <input 
                        type="checkbox" 
                        checked={displaySubjects.length > 0 && selectedSubjects.length === displaySubjects.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedSubjects(displaySubjects.map(s => s.id));
                          else setSelectedSubjects([]);
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชั้นปี</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">กลุ่ม</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รหัสวิชา</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อวิชา</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">นก.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ห้องเรียน</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ปี / เทอม</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">อาจารย์</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {displaySubjects.length === 0 && <tr><td colSpan={9} className="px-6 py-4 text-center text-gray-500">ไม่มีข้อมูล</td></tr>}
                  {displaySubjects.map(s => (
                    <tr key={s.id} className={subjId === s.id ? "bg-indigo-50 dark:bg-indigo-900/20" : selectedSubjects.includes(s.id) ? "bg-red-50/50 dark:bg-red-900/10" : ""}>
                      <td className="px-6 py-4 whitespace-nowrap text-left">
                        <input 
                          type="checkbox" 
                          checked={selectedSubjects.includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedSubjects(prev => [...prev, s.id]);
                            else setSelectedSubjects(prev => prev.filter(id => id !== s.id));
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600 dark:text-indigo-400">{s.level || "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{s.group || "ก.1,2"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{s.code}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{s.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{s.credit?.toFixed(1) || "3.0"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{s.room || "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{s.academicYear || levelToYear(s.level || "")} / {s.term || "1"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{s.teacher ? s.teacher.name : "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button disabled={isLoading} onClick={() => handleEditSubject(s)} className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50">แก้ไข</button>
                        <button disabled={isLoading} onClick={() => { if(confirm("ยืนยันการลบวิชานี้? (วิชาจะถูกย้ายไปถังขยะและลบถาวรใน 7 วัน)")) deleteSubject(s.id); }} className="text-red-600 hover:text-red-900 ml-4 disabled:opacity-50">ลบ</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= Schedules Tab ================= */}
        {activeTab === "schedules" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
              <div>
                <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-300">จัดการตารางเรียนแยกตามชั้นปี</h3>
                <p className="text-sm text-indigo-700 dark:text-indigo-400">เลือกชั้นปีเพื่อดูและเพิ่มตารางเรียน</p>
              </div>
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap flex-shrink-0">ชั้นปี:</span>
                <select value={schedFilterLevel} onChange={e => setSchedFilterLevel(e.target.value)} className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-1 border font-medium outline-none">
                  {levelsOptions.map(l => <option key={l} value={l}>{l}</option>)}
                  <option value="ทั้งหมด">แสดงทั้งหมด</option>
                </select>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <h3 className="text-md font-bold mb-4 dark:text-white">{schedId ? "แก้ไขวิชาเรียนในตาราง" : "เพิ่มวิชาเรียนลงตาราง"}</h3>
              <form onSubmit={handleSaveSchedule} className="flex gap-4 items-end flex-wrap">
                <div className="flex-1 min-w-[250px] relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">วิชา {schedFilterLevel !== "ทั้งหมด" ? `(เฉพาะ ${schedFilterLevel})` : ""}</label>
                  
                  {isSchedDropdownOpen && (
                    <div className="fixed inset-0 z-40" onClick={() => setIsSchedDropdownOpen(false)}></div>
                  )}

                  <div className="relative z-50">
                    <div 
                      onClick={() => setIsSchedDropdownOpen(!isSchedDropdownOpen)}
                      className={`mt-1 flex items-center justify-between w-full rounded-md border shadow-sm sm:text-sm px-3 py-2 cursor-pointer bg-white dark:bg-gray-800 transition-colors ${isSchedDropdownOpen ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'}`}
                    >
                      <span className={`${schedSubjId ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500'}`}>
                        {schedSubjId 
                          ? (() => { const s = subjects.find(x => x.id === schedSubjId); return s ? `${s.code} ${s.name}` : "-- เลือกวิชา --"; })()
                          : "-- เลือกวิชา --"}
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${isSchedDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>

                    {isSchedDropdownOpen && (
                      <div className="absolute w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-xl max-h-60 overflow-y-auto z-50">
                        <div className="p-2 sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 z-10 shadow-sm">
                          <input
                            type="text"
                            value={schedSearchQuery}
                            onChange={e => setSchedSearchQuery(e.target.value)}
                            placeholder="ค้นหารหัส หรือชื่อวิชา..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                            autoFocus
                          />
                        </div>
                        <div className="py-1">
                          <div 
                            onClick={() => { setSchedSubjId(""); setIsSchedDropdownOpen(false); }}
                            className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer italic"
                          >
                            -- ยกเลิกการเลือกวิชา --
                          </div>
                          {(schedFilterLevel === "ทั้งหมด" ? levelsOptions : [schedFilterLevel]).map(level => {
                            const levelSubjects = subjects.filter(s => {
                               if ((s.level || "ไม่ระบุ") !== level) return false;
                               if (!schedSearchQuery) return true;
                               const q = schedSearchQuery.toLowerCase();
                               return s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
                            });
                            if (levelSubjects.length === 0) return null;

                            const groupedByTermYr: Record<string, any[]> = {};
                            levelSubjects.forEach(s => {
                              const yr = s.academicYear || "-";
                              const tm = s.term || "-";
                              const key = `ชั้นปี: ${level} | ปีการศึกษา: ${yr} เทอม: ${tm}`;
                              if (!groupedByTermYr[key]) groupedByTermYr[key] = [];
                              groupedByTermYr[key].push(s);
                            });

                            const sortedTermKeys = Object.keys(groupedByTermYr).sort();

                            return sortedTermKeys.map(termKey => (
                              <div key={`${level}-${termKey}`}>
                                <div className="px-3 py-1.5 text-[11px] uppercase tracking-wider font-bold bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                                  {termKey}
                                </div>
                                {groupedByTermYr[termKey].map(s => (
                                  <div 
                                    key={s.id} 
                                    onClick={() => { setSchedSubjId(s.id); setIsSchedDropdownOpen(false); setSchedSearchQuery(""); }}
                                    className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${schedSubjId === s.id ? 'bg-indigo-50 text-indigo-900 border-l-2 border-indigo-500 dark:bg-indigo-900/60 dark:text-indigo-200' : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50 border-l-2 border-transparent'}`}
                                  >
                                    <span className="font-semibold text-gray-900 dark:text-gray-100 mr-2">{s.code}</span>
                                    <span>{s.name}</span>
                                  </div>
                                ))}
                              </div>
                            ));
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">วันที่</label>
                  <select value={schedDay} onChange={e => setSchedDay(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border outline-none">
                    {Object.entries(daysMap).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">เริ่ม</label>
                  <div className="flex items-center gap-1">
                    <select
                      value={schedStart ? schedStart.split(':')[0] : '08'}
                      onChange={e => setSchedStart(`${e.target.value}:${schedStart ? schedStart.split(':')[1] || '00' : '00'}`)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-2 py-2 border outline-none bg-white dark:bg-gray-700"
                    >
                      {Array.from({length: 24}).map((_, i) => {
                        const v = i.toString().padStart(2, '0');
                        return <option key={v} value={v}>{v}</option>;
                      })}
                    </select>
                    <span className="font-bold text-gray-500">:</span>
                    <select
                      value={schedStart ? schedStart.split(':')[1] : '00'}
                      onChange={e => setSchedStart(`${schedStart ? schedStart.split(':')[0] || '08' : '08'}:${e.target.value}`)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-2 py-2 border outline-none bg-white dark:bg-gray-700"
                    >
                      {Array.from({length: 60}).map((_, i) => {
                        const v = i.toString().padStart(2, '0');
                        return <option key={v} value={v}>{v}</option>;
                      })}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ถึง</label>
                  <div className="flex items-center gap-1">
                    <select
                      value={schedEnd ? schedEnd.split(':')[0] : '09'}
                      onChange={e => setSchedEnd(`${e.target.value}:${schedEnd ? schedEnd.split(':')[1] || '00' : '00'}`)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-2 py-2 border outline-none bg-white dark:bg-gray-700"
                    >
                      {Array.from({length: 24}).map((_, i) => {
                        const v = i.toString().padStart(2, '0');
                        return <option key={v} value={v}>{v}</option>;
                      })}
                    </select>
                    <span className="font-bold text-gray-500">:</span>
                    <select
                      value={schedEnd ? schedEnd.split(':')[1] : '00'}
                      onChange={e => setSchedEnd(`${schedEnd ? schedEnd.split(':')[0] || '09' : '09'}:${e.target.value}`)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-2 py-2 border outline-none bg-white dark:bg-gray-700"
                    >
                      {Array.from({length: 60}).map((_, i) => {
                        const v = i.toString().padStart(2, '0');
                        return <option key={v} value={v}>{v}</option>;
                      })}
                    </select>
                  </div>
                </div>
                <button disabled={isLoading} type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 font-medium h-[38px] shadow-sm">
                  {schedId ? "บันทึก" : "เพิ่ม"}
                </button>
                {schedId && (
                  <button type="button" onClick={resetScheduleForm} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 font-medium h-[38px] shadow-sm">
                    ยกเลิก
                  </button>
                )}
              </form>
            </div>

            <div className="space-y-4">
              <h3 className="text-md font-bold mb-4 dark:text-white">แผนผังตารางเรียน</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map(day => {
                  const daySchedules = displaySchedules.filter(sc => sc.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
                  
                  return (
                    <div key={day} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-full hover:shadow-md transition">
                      <div className="bg-slate-100 dark:bg-slate-700 p-2.5 text-center border-b border-gray-200 dark:border-gray-600">
                        <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm tracking-wide">{daysMap[day]}</h4>
                      </div>
                      <div className="p-3 flex-1 flex flex-col gap-3">
                        {daySchedules.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center p-4">
                            <span className="text-gray-400 text-xs font-semibold tracking-wider">ว่าง</span>
                          </div>
                        ) : (
                          daySchedules.map(sc => (
                            <div key={sc.id} className={`p-3 rounded-lg border flex flex-col relative group overflow-hidden ${schedId === sc.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 ring-1 ring-indigo-200' : 'border-gray-100 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-700/50'}`}>
                              <div className="font-bold text-[13px] text-gray-900 dark:text-white mb-1 leading-tight">
                                {sc.subject?.name}
                              </div>
                              <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-1.5 flex gap-2">
                                <span>รหัส: {sc.subject?.code}</span>
                                <span>กลุ่ม: {sc.subject?.group || "-"}</span>
                              </div>
                              <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/40 w-fit px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">
                                <svg className="w-3 h-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {sc.startTime} - {sc.endTime}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1">
                                {schedFilterLevel === "ทั้งหมด" && (
                                  <div className="text-[9px] font-extrabold uppercase bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded-sm inline-block text-gray-600 dark:text-gray-300 w-fit">
                                    {sc.subject?.level || "-"}
                                  </div>
                                )}
                                  <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm inline-block w-fit ${sc.subject?.room ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                                    🏫 ห้อง: {sc.subject?.room || "-"}
                                  </div>
                              </div>
                              
                              {/* Hover actions */}
                              <div className="absolute top-2 right-2 flex opacity-0 group-hover:opacity-100 transition-opacity gap-1 backdrop-blur-md bg-white/80 dark:bg-gray-800/80 p-0.5 rounded-md shadow-sm border border-gray-100 dark:border-gray-600">
                                <button disabled={isLoading} onClick={() => handleEditSchedule(sc)} className="text-gray-500 hover:text-indigo-600 p-1 rounded transition disabled:opacity-50" title="แก้ไข">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                                <button disabled={isLoading} onClick={() => { if(confirm(`ยืนยันการลบ "${sc.subject?.name}" ออกจากตาราง? (จะถูกย้ายไปถังขยะและลบถาวรใน 7 วัน)`)) deleteSchedule(sc.id); }} className="text-gray-500 hover:text-red-600 p-1 rounded transition disabled:opacity-50" title="ลบ">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Saturday and Sunday */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {[6, 7].map(day => {
                  const daySchedules = displaySchedules.filter(sc => sc.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
                  if (daySchedules.length === 0) return null; // Only show weekend if there are classes
                  
                  return (
                    <div key={day} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-full bg-orange-50/30 dark:bg-orange-900/10">
                      <div className="bg-orange-100 dark:bg-orange-900/40 p-2 text-center border-b border-orange-200 dark:border-orange-800">
                        <h4 className="font-bold text-orange-900 dark:text-orange-200 text-sm">{daysMap[day]}</h4>
                      </div>
                      <div className="p-3 flex-1 flex flex-col gap-2">
                        {daySchedules.map(sc => (
                          <div key={sc.id} className="p-2.5 flex justify-between items-center bg-white dark:bg-gray-800 rounded-lg border border-orange-100 dark:border-orange-800/50 shadow-sm">
                            <div>
                               <div className="font-bold text-sm text-orange-800 dark:text-orange-300 mb-1">{sc.subject?.name}</div>
                               <div className="text-[11px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded w-fit">{sc.startTime} - {sc.endTime}</div>
                            </div>
                            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden border border-gray-200 dark:border-gray-600">
                                <button disabled={isLoading} onClick={() => handleEditSchedule(sc)} className="text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-xs px-2 py-1 font-semibold transition border-r border-gray-200 dark:border-gray-600">แก้ไข</button>
                                <button disabled={isLoading} onClick={() => { if(confirm(`ยืนยันการลบ "${sc.subject?.name}" ออกจากตาราง? (จะถูกย้ายไปถังขยะและลบถาวรใน 7 วัน)`)) deleteSchedule(sc.id); }} className="text-gray-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 text-xs px-2 py-1 font-semibold transition">ลบ</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= Users Tab ================= */}
        {activeTab === "users" && (
          <div className="space-y-6">
            {!isEditUserModalOpen && (
              <>
            <h3 className="text-lg font-bold dark:text-white">เพิ่มผู้ใช้งานใหม่</h3>
            <form onSubmit={handleSaveUser} className="flex gap-4 items-end flex-wrap p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ชื่อ-นามสกุล</label>
                <input required type="text" value={userName} onChange={e => setUserName(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                <input required type="text" value={userUsername} onChange={e => setUserUsername(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                <input type="text" value={userPassword} onChange={e => setUserPassword(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" placeholder="" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">เบอร์โทร</label>
                <input type="text" value={userPhone} onChange={e => setUserPhone(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" placeholder="ไม่จำเป็น..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ที่อยู่</label>
                <input type="text" value={userAddress} onChange={e => setUserAddress(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" placeholder="ไม่จำเป็น..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">อีเมล</label>
                <input type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" placeholder="e.g. user@gmail.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">สิทธิ์</label>
                <select value={userRole} onChange={e => setUserRole(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border">
                  {Object.entries(rolesMap).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {userRole === "STUDENT" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ชั้นปี</label>
                  <select value={userLevel} onChange={e => setUserLevel(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border">
                    {studentLevelsOptions.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              )}
              {userRole === "PARENT" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">เป็นผู้ปกครองของ (ลูก)</label>
                  <select value={userStudentId} onChange={e => setUserStudentId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border">
                    <option value="">-- ไม่ระบุ --</option>
                    {users.filter(u => u.role === "STUDENT").map(u => (
                      <option key={u.id} value={u.id}>{u.name} (รหัส: {u.username})</option>
                    ))}
                  </select>
                </div>
              )}
              <button disabled={isLoading} type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50">
                เพิ่มบัญชี
              </button>
            </form>
              </>
            )}

            <div className="flex justify-between items-end mt-8 border-t pt-6">
              <h3 className="text-lg font-bold dark:text-white">ผู้ใช้งานในระบบ</h3>
              <div className="flex flex-col items-end gap-3">
                {filterUserRole === "STUDENT" && (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <div className="flex items-center gap-3 bg-white dark:bg-gray-800 px-4 py-2 rounded-md border border-gray-200 dark:border-gray-700 shadow-sm">
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">สิทธิ์กรอกเกรดทั้งหมด:</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold ${isAllStudentsGradesUnlocked ? 'text-green-600' : 'text-red-500'}`}>
                          {isAllStudentsGradesUnlocked ? "เปิดอนุญาต" : "ล็อคแล้ว"}
                        </span>
                        <button 
                          disabled={isLoading}
                          onClick={async () => { 
                            if(confirm(isAllStudentsGradesUnlocked ? "ยันยืนปิดสิทธิ์การกรอกเกรดนักเรียน 'ทุกคน'?" : "ยันยืนเปิดสิทธิ์การกรอกเกรดให้นักเรียน 'ทุกคน'?")) { 
                              setIsLoading(true); 
                              await toggleAllStudentsGradeSubmission(!isAllStudentsGradesUnlocked); 
                              setIsLoading(false); 
                            } 
                          }}
                          className={`w-9 h-5 rounded-full relative transition-colors ${isAllStudentsGradesUnlocked ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                        >
                          <span className={`absolute top-0.5 rounded-full bg-white w-4 h-4 transition-transform shadow-sm ${isAllStudentsGradesUnlocked ? 'left-4' : 'left-1'}`}></span>
                        </button>
                      </div>
                    </div>
                    <button disabled={isLoading} onClick={handlePromoteStudents} className="bg-amber-500 text-white px-3 py-2 rounded-md hover:bg-amber-600 disabled:opacity-50 text-sm font-semibold flex items-center shadow-sm">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11l7-7 7 7M5 19l7-7 7 7" /></svg>
                      เลื่อนชั้นปีนักเรียนทั้งหมด
                    </button>
                    <button disabled={isLoading} onClick={handleClearOldGraduates} className="bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600 disabled:opacity-50 text-sm font-semibold flex items-center shadow-sm">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      ล้างข้อมูลคนจบการศึกษา &gt; 2 ปี
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-4 flex-wrap justify-end">
                  <div className="flex items-center gap-2">
                    <span className="text-sm dark:text-gray-300 whitespace-nowrap flex-shrink-0">ค้นหา:</span>
                    <input 
                      type="text" 
                      value={searchUser} 
                      onChange={e => setSearchUser(e.target.value)} 
                      placeholder="พิมพ์ชื่อ หรือ Username..." 
                      className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-1 border outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  {filterUserRole === "STUDENT" && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm dark:text-gray-300 whitespace-nowrap flex-shrink-0">ชั้นปี:</span>
                      <select value={filterUserLevel} onChange={e => setFilterUserLevel(e.target.value)} className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-1 border">
                        <option value="ทั้งหมด">ทั้งหมด</option>
                        {studentLevelsOptions.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-sm dark:text-gray-300 whitespace-nowrap flex-shrink-0">หมวดหมู่:</span>
                    <select value={filterUserRole} onChange={e => {setFilterUserRole(e.target.value); setFilterUserLevel("ทั้งหมด");}} className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-1 border">
                      <option value="ทั้งหมด">ทั้งหมด</option>
                      <option value="STUDENT">นักเรียน</option>
                      <option value="TEACHER">อาจารย์</option>
                      <option value="HEAD">หัวหน้าแผนก</option>
                      <option value="PARENT">ผู้ปกครอง</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {selectedUsers.length > 0 && (
              <div className="mt-4 mb-2 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg flex items-center justify-between border border-red-100 dark:border-red-800">
                <span className="text-red-700 dark:text-red-300 font-medium text-sm">
                  เลือกผู้ใช้งาน {selectedUsers.length} คน
                </span>
                <button disabled={isLoading} onClick={handleDeleteSelectedUsers} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm font-medium transition shadow-sm disabled:opacity-50 flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  ลบผู้ใช้ที่เลือก
                </button>
              </div>
            )}

            {filterUserRole === "STUDENT" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mt-2">
                {displayUsers.length === 0 && <div className="col-span-full text-center text-gray-500 py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">ไม่มีข้อมูลนักเรียน</div>}
                {displayUsers.length > 0 && (
                  <div className="col-span-full flex items-center mb-[-10px]">
                     <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 dark:text-gray-300">
                       <input 
                         type="checkbox" 
                         checked={selectedUsers.length === displayUsers.length}
                         onChange={(e) => {
                           if (e.target.checked) setSelectedUsers(displayUsers.map(u => u.id));
                           else setSelectedUsers([]);
                         }}
                         className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                       />
                       เลือกนักเรียนทั้งหมด
                     </label>
                  </div>
                )}
                {displayUsers.map(u => (
                  <div key={u.id} className={`bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition border-2 ${userId === u.id ? 'border-indigo-500 ring-2 ring-indigo-200' : selectedUsers.includes(u.id) ? 'border-red-400 ring-2 ring-red-200 dark:border-red-600' : 'border-slate-200 dark:border-gray-700'} flex flex-col relative`}>
                    
                    {/* Top Bar / Folder Tab */}
                    <div className={`text-white px-4 py-3 flex justify-between items-center text-sm shadow-inner relative overflow-hidden ${selectedUsers.includes(u.id) ? 'bg-red-700 dark:bg-red-900' : 'bg-slate-700 dark:bg-slate-900'}`}>
                      {/* Decorative pattern for folder look */}
                      <div className="absolute -right-4 -top-10 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                      
                      <div className="flex items-center gap-2 relative z-10 w-full overflow-hidden">
                        <input 
                          type="checkbox" 
                          checked={selectedUsers.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedUsers(prev => [...prev, u.id]);
                            else setSelectedUsers(prev => prev.filter(id => id !== u.id));
                          }}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer w-4 h-4"
                        />
                        <svg className="w-5 h-5 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="font-bold tracking-wider truncate" title={`AN: ${u.username}`}>{u.username}</span>
                      </div>
                      <div className="flex bg-slate-800 dark:bg-black px-2.5 py-0.5 rounded-full border border-slate-600 shadow-inner shrink-0 relative z-10">
                         <span className="text-[10px] text-slate-300 font-bold tracking-wider uppercase">{u.level || "-"}</span>
                      </div>
                    </div>
                    
                    {/* Body - Clickable to view attendance */}
                    <div 
                      className="p-4 flex gap-4 flex-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition relative group"
                      onClick={() => handleViewAttendance(u)}
                    >
                      {/* Face Placeholder / Image */}
                      <div className="w-[76px] h-24 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 flex flex-col items-center justify-center shrink-0 shadow-inner relative overflow-hidden group-hover:border-indigo-300 dark:group-hover:border-indigo-500 transition">
                        <div className="absolute top-0 inset-x-0 h-1 bg-indigo-500/20 z-10"></div>
                        {u.profilePicture ? (
                          <img src={u.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <svg className="w-10 h-10 text-gray-300 dark:text-gray-500 mb-1 group-hover:text-indigo-400 dark:group-hover:text-indigo-300 transition" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                            <span className="text-[9px] text-indigo-500 dark:text-indigo-400 font-bold text-center leading-tight">FACE_ID<br/>✓ STORED</span>
                          </>
                        )}
                      </div>
                      
                      {/* Details */}
                      <div className="text-[13px] flex flex-col min-w-0 justify-center space-y-2 flex-1">
                        <p className="font-bold text-[15px] text-gray-900 dark:text-white leading-tight truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition" title={u.name}>{u.name}</p>
                        
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 mt-1">
                          <p className="text-gray-500 dark:text-gray-400 truncate">
                            ชื่อเล่น: <span className="font-semibold text-gray-800 dark:text-gray-200">{u.nickname || "-"}</span>
                          </p>
                          <p className="text-gray-500 dark:text-gray-400 truncate">
                            เพศ: <span className="font-semibold text-gray-800 dark:text-gray-200">{u.gender || "ไม่ระบุ"}</span>
                          </p>
                          <p className="text-gray-500 dark:text-gray-400 truncate col-span-2 flex items-center gap-1">
                            หมู่เลือด: 
                            <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-red-100 text-red-700 font-extrabold text-[10px] ring-1 ring-red-200 dark:bg-red-900 dark:text-red-200">
                              {u.bloodType || "-"}
                            </span>
                          </p>
                          <p className="text-gray-500 dark:text-gray-400 col-span-2 truncate">
                            เบอร์: <span className="font-medium text-indigo-600 dark:text-indigo-400">{u.phone || "-"}</span>
                          </p>
                          <p className="text-gray-500 dark:text-gray-400 col-span-2 line-clamp-2 text-[11px]" title={u.address || ""}>
                            ที่อยู่: <span className="text-gray-700 dark:text-gray-300">{u.address || "-"}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Permissions & Actions */}
                    <div className="bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 p-3 flex flex-col gap-3 shrink-0">
                      
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500 font-medium">สิทธิ์แก้ข้อมูล:</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-bold ${u.canEditProfile ? 'text-green-600' : 'text-red-500'}`}>
                            {u.canEditProfile ? "เปิดอนุญาต" : "ล็อคแล้ว"}
                          </span>
                          <button 
                            disabled={isLoading}
                            onClick={async () => { setIsLoading(true); await toggleEditPermission(u.id, !u.canEditProfile); setIsLoading(false); }}
                            className={`w-9 h-5 rounded-full relative transition-colors ${u.canEditProfile ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                          >
                            <span className={`absolute top-0.5 rounded-full bg-white w-4 h-4 transition-transform shadow-sm ${u.canEditProfile ? 'left-4' : 'left-1'}`}></span>
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between border-t border-gray-200/60 dark:border-gray-700 pt-3">
                        <a href={`/dashboard/head/transcript/${u.id}`} target="_blank" className="text-purple-700 hover:text-purple-900 text-xs font-bold border shadow-sm border-purple-200 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-300 px-3 py-1.5 rounded-md transition flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                          ดูผลการเรียน
                        </a>
                        <div className="flex gap-2">
                           <button disabled={isLoading} onClick={() => handleEditUser(u)} className="text-slate-600 hover:text-slate-900 border text-xs font-bold border-slate-200 bg-white hover:bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 px-3 py-1.5 rounded-md transition shadow-sm">แก้ไข</button>
                           <button disabled={isLoading} onClick={() => { if(confirm(`ยืนยันการลบ "${u.name}" ออกจากระบบ? (ข้อมูลจะถูกย้ายไปถังขยะ)`)) deleteUser(u.id); }} className="text-red-600 hover:text-red-800 border text-xs font-bold border-red-200 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300 px-3 py-1.5 rounded-md transition shadow-sm">ลบ</button>
                        </div>
                      </div>
                      
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto mt-4">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left w-12">
                        <input 
                          type="checkbox" 
                          checked={displayUsers.length > 0 && selectedUsers.length === displayUsers.length}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedUsers(displayUsers.map(u => u.id));
                            else setSelectedUsers([]);
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อ-นามสกุล</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">เบอร์โทร / ที่อยู่</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สิทธิ์</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชั้นปี</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สิทธิ์แก้ไขโปรไฟล์</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-purple-500 uppercase tracking-wider">สิทธิ์กรอกเกรด</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {displayUsers.length === 0 && <tr><td colSpan={8} className="px-6 py-4 text-center text-gray-500">ไม่มีข้อมูล</td></tr>}
                    {displayUsers.map(u => (
                      <tr key={u.id} className={userId === u.id ? "bg-indigo-50 dark:bg-indigo-900/20" : selectedUsers.includes(u.id) ? "bg-red-50/50 dark:bg-red-900/10" : ""}>
                        <td className="px-6 py-4 whitespace-nowrap text-left">
                          <input 
                            type="checkbox" 
                            checked={selectedUsers.includes(u.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedUsers(prev => [...prev, u.id]);
                              else setSelectedUsers(prev => prev.filter(id => id !== u.id));
                            }}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{u.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {u.name}
                          {u.role === "PARENT" && u.student && (
                            <span className="block text-xs text-indigo-500 mt-1 dark:text-indigo-400">บุตร: {u.student.name}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                          <div className="font-medium text-gray-900 dark:text-white mb-0.5 whitespace-nowrap">{u.phone || <span className="text-gray-400 font-normal">-</span>}</div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 max-w-[180px]" title={u.address || ""}>{u.address || <span className="text-gray-300 font-normal">-</span>}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{rolesMap[u.role] || u.role}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {u.role === "STUDENT" ? (
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              u.level === "จบการศึกษา" || u.level === "พ้นสภาพ" || u.level === "ดรอปเรียน" 
                                ? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" 
                                : u.level?.startsWith("ปวส") 
                                  ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" 
                                  : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            }`}>{u.level || "-"}</span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {u.role === "STUDENT" ? (
                            <button
                              disabled={isLoading}
                              onClick={async () => { setIsLoading(true); await toggleEditPermission(u.id, !u.canEditProfile); setIsLoading(false); }}
                              className={`px-3 py-1 text-xs font-semibold rounded-full transition ${u.canEditProfile ? 'bg-green-100 text-green-800 hover:bg-red-100 hover:text-red-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-800 dark:bg-gray-700 dark:text-gray-400'}`}
                            >
                              {u.canEditProfile ? "✓ เปิดอยู่ (กดเพื่อปิด)" : "✗ ปิดอยู่ (กดเพื่อเปิด)"}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {u.role === "STUDENT" ? (
                            <button
                              disabled={isLoading}
                              onClick={async () => { setIsLoading(true); await toggleGradeSubmission(u.id, !u.canSubmitGrades); setIsLoading(false); }}
                              className={`px-3 py-1 text-xs font-semibold rounded-full transition ${u.canSubmitGrades ? 'bg-purple-100 text-purple-800 hover:bg-red-100 hover:text-red-800 dark:bg-purple-900 dark:text-purple-200' : 'bg-gray-100 text-gray-500 hover:bg-purple-100 hover:text-purple-800 dark:bg-gray-700 dark:text-gray-400'}`}
                            >
                              {u.canSubmitGrades ? "✓ เปิดอยู่ (กดเพื่อปิด)" : "✗ ปิดอยู่ (กดเพื่อเปิด)"}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {filterUserRole === "TRASH" ? (
                            <>
                              <button disabled={isLoading} onClick={async () => { if(confirm("ยืนยันการกู้คืนข้อมูล?")) { setIsLoading(true); await restoreUser(u.id); setIsLoading(false); } }} className="text-green-600 hover:text-green-900 mr-4">กู้คืน</button>
                              <button disabled={isLoading} onClick={async () => { if(confirm("ยืนยันการลบถาวร? (ไม่สามารถกู้คืนได้)")) { setIsLoading(true); await hardDeleteUser(u.id); setIsLoading(false); } }} className="text-red-600 hover:text-red-900">ลบถาวร</button>
                            </>
                          ) : (
                            <>
                              {u.role === "STUDENT" && (
                                <a href={`/dashboard/head/transcript/${u.id}`} target="_blank" className="text-green-600 hover:text-green-900 mr-4 disabled:opacity-50 inline-block">ดูเกรด</a>
                              )}
                              <button disabled={isLoading} onClick={() => handleEditUser(u)} className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50">แก้ไข</button>
                              <button disabled={isLoading} onClick={() => { if(confirm("ยืนยันการลบผู้ใช้นี้?")) deleteUser(u.id); }} className="text-red-600 hover:text-red-900 ml-4 disabled:opacity-50">ลบ</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================= Trash Tab ================= */}
        {activeTab === "trash" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-lg mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">ระบบถังขยะอัตโนมัติ</h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                    <p>ข้อมูลที่อยู่ในถังขยะเกิน 7 วัน จะถูกลบออกจากฐานข้อมูลอย่างถาวรโดยอัตโนมัติ ไม่สามารถกู้คืนได้ โปรดตรวจสอบให้แน่ใจ</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <span className="bg-gray-200 dark:bg-gray-700 w-8 h-8 flex items-center justify-center rounded-full text-sm">{trashedSubjects.length}</span>
                  วิชาเรียนที่ถูกลบ
                </h4>
                {trashedSubjects.length > 0 && (
                  <div className="flex gap-2">
                    <button disabled={isLoading} onClick={async () => { if(confirm(`ยืนยันกู้คืนวิชาทั้งหมด ${trashedSubjects.length} รายการ?`)) { setIsLoading(true); await restoreAllSubjects(); setIsLoading(false); } }} className="text-xs font-semibold px-3 py-1.5 rounded-md bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800 transition disabled:opacity-50">กู้คืนทั้งหมด</button>
                    <button disabled={isLoading} onClick={async () => { if(confirm(`⚠️ ยืนยันลบถาวรวิชาทั้งหมด ${trashedSubjects.length} รายการ? (ไม่สามารถกู้คืนได้!)`)) { setIsLoading(true); await hardDeleteAllSubjects(); setIsLoading(false); } }} className="text-xs font-semibold px-3 py-1.5 rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800 transition disabled:opacity-50">ลบถาวรทั้งหมด</button>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">รหัสวิชา</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ชื่อวิชา</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">วันที่ลบ</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {trashedSubjects.length === 0 && <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-400">ไม่มีข้อมูล</td></tr>}
                    {trashedSubjects.map(s => (
                      <tr key={s.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{s.code}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{s.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500 text-right">{new Date(s.deletedAt).toLocaleDateString('th-TH')}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <button disabled={isLoading} onClick={async () => { if(confirm("ยืนยันกู้คืน?")) { setIsLoading(true); await restoreSubject(s.id); setIsLoading(false); } }} className="text-green-600 hover:text-green-900 mr-4 font-medium">กู้คืน</button>
                          <button disabled={isLoading} onClick={async () => { if(confirm("ยืนยันการลบถาวร? (ไม่สามารถกู้คืนได้)")) { setIsLoading(true); await hardDeleteSubject(s.id); setIsLoading(false); } }} className="text-red-600 hover:text-red-900 font-medium">ลบถาวร</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <span className="bg-gray-200 dark:bg-gray-700 w-8 h-8 flex items-center justify-center rounded-full text-sm">{trashedSchedules.length}</span>
                  ตารางเรียนที่ถูกลบ
                </h4>
                {trashedSchedules.length > 0 && (
                  <div className="flex gap-2">
                    <button disabled={isLoading} onClick={async () => { if(confirm(`ยืนยันกู้คืนตารางเรียนทั้งหมด ${trashedSchedules.length} รายการ?`)) { setIsLoading(true); await restoreAllSchedules(); setIsLoading(false); } }} className="text-xs font-semibold px-3 py-1.5 rounded-md bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800 transition disabled:opacity-50">กู้คืนทั้งหมด</button>
                    <button disabled={isLoading} onClick={async () => { if(confirm(`⚠️ ยืนยันลบถาวรตารางเรียนทั้งหมด ${trashedSchedules.length} รายการ? (ไม่สามารถกู้คืนได้!)`)) { setIsLoading(true); await hardDeleteAllSchedules(); setIsLoading(false); } }} className="text-xs font-semibold px-3 py-1.5 rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800 transition disabled:opacity-50">ลบถาวรทั้งหมด</button>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">วิชา (รหัส)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">วัน / เวลา</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {trashedSchedules.length === 0 && <tr><td colSpan={3} className="px-6 py-4 text-center text-gray-400">ไม่มีข้อมูล</td></tr>}
                    {trashedSchedules.map(sc => (
                      <tr key={sc.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{sc.subject?.name} <span className="text-gray-400">({sc.subject?.code})</span></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{daysMap[sc.dayOfWeek] || "-"} / {sc.startTime}-{sc.endTime}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <button disabled={isLoading} onClick={async () => { if(confirm("ยืนยันกู้คืน?")) { setIsLoading(true); await restoreSchedule(sc.id); setIsLoading(false); } }} className="text-green-600 hover:text-green-900 mr-4 font-medium">กู้คืน</button>
                          <button disabled={isLoading} onClick={async () => { if(confirm("ยืนยันการลบถาวร? (ไม่สามารถกู้คืนได้)")) { setIsLoading(true); await hardDeleteSchedule(sc.id); setIsLoading(false); } }} className="text-red-600 hover:text-red-900 font-medium">ลบถาวร</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <span className="bg-gray-200 dark:bg-gray-700 w-8 h-8 flex items-center justify-center rounded-full text-sm">{trashedUsers.length}</span>
                  ผู้ใช้งานที่ถูกลบ
                </h4>
                {trashedUsers.length > 0 && (
                  <div className="flex gap-2">
                    <button disabled={isLoading} onClick={async () => { if(confirm(`ยืนยันกู้คืนผู้ใช้งานทั้งหมด ${trashedUsers.length} คน?`)) { setIsLoading(true); await restoreAllUsers(); setIsLoading(false); } }} className="text-xs font-semibold px-3 py-1.5 rounded-md bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800 transition disabled:opacity-50">กู้คืนทั้งหมด</button>
                    <button disabled={isLoading} onClick={async () => { if(confirm(`⚠️ ยืนยันลบถาวรผู้ใช้งานทั้งหมด ${trashedUsers.length} คน? (ไม่สามารถกู้คืนได้!)`)) { setIsLoading(true); await hardDeleteAllUsers(); setIsLoading(false); } }} className="text-xs font-semibold px-3 py-1.5 rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800 transition disabled:opacity-50">ลบถาวรทั้งหมด</button>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username / ชื่อ</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">สิทธิ์ / ชั้นปี</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">วันที่ลบ</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {trashedUsers.length === 0 && <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-400">ไม่มีข้อมูล</td></tr>}
                    {trashedUsers.map(u => (
                      <tr key={u.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="font-medium text-gray-900 dark:text-white">{u.username}</div>
                          <div className="text-gray-500 dark:text-gray-400">{u.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {rolesMap[u.role] || u.role} {u.level ? `(${u.level})` : ""}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500 text-right">{new Date(u.deletedAt).toLocaleDateString('th-TH')}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <button disabled={isLoading} onClick={async () => { if(confirm("ยืนยันกู้คืน?")) { setIsLoading(true); await restoreUser(u.id); setIsLoading(false); } }} className="text-green-600 hover:text-green-900 mr-4 font-medium">กู้คืน</button>
                          <button disabled={isLoading} onClick={async () => { if(confirm("ยืนยันการลบถาวร? (ไม่สามารถกู้คืนได้)")) { setIsLoading(true); await hardDeleteUser(u.id); setIsLoading(false); } }} className="text-red-600 hover:text-red-900 font-medium">ลบถาวร</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
          </div>
        )}
      </div>

      {/* ================= End Tabs ================= */}

      {/* ================= Attendance Modal ================= */}
      {viewAttendanceUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 flex flex-col rounded-xl shadow-xl max-w-4xl w-full h-[90vh] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b dark:border-gray-700 shrink-0 bg-white dark:bg-gray-800 relative z-10 w-full shadow-sm">
              <div>
                <h3 className="text-xl font-bold dark:text-white">ประวัติการเข้าเรียน</h3>
                <p className="text-sm font-semibold text-gray-500 mt-1">นักเรียน: {viewAttendanceUser.name} ({viewAttendanceUser.level})</p>
              </div>
              <button onClick={() => setViewAttendanceUser(null)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-full dark:hover:bg-gray-700 transition">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-0 sm:p-4">
               {/* 
                  AttendanceHistory expects schedules and subjects arrays that apply to the student. 
                  Since it groups by day, we want to only pass schedules that belong to this student's level.
               */}
               <AttendanceHistory 
                 attendances={viewAttendanceUser.attendances || []} 
                 subjects={subjects.filter(s => s.level === viewAttendanceUser.level)} 
                 schedules={schedules.filter(sc => sc.subject?.level === viewAttendanceUser.level)} 
               />
            </div>
          </div>
        </div>
      )}

      {/* ================= Edit Subject Modal ================= */}
      {isEditSubjectModalOpen && subjId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 flex flex-col rounded-xl shadow-xl max-w-lg w-full animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700 shrink-0">
              <h3 className="text-xl font-bold dark:text-white">แก้ไขข้อมูลรายวิชา</h3>
              <button onClick={resetSubjectForm} className="text-gray-400 hover:bg-gray-100 p-2 rounded-full dark:hover:bg-gray-700 transition">✕</button>
            </div>
            
            <form onSubmit={handleSaveSubject} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">รหัสวิชา</label>
                  <input required type="text" value={subjCode} onChange={e => setSubjCode(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" placeholder="e.g. CS101" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ชื่อวิชา</label>
                  <input required type="text" value={subjName} onChange={e => setSubjName(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" placeholder="e.g. Computer Science" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ชั้นปี</label>
                  <select value={subjLevel} onChange={e => { setSubjLevel(e.target.value); setSubjAcademicYear(levelToYear(e.target.value)); }} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border">
                    {levelsOptions.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ปีการศึกษา</label>
                  <select value={subjAcademicYear} onChange={e => setSubjAcademicYear(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border">
                    {yearOptions.map(y => <option key={y} value={String(y)}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">เทอม</label>
                  <select value={subjTerm} onChange={e => setSubjTerm(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border">
                    <option value="1">1</option>
                    <option value="2">2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">กลุ่มเรียน</label>
                  <select value={subjGroup} onChange={e => setSubjGroup(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border">
                    {groupOptions.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">อาจารย์ประจำวิชา</label>
                  <select value={subjTeacherId} onChange={e => setSubjTeacherId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border">
                    <option value="">-- ไม่ระบุ --</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="relative min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ห้องเรียน</label>
                  {isRoomDropdownOpen && (
                    <div className="fixed inset-0 z-40" onClick={() => setIsRoomDropdownOpen(false)}></div>
                  )}
                  <div className="relative z-40">
                    <div 
                      onClick={() => setIsRoomDropdownOpen(!isRoomDropdownOpen)}
                      className={`mt-1 flex items-center justify-between w-full rounded-md border shadow-sm sm:text-sm px-3 py-2 cursor-pointer bg-white dark:bg-gray-800 transition-colors ${isRoomDropdownOpen ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'}`}
                    >
                      <span className={`${subjRoom ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500'}`}>
                        {subjRoom || "-- ไม่ระบุ --"}
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${isRoomDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>

                    {isRoomDropdownOpen && (
                      <div className="absolute w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-xl max-h-60 overflow-y-auto z-50">
                        <div className="p-2 sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 z-10 shadow-sm">
                          <input
                            type="text"
                            value={roomSearchQuery}
                            onChange={e => setRoomSearchQuery(e.target.value)}
                            placeholder="ค้นหาห้องเรียน..."
                            className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                            autoFocus
                          />
                        </div>
                        <div className="py-1">
                          <div 
                            onClick={() => { setSubjRoom(""); setIsRoomDropdownOpen(false); }}
                            className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer italic"
                          >
                            -- ไม่ระบุ --
                          </div>
                          {Object.entries(roomOptions).map(([dept, rooms]) => {
                            const filteredRooms = rooms.filter(r => !roomSearchQuery || r.toLowerCase().includes(roomSearchQuery.toLowerCase()));
                            if (filteredRooms.length === 0) return null;

                            return (
                              <div key={dept}>
                                <div className="px-3 py-1.5 text-[11px] uppercase tracking-wider font-bold bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                                  {dept}
                                </div>
                                {filteredRooms.map(r => (
                                  <div 
                                    key={r} 
                                    onClick={() => { setSubjRoom(r); setIsRoomDropdownOpen(false); setRoomSearchQuery(""); }}
                                    className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${subjRoom === r ? 'bg-indigo-50 text-indigo-900 border-l-2 border-indigo-500 dark:bg-indigo-900/60 dark:text-indigo-200' : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50 border-l-2 border-transparent'}`}
                                  >
                                    {r}
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
                <button type="button" onClick={resetSubjectForm} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600">
                  ยกเลิก
                </button>
                <button disabled={isLoading} type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= Edit User Modal ================= */}
      {isEditUserModalOpen && userId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 flex flex-col rounded-xl shadow-xl max-w-lg w-full animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700 shrink-0">
              <h3 className="text-xl font-bold dark:text-white">แก้ไขข้อมูลผู้ใช้งาน</h3>
              <button onClick={resetUserForm} className="text-gray-400 hover:bg-gray-100 p-2 rounded-full dark:hover:bg-gray-700 transition">✕</button>
            </div>
            
            <form onSubmit={handleSaveUser} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ชื่อ-นามสกุล</label>
                <input required type="text" value={userName} onChange={e => setUserName(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {userRole === "STUDENT" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ชื่อเล่น</label>
                      <input type="text" value={userNickname} onChange={e => setUserNickname(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">เพศ</label>
                      <select value={userGender} onChange={e => setUserGender(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border text-gray-900">
                        <option value="">- เลือก -</option>
                        <option value="ชาย">ชาย</option>
                        <option value="หญิง">หญิง</option>
                        <option value="อื่นๆ">อื่นๆ</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">หมู่เลือด</label>
                      <select value={userBloodType} onChange={e => setUserBloodType(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border text-gray-900">
                         <option value="">- เลือก -</option>
                         <option value="A">A</option>
                         <option value="B">B</option>
                         <option value="O">O</option>
                         <option value="AB">AB</option>
                      </select>
                    </div>
                  </>
                )}
                <div className={userRole !== "STUDENT" ? "col-span-2 md:col-span-1" : ""}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">เบอร์โทร</label>
                  <input type="text" value={userPhone} onChange={e => setUserPhone(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ที่อยู่</label>
                <textarea value={userAddress} onChange={e => setUserAddress(e.target.value)} rows={2} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" placeholder="รายละเอียดที่ตั้ง..."></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">อีเมล</label>
                <input type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" placeholder="e.g. user@gmail.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                <input required type="text" value={userUsername} onChange={e => setUserUsername(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password (เว้นว่างไว้หากไม่เปลี่ยน)</label>
                <input type="text" value={userPassword} onChange={e => setUserPassword(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" placeholder="********" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">สิทธิ์</label>
                <select value={userRole} onChange={e => setUserRole(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border">
                  {Object.entries(rolesMap).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {userRole === "STUDENT" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ชั้นปี</label>
                  <select value={userLevel} onChange={e => setUserLevel(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border">
                    {studentLevelsOptions.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              )}
              {userRole === "PARENT" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">เป็นผู้ปกครองของ (ลูก)</label>
                  <select value={userStudentId} onChange={e => setUserStudentId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border">
                    <option value="">-- ไม่ระบุ --</option>
                    {users.filter(u => u.role === "STUDENT").map(u => (
                      <option key={u.id} value={u.id}>{u.name} (รหัส: {u.username})</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-700">
                <button type="button" onClick={resetUserForm} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                  ยกเลิก
                </button>
                <button disabled={isLoading} type="submit" className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-indigo-700 transition shadow-sm">
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
