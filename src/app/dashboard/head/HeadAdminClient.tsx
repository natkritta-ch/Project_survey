"use client";

import { useState, useMemo } from "react";
import { createSubject, updateSubject, deleteSubject, deleteManySubjects, restoreSubject, hardDeleteSubject, restoreAllSubjects, hardDeleteAllSubjects, createSchedule, updateSchedule, deleteSchedule, deleteManySchedules, restoreSchedule, hardDeleteSchedule, restoreAllSchedules, hardDeleteAllSchedules, createUser, updateUser, deleteUser, deleteManyUsers, restoreUser, hardDeleteUser, restoreAllUsers, hardDeleteAllUsers, toggleEditPermission, promoteStudents, clearOldGraduates, getUserDetails, generateParentCodesForAllStudents } from "./actions";
import AttendanceHistory from "../../../components/AttendanceHistory";
import HeadAdminOverview from "./HeadAdminOverview";
import HeadProgressionManagement from "./HeadProgressionManagement";
import HeadAdvisorManagement from "./HeadAdvisorManagement";
import { showSuccess, showError, showWarning, showInfo, showToast, showConfirm } from "@/lib/alerts";
import { Eye, EyeOff } from "lucide-react";

export default function HeadAdminClient({ subjects, schedules, users, termConfigs = [], makeupClasses = [] }: { subjects: any[], schedules: any[], users: any[], termConfigs?: any[], makeupClasses?: any[] }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [makeupClassesList, setMakeupClassesList] = useState<any[]>(makeupClasses || []);

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
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState("");
  const [isSubjectSuggestOpen, setIsSubjectSuggestOpen] = useState(false);
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [filterLevel, setFilterLevel] = useState("ปวช.1");
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
  const allRoomsList = useMemo(() => Object.values(roomOptions).flat(), []);
  const selectedTeacher = teachers.find(t => t.id === subjTeacherId);
  const isShowingSelectedTeacher = !!selectedTeacher && teacherSearchQuery === selectedTeacher.name;
  const filteredTeachers = teachers.filter(t => {
    if (!teacherSearchQuery || isShowingSelectedTeacher) return true;
    return t.name.toLowerCase().includes(teacherSearchQuery.toLowerCase());
  });
  const isExactRoom = allRoomsList.includes(subjRoom);

  // ---------- Schedules State ----------
  const currentTermConfig = termConfigs.find((t: any) => t.isCurrent);
  const defaultTermValue = currentTermConfig
    ? `${currentTermConfig.term}/${currentTermConfig.academicYear}`
    : (termConfigs.length > 0 ? `${termConfigs[0].term}/${termConfigs[0].academicYear}` : `1/${currentBEYear}`);

  const [schedFilterTerm, setSchedFilterTerm] = useState<string>(defaultTermValue);
  const [filterSubjTerm, setFilterSubjTerm] = useState<string>(defaultTermValue);
  const [schedFilterLevel, setSchedFilterLevel] = useState("ปวช.1");
  const [schedFilterGroup, setSchedFilterGroup] = useState("ทั้งหมด");
  const [schedId, setSchedId] = useState("");
  const [schedSubjId, setSchedSubjId] = useState("");
  const [schedDay, setSchedDay] = useState("1");
  const [schedStart, setSchedStart] = useState("08:00");
  const [schedEnd, setSchedEnd] = useState("10:00");
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>([]);
  const [isSchedDropdownOpen, setIsSchedDropdownOpen] = useState(false);
  const [schedSearchQuery, setSchedSearchQuery] = useState("");
  const [isEditScheduleModalOpen, setIsEditScheduleModalOpen] = useState(false);

  // ---------- Users State ----------
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [userUsername, setUserUsername] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [showEditUserPassword, setShowEditUserPassword] = useState(false);
  const [userRole, setUserRole] = useState("STUDENT");
  const [userLevel, setUserLevel] = useState("ปวช.1");
  const [userNickname, setUserNickname] = useState("");
  const [userGender, setUserGender] = useState("");
  const [userBloodType, setUserBloodType] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userAddress, setUserAddress] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userStudentId, setUserStudentId] = useState("");
  const [userParentCode, setUserParentCode] = useState("");
  const [isParentCodesModalOpen, setIsParentCodesModalOpen] = useState(false);
  const [parentCodeSearch, setParentCodeSearch] = useState("");
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [filterUserRole, setFilterUserRole] = useState("STUDENT");
  const [filterUserLevel, setFilterUserLevel] = useState("ทั้งหมด");
  const [searchUser, setSearchUser] = useState("");
  
  // ---------- Attendance State ----------
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
        showToast("บันทึกการแก้ไขวิชาเรียบร้อยแล้ว", "success");
      } else {
        await createSubject(payload);
        showToast("เพิ่มรายวิชาใหม่เรียบร้อยแล้ว", "success");
        setIsAddSubjectOpen(false);
      }
      resetSubjectForm();
    } catch {
      showError("เกิดข้อผิดพลาดในการบันทึกวิชา", "อาจมีรหัสวิชา, กลุ่มเรียน และชั้นปีซ้ำในเทอมเดียวกัน กรุณาตรวจสอบข้อมูล");
    } finally {
      setIsLoading(false);
      setIsEditSubjectModalOpen(false);
    }
  };

  const handleDeleteSelectedSubjects = async () => {
    if (selectedSubjects.length === 0) return;
    const confirmed = await showConfirm({
      title: "ยืนยันการลบวิชาที่เลือก?",
      text: `คุณแน่ใจหรือไม่ที่จะลบ ${selectedSubjects.length} วิชาที่เลือก?\n(ข้อมูลจะถูกย้ายไปที่ถังขยะ และลบถาวรใน 7 วัน)`,
      confirmText: "ลบวิชา",
      cancelText: "ยกเลิก",
      isDanger: true,
    });
    if (confirmed) {
      setIsLoading(true);
      await deleteManySubjects(selectedSubjects);
      setSelectedSubjects([]);
      setIsLoading(false);
      showToast("ย้ายวิชาที่เลือกไปถังขยะเรียบร้อยแล้ว", "success");
    }
  };

  const handleEditSubject = (s: any) => {
    setSubjId(s.id); setSubjCode(s.code); setSubjName(s.name); setSubjLevel(s.level || "ไม่ระบุ"); setSubjTeacherId(s.teacherId || "");
    const foundTeacher = teachers.find(t => t.id === s.teacherId);
    setTeacherSearchQuery(s.teacher?.name || foundTeacher?.name || "");
    setSubjAcademicYear(s.academicYear || levelToYear(s.level || "")); setSubjTerm(s.term || "1"); setSubjCredit(s.credit !== undefined ? Number(s.credit) : 3.0);
    setSubjGroup(s.group || "ก.1,2");
    setSubjRoom(s.room || "");
    setRoomSearchQuery(s.room || "");
    setIsEditSubjectModalOpen(true);
  };

  const resetSubjectForm = () => {
    setSubjId(""); setSubjCode(""); setSubjName(""); setSubjLevel("ปวช.1"); setSubjTeacherId("");
    setTeacherSearchQuery("");
    setSubjAcademicYear(String(currentBEYear)); setSubjTerm("1"); setSubjCredit(3.0); setSubjGroup("ก.1,2"); setSubjRoom("");
    setRoomSearchQuery("");
    setIsRoomDropdownOpen(false);
    setIsTeacherDropdownOpen(false);
    setIsSubjectSuggestOpen(false);
    setIsEditSubjectModalOpen(false);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedSubjId) return showWarning("กรุณาเลือกวิชา", "โปรดเลือกรายวิชาก่อนบันทึกตารางเรียน");
    setIsLoading(true);
    try {
      if (schedId) {
        await updateSchedule(schedId, { subjectId: schedSubjId, dayOfWeek: parseInt(schedDay), startTime: schedStart, endTime: schedEnd });
        showToast("แก้ไขตารางเรียนสำเร็จ", "success");
      } else {
        await createSchedule({ subjectId: schedSubjId, dayOfWeek: parseInt(schedDay), startTime: schedStart, endTime: schedEnd });
        showToast("เพิ่มคาบเรียนลงในตารางสำเร็จ", "success");
      }
      resetScheduleForm();
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("TIME_COLLISION")) {
        showWarning("เวลาเรียนชนกัน!", msg.replace("TIME_COLLISION: ", ""));
      } else {
        showError("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกตารางเรียนได้");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSchedule = (sc: any) => {
    setSchedId(sc.id); 
    setSchedSubjId(sc.subjectId); 
    setSchedDay(sc.dayOfWeek.toString()); 
    setSchedStart(sc.startTime); 
    setSchedEnd(sc.endTime);
    const el = document.getElementById("schedule-form-section");
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
        if (userParentCode) data.parentCode = userParentCode.trim().toUpperCase();
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
        showToast("บันทึกข้อมูลผู้ใช้เรียบร้อยแล้ว", "success");
      } else {
        if (!userPassword) return showWarning("กรุณากำหนดรหัสผ่าน", "โปรดตั้งรหัสผ่านสำหรับการสร้างผู้ใช้ใหม่");
        await createUser(data);
        showToast("สร้างผู้ใช้ใหม่เรียบร้อยแล้ว", "success");
      }
      resetUserForm();
    } catch {
      showError("เกิดข้อผิดพลาดในการบันทึกผู้ใช้", "อาจมี Username ซ้ำในระบบ กรุณาลองใช้ Username อื่น");
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
    setUserNickname(u.nickname || "");
    setUserGender(u.gender || "");
    setUserBloodType(u.bloodType || "");
    setUserPhone(u.phone || "");
    setUserAddress(u.address || "");
    setUserEmail(u.email || "");
    setUserParentCode(u.parentCode || "");
    setUserStudentId(u.approvedChildren?.[0]?.id || u.studentId || "");
    setIsStudentDropdownOpen(false);
    setStudentSearchQuery("");
    setShowEditUserPassword(false);
    setIsEditUserModalOpen(true);
  };

  const resetUserForm = () => {
    setUserId(""); 
    setUserName(""); 
    setUserUsername(""); 
    setUserPassword(""); 
    setShowUserPassword(false);
    setShowEditUserPassword(false);
    setUserRole("STUDENT"); 
    setUserLevel("ปวช.1"); 
    setUserNickname("");
    setUserGender("");
    setUserBloodType("");
    setUserPhone("");
    setUserAddress("");
    setUserEmail("");
    setUserParentCode("");
    setUserStudentId("");
    setIsStudentDropdownOpen(false);
    setStudentSearchQuery("");
    setIsEditUserModalOpen(false);
  };

  const handlePrintParentCodes = () => {
    const studentsToPrint = users
      .filter((u: any) => u.role === "STUDENT" && !u.deletedAt)
      .filter((u: any) => {
        if (!parentCodeSearch) return true;
        const q = parentCodeSearch.toLowerCase().trim();
        return (
          u.name?.toLowerCase().includes(q) ||
          u.username?.toLowerCase().includes(q) ||
          u.level?.toLowerCase().includes(q) ||
          u.parentCode?.toLowerCase().includes(q)
        );
      });

    if (studentsToPrint.length === 0) {
      showWarning("ไม่พบข้อมูล", "ไม่มีข้อมูลนักเรียนที่ตรงกับเงื่อนไขการพิมพ์");
      return;
    }

    // สร้าง iframe ซ่อนสำหรับสั่งพิมพ์โดยตรง ไม่ต้องเปิดแท็บใหม่
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
      showError("ไม่สามารถสั่งพิมพ์ได้", "เกิดข้อผิดพลาดในการสร้างหน้าพิมพ์");
      return;
    }

    const rowsHtml = studentsToPrint
      .map(
        (st: any, idx: number) => `
        <tr>
          <td style="text-align: center; border: 1px solid #d1d5db; padding: 6px 8px;">${idx + 1}</td>
          <td style="border: 1px solid #d1d5db; padding: 6px 8px; font-family: monospace; font-weight: bold;">${st.username}</td>
          <td style="border: 1px solid #d1d5db; padding: 6px 8px; font-weight: 500;">${st.name}</td>
          <td style="text-align: center; border: 1px solid #d1d5db; padding: 6px 8px;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background-color: #eff6ff; border: 1px solid #bfdbfe; font-size: 11px; font-weight: bold; color: #1e40af;">
              ${st.level || "-"}
            </span>
          </td>
          <td style="text-align: center; border: 1px solid #d1d5db; padding: 6px 8px;">
            <span style="font-family: monospace; font-size: 13px; font-weight: bold; letter-spacing: 1px; color: #92400e; background-color: #fef3c7; border: 1px dashed #d97706; padding: 3px 8px; border-radius: 4px; display: inline-block;">
              ${st.parentCode || "ยังไม่มีรหัส"}
            </span>
          </td>
        </tr>`
      )
      .join("");

    const nowStr = new Date().toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>รหัสผูกผู้ปกครอง (Parent Codes)</title>
          <style>
            @page { size: A4 portrait; margin: 12mm 15mm 15mm 15mm; }
            body { 
              font-family: 'Sarabun', 'Segoe UI', Tahoma, Arial, sans-serif; 
              color: #111827; 
              margin: 0; 
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #374151; padding-bottom: 10px; }
            h1 { margin: 0 0 4px 0; font-size: 18px; color: #111827; }
            .subtitle { margin: 0; font-size: 12px; color: #4b5563; }
            .meta { display: flex; justify-content: space-between; font-size: 11px; color: #6b7280; margin-top: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
            th { border: 1px solid #d1d5db; background-color: #f3f4f6 !important; padding: 7px 8px; text-align: left; font-weight: bold; color: #374151; font-size: 12px; }
            .notice {
              margin-top: 18px;
              padding: 10px 14px;
              background-color: #f9fafb !important;
              border: 1px dashed #9ca3af;
              border-radius: 6px;
              font-size: 11px;
              color: #374151;
              line-height: 1.5;
            }
            .footer { margin-top: 12px; text-align: right; font-size: 10px; color: #9ca3af; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>รายการรหัสผูกผู้ปกครอง (Parent Codes)</h1>
            <p class="subtitle">ระบบสารสนเทศและการเช็กชื่อเข้าเรียน</p>
            <div class="meta">
              <span>จำนวนนักเรียน: ${studentsToPrint.length} คน</span>
              <span>วันที่พิมพ์: ${nowStr} น.</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 45px; text-align: center;">ลำดับ</th>
                <th style="width: 125px;">รหัสนักศึกษา</th>
                <th>ชื่อ - นามสกุล</th>
                <th style="width: 85px; text-align: center;">ระดับชั้น</th>
                <th style="width: 165px; text-align: center;">รหัสผูกผู้ปกครอง (Parent Code)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="notice">
            <strong>📌 คำแนะนำสำหรับผู้ปกครอง:</strong> นำรหัส <strong>Parent Code</strong> ของบุตรหลานไปลงทะเบียนที่เว็บไซต์ของสถานศึกษา (เลือกเมนู <em>"ลงทะเบียนผู้ปกครอง"</em>) เมื่อกรอกรหัสถูกต้อง บัญชีจะเชื่อมต่อกับบุตรหลานและอนุมัติทันที
          </div>

          <div class="footer">พิมพ์จากระบบโดย: หัวหน้าแผนก / ฝ่ายบริหาร</div>
        </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      try {
        iframe.contentWindow?.print();
      } catch (err) {
        console.error("Print error:", err);
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }
    }, 250);
  };

  const handleDeleteSelectedUsers = async () => {
    if (selectedUsers.length === 0) return;
    const confirmed = await showConfirm({
      title: "ยืนยันการลบผู้ใช้ที่เลือก?",
      text: `คุณแน่ใจหรือไม่ที่จะลบ ${selectedUsers.length} ผู้ใช้งานที่เลือก?\n(ข้อมูลจะถูกย้ายไปที่ถังขยะ และลบถาวรใน 7 วัน)`,
      confirmText: "ลบผู้ใช้",
      cancelText: "ยกเลิก",
      isDanger: true,
    });
    if (confirmed) {
      setIsLoading(true);
      await deleteManyUsers(selectedUsers);
      setSelectedUsers([]);
      setIsLoading(false);
      showToast("ย้ายผู้ใช้ที่เลือกไปถังขยะเรียบร้อยแล้ว", "success");
    }
  };

  // ================= DISPLAY LOGIC =================
  const activeSubjects = subjects.filter(s => !s.deletedAt);
  const trashedSubjects = subjects.filter(s => !!s.deletedAt);
  const activeSchedules = schedules.filter(s => !s.deletedAt && !s.subject?.deletedAt);
  const trashedSchedules = schedules.filter(s => !!s.deletedAt);
  const activeUsers = users.filter(u => !u.deletedAt);
  const trashedUsers = users.filter(u => !!u.deletedAt);
  const trashedMakeupClasses = makeupClassesList.filter(m => !!m.deletedAt);

  const handleRestoreMakeupHead = async (id: string, name?: string) => {
    const ok = await showConfirm({
      title: "ยืนยันกู้คืนคลาสสอนชดเชย?",
      text: `ต้องการกู้คืนคลาส "${name || ''}" กลับสู่ตารางการสอนใช่หรือไม่?`,
      confirmText: "กู้คืน",
      icon: "question"
    });
    if (!ok) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/makeup-classes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'restore' })
      });
      if (res.ok) {
        setMakeupClassesList(prev => prev.map(m => m.id === id ? { ...m, deletedAt: null } : m));
        showToast("กู้คืนคลาสสอนชดเชยสำเร็จ", "success");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleHardDeleteMakeupHead = async (id: string, name?: string) => {
    const ok = await showConfirm({
      title: "⚠️ ยืนยันลบถาวร?",
      text: `ต้องการลบคลาส "${name || ''}" ถาวรใช่หรือไม่?\n(ไม่สามารถกู้คืนได้)`,
      confirmText: "ลบถาวร",
      isDanger: true
    });
    if (!ok) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/makeup-classes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, permanent: true })
      });
      if (res.ok) {
        setMakeupClassesList(prev => prev.filter(m => m.id !== id));
        showToast("ลบคลาสสอนชดเชยถาวรแล้ว", "success");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreAllMakeupHead = async () => {
    const ok = await showConfirm({
      title: "ยืนยันกู้คืนคลาสสอนชดเชยทั้งหมด?",
      text: `ต้องการกู้คืนคลาสสอนชดเชยทั้งหมด ${trashedMakeupClasses.length} รายการใช่หรือไม่?`,
      confirmText: "กู้คืนทั้งหมด",
      icon: "question"
    });
    if (!ok) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/makeup-classes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore-all' })
      });
      if (res.ok) {
        setMakeupClassesList(prev => prev.map(m => ({ ...m, deletedAt: null })));
        showToast("กู้คืนคลาสสอนชดเชยทั้งหมดแล้ว", "success");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleHardDeleteAllMakeupHead = async () => {
    const ok = await showConfirm({
      title: "⚠️ ยืนยันลบถาวรคลาสชดเชยทั้งหมด?",
      text: `คุณแน่ใจหรือไม่ที่จะลบถาวรคลาสสอนชดเชยทั้งหมด ${trashedMakeupClasses.length} รายการ?\n(ไม่สามารถกู้คืนได้!)`,
      confirmText: "ลบถาวรทั้งหมด",
      isDanger: true
    });
    if (!ok) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/makeup-classes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk-delete-permanent' })
      });
      if (res.ok) {
        setMakeupClassesList(prev => prev.filter(m => !m.deletedAt));
        showToast("ลบคลาสสอนชดเชยถาวรทั้งหมดแล้ว", "success");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isAllTerms = schedFilterTerm === "all";
  const targetSchedTerm = !isAllTerms ? schedFilterTerm.split("/")[0] : null;
  const targetSchedYear = !isAllTerms ? schedFilterTerm.split("/")[1] : null;

  const isAllSubjTerms = filterSubjTerm === "all" || filterSubjTerm === "ทั้งหมด";
  const targetSubjTerm = !isAllSubjTerms ? filterSubjTerm.split("/")[0] : null;
  const targetSubjYear = !isAllSubjTerms ? filterSubjTerm.split("/")[1] : null;

  const termOptions = useMemo(() => {
    const optionsMap = new Map<string, { term: string; academicYear: string; isCurrent: boolean }>();
    
    termConfigs.forEach((tc: any) => {
      const key = `${tc.term}/${tc.academicYear}`;
      optionsMap.set(key, { term: String(tc.term), academicYear: String(tc.academicYear), isCurrent: !!tc.isCurrent });
    });

    subjects.forEach((s: any) => {
      if (s.term && s.academicYear) {
        const key = `${s.term}/${s.academicYear}`;
        if (!optionsMap.has(key)) {
          optionsMap.set(key, { term: String(s.term), academicYear: String(s.academicYear), isCurrent: false });
        }
      }
    });

    const defaultKey = `1/${currentBEYear}`;
    if (!optionsMap.has(defaultKey)) {
      optionsMap.set(defaultKey, { term: "1", academicYear: String(currentBEYear), isCurrent: true });
    }

    return Array.from(optionsMap.values()).sort((a, b) => {
      if (b.academicYear !== a.academicYear) {
        return b.academicYear.localeCompare(a.academicYear);
      }
      return b.term.localeCompare(a.term);
    });
  }, [termConfigs, subjects, currentBEYear]);

  const displaySubjects = activeSubjects.filter(s => {
    if (filterLevel !== "ทั้งหมด" && s.level !== filterLevel) return false;
    const subjYr = s.academicYear || levelToYear(s.level || "");
    const subjTm = s.term || "1";
    if (targetSubjTerm && subjTm !== targetSubjTerm) return false;
    if (targetSubjYear && subjYr !== targetSubjYear) return false;
    return true;
  });
  const displaySchedules = activeSchedules.filter(sc => {
    if (schedFilterLevel !== "ทั้งหมด" && (sc.subject?.level || "ไม่ระบุ") !== schedFilterLevel) return false;
    if (schedFilterGroup !== "ทั้งหมด") {
      const grp = sc.subject?.group || "";
      if (grp !== schedFilterGroup && !grp.includes(schedFilterGroup)) return false;
    }
    if (targetSchedTerm && (sc.subject?.term || "1") !== targetSchedTerm) return false;
    if (targetSchedYear && (sc.subject?.academicYear || String(currentBEYear)) !== targetSchedYear) return false;
    return true;
  });
  const displayUsers = activeUsers.filter(u => {
    if (filterUserRole !== "ทั้งหมด" && u.role !== filterUserRole) return false;
    // Bug #12 fix: กรอง level ได้เสมอ ไม่ต้องกำหนดว่าต้องเลือก role=STUDENT ก่อน
    if (filterUserLevel !== "ทั้งหมด" && u.level !== filterUserLevel) return false;
    if (searchUser) {
      const searchLower = searchUser.toLowerCase();
      const matchName = u.name?.toLowerCase().includes(searchLower);
      const matchUsername = u.username?.toLowerCase().includes(searchLower);
      
      // ค้นหาผู้ปกครองจากชื่อนักเรียน (บุตรหลาน), รหัสนักเรียน หรือรหัส Parent Code
      const matchChild = u.role === "PARENT" && (
        u.approvedChildren?.some((c: any) => 
          c.name?.toLowerCase().includes(searchLower) ||
          c.username?.toLowerCase().includes(searchLower) ||
          c.parentCode?.toLowerCase().includes(searchLower)
        ) ||
        (u.student && (
          u.student.name?.toLowerCase().includes(searchLower) ||
          u.student.username?.toLowerCase().includes(searchLower) ||
          u.student.parentCode?.toLowerCase().includes(searchLower)
        ))
      );

      // ค้นหานักเรียนจาก Parent Code ของนักเรียนเอง
      const matchParentCode = u.role === "STUDENT" && u.parentCode?.toLowerCase().includes(searchLower);

      if (!matchName && !matchUsername && !matchChild && !matchParentCode) return false;
    }
    return true;
  });

  const activeStudents = activeUsers.filter(u => u.role === "STUDENT");



  const handleViewAttendance = async (u: any) => {
    setIsLoading(true);
    try {
      const details = await getUserDetails(u.id);
      setViewAttendanceUser({ ...u, ...details });
    } catch (e) {
      showError("เกิดข้อผิดพลาดในการดึงข้อมูลประวัติการเข้าเรียน");
    } finally {
      setIsLoading(false);
    }
  };

  const renderScheduleGrid = (gridSchedules: any[], gridTitle: string, gridKey: string = "grid") => {
    return (
      <div key={gridKey} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-700 pb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
              {gridTitle}
            </h3>
            {schedFilterLevel !== "ทั้งหมด" && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                ชั้นปี: {schedFilterLevel}
              </span>
            )}
            {schedFilterGroup !== "ทั้งหมด" && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                กลุ่ม: {schedFilterGroup}
              </span>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(day => {
            const daySchedules = gridSchedules.filter(sc => sc.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
            
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
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5 flex-wrap">
                          <span>รหัส: {sc.subject?.code}</span>
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                            กลุ่ม {sc.subject?.group || "-"}
                          </span>
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
                          {sc.subject?.teacher && (
                            <div className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm inline-block w-fit bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                              👨‍🏫 อ.{sc.subject.teacher.name}
                            </div>
                          )}
                        </div>
                        
                        {/* Hover actions */}
                        <div className="absolute top-2 right-2 flex opacity-0 group-hover:opacity-100 transition-opacity gap-1 backdrop-blur-md bg-white/80 dark:bg-gray-800/80 p-0.5 rounded-md shadow-sm border border-gray-100 dark:border-gray-600">
                          <button disabled={isLoading} onClick={() => handleEditSchedule(sc)} className="text-gray-500 hover:text-indigo-600 p-1 rounded transition disabled:opacity-50" title="แก้ไข">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button disabled={isLoading} onClick={async () => { const ok = await showConfirm({ title: "ยืนยันการลบตารางเรียน?", text: `ต้องการนำวิชา "${sc.subject?.name}" ออกจากตารางเรียนใช่หรือไม่?`, isDanger: true }); if(ok) deleteSchedule(sc.id); }} className="text-gray-500 hover:text-red-600 p-1 rounded transition disabled:opacity-50" title="ลบ">
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
            const daySchedules = gridSchedules.filter(sc => sc.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
            if (daySchedules.length === 0) return null;
            
            return (
              <div key={day} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-full bg-orange-50/30 dark:bg-orange-900/10">
                <div className="bg-orange-100 dark:bg-orange-900/40 p-2 text-center border-b border-orange-200 dark:border-orange-800">
                  <h4 className="font-bold text-orange-900 dark:text-orange-200 text-sm">{daysMap[day]}</h4>
                </div>
                <div className="p-3 flex-1 flex flex-col gap-2">
                  {daySchedules.map(sc => (
                    <div key={sc.id} className="p-2.5 flex justify-between items-center bg-white dark:bg-gray-800 rounded-lg border border-orange-100 dark:border-orange-800/50 shadow-sm">
                      <div>
                         <div className="font-bold text-sm text-orange-800 dark:text-orange-300 mb-1 flex items-center gap-1.5 flex-wrap">
                           <span>{sc.subject?.name}</span>
                           <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                             กลุ่ม {sc.subject?.group || "-"}
                           </span>
                         </div>
                         <div className="flex items-center gap-2 flex-wrap">
                           <div className="text-[11px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded w-fit">{sc.startTime} - {sc.endTime}</div>
                           {sc.subject?.teacher && <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">👨‍🏫 อ.{sc.subject.teacher.name}</span>}
                           {sc.subject?.room && <span className="text-xs text-blue-700 dark:text-blue-300">🏫 ห้อง {sc.subject.room}</span>}
                         </div>
                      </div>
                      <div className="flex bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden border border-gray-200 dark:border-gray-600">
                          <button disabled={isLoading} onClick={() => handleEditSchedule(sc)} className="text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-xs px-2 py-1 font-semibold transition border-r border-gray-200 dark:border-gray-600">แก้ไข</button>
                          <button disabled={isLoading} onClick={async () => { const ok = await showConfirm({ title: "ยืนยันการลบตารางเรียน?", text: `ต้องการนำวิชา "${sc.subject?.name}" ออกจากตารางเรียนใช่หรือไม่?`, isDanger: true }); if(ok) deleteSchedule(sc.id); }} className="text-gray-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 text-xs px-2 py-1 font-semibold transition">ลบ</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
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
        <button onClick={() => {setActiveTab("advisors");}} className={`px-6 py-3 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${activeTab === 'advisors' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
          <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          แต่งตั้งครูที่ปรึกษา
        </button>
        <button onClick={() => {setActiveTab("progression");}} className={`px-6 py-3 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${activeTab === 'progression' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
          <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
          เลื่อนภาคเรียน & เลื่อนชั้น
        </button>
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
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-all duration-200">
                <div 
                  onClick={() => setIsAddSubjectOpen(!isAddSubjectOpen)}
                  className={`flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors select-none ${isAddSubjectOpen ? 'rounded-t-xl' : 'rounded-xl'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      isAddSubjectOpen 
                        ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-300' 
                        : 'bg-indigo-50 text-indigo-600 dark:bg-gray-700 dark:text-indigo-400'
                    }`}>
                      <svg className={`w-4 h-4 transition-transform duration-200 ${isAddSubjectOpen ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        เพิ่มรายวิชาใหม่
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {isAddSubjectOpen ? "คลิกเพื่อซ่อนแบบฟอร์ม" : "คลิกเพื่อเปิดแบบฟอร์มเพิ่มรายวิชาใหม่"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAddSubjectOpen(!isAddSubjectOpen);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      isAddSubjectOpen
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                    }`}
                  >
                    <span>{isAddSubjectOpen ? "ซ่อนแบบฟอร์ม" : "+ เพิ่มรายวิชาใหม่"}</span>
                    <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isAddSubjectOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {isAddSubjectOpen && (
                  <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 rounded-b-xl">
                    <form onSubmit={handleSaveSubject} className="flex gap-4 items-end flex-wrap">
              {/* ช่องรหัสวิชา พร้อม Live Suggestion */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  รหัสวิชา
                </label>
                <input 
                  required 
                  type="text" 
                  value={subjCode} 
                  onChange={e => {
                    setSubjCode(e.target.value);
                    setIsSubjectSuggestOpen(true);
                  }} 
                  onFocus={() => setIsSubjectSuggestOpen(true)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:bg-gray-800 dark:border-gray-600 dark:text-white" 
                  placeholder="e.g. CS101" 
                />

                {/* Dropdown Suggestions */}
                {isSubjectSuggestOpen && (subjCode.trim().length > 0 || subjName.trim().length > 0) && (() => {
                  const queryCode = subjCode.trim().toLowerCase();
                  const queryName = subjName.trim().toLowerCase();
                  const matches = activeSubjects.filter(s => 
                    (queryCode && s.code.toLowerCase().includes(queryCode)) ||
                    (queryName && s.name.toLowerCase().includes(queryName))
                  );
                  if (matches.length === 0) return null;

                  return (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsSubjectSuggestOpen(false)}></div>
                      <div className="absolute left-0 top-full mt-1.5 w-80 sm:w-96 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto z-50 animate-in fade-in zoom-in-95">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/40 border-b border-indigo-100 dark:border-indigo-800/50 flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                            <span className="text-sm">🔍</span> วิชาเดิมในระบบ (คลิกเพื่อแก้ไข)
                          </span>
                          <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-800 px-2 py-0.5 rounded-full">
                            พบ {matches.length} วิชา
                          </span>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                          {matches.map(s => {
                            const isExactCode = subjCode && s.code.toLowerCase() === queryCode;
                            return (
                              <div
                                key={s.id}
                                onClick={() => {
                                  handleEditSubject(s);
                                  setIsSubjectSuggestOpen(false);
                                }}
                                className={`p-3 cursor-pointer transition-colors hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 ${isExactCode ? 'bg-amber-50/70 dark:bg-amber-950/30' : ''}`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-sm text-gray-900 dark:text-white">
                                    {s.code}
                                  </span>
                                  {isExactCode && (
                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-900/60 dark:text-amber-300 px-1.5 py-0.5 rounded">
                                      ⚠️ รหัสตรงกัน
                                    </span>
                                  )}
                                  <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold ml-auto">
                                    {s.level || "-"}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-300 truncate mt-0.5 font-medium">
                                  {s.name}
                                </div>
                                <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-2">
                                  <span>กลุ่ม {s.group || "-"}</span>
                                  <span>•</span>
                                  <span>เทอม {s.term || "-"}/{s.academicYear || "-"}</span>
                                  {s.teacher && (
                                    <>
                                      <span>•</span>
                                      <span className="truncate">อ. {s.teacher.name}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* ช่องชื่อวิชา */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  ชื่อวิชา
                </label>
                <input 
                  required 
                  type="text" 
                  value={subjName} 
                  onChange={e => {
                    setSubjName(e.target.value);
                    setIsSubjectSuggestOpen(true);
                  }} 
                  onFocus={() => setIsSubjectSuggestOpen(true)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:bg-gray-800 dark:border-gray-600 dark:text-white" 
                  placeholder="e.g. Computer Science" 
                />
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
              <div className="relative min-w-[220px]">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">อาจารย์ประจำวิชา (เลือกหรือไม่ก็ได้)</label>
                {isTeacherDropdownOpen && (
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => {
                      setIsTeacherDropdownOpen(false);
                      const cur = teachers.find(t => t.id === subjTeacherId);
                      setTeacherSearchQuery(cur ? cur.name : "");
                    }}
                  ></div>
                )}
                <div className="relative z-40 mt-1">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={teacherSearchQuery}
                      onChange={e => {
                        setTeacherSearchQuery(e.target.value);
                        setIsTeacherDropdownOpen(true);
                        if (!e.target.value) setSubjTeacherId("");
                      }}
                      onFocus={(e) => {
                        setIsTeacherDropdownOpen(true);
                        e.target.select();
                      }}
                      placeholder="พิมพ์ค้นหาชื่ออาจารย์..."
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm px-3 py-2 pr-14 bg-white dark:bg-gray-800 dark:text-white"
                    />
                    <div className="absolute right-2 flex items-center gap-1 text-gray-400">
                      {(subjTeacherId || teacherSearchQuery) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSubjTeacherId("");
                            setTeacherSearchQuery("");
                            setIsTeacherDropdownOpen(false);
                          }}
                          className="p-1 hover:text-gray-600 dark:hover:text-gray-200 transition"
                          title="ล้างค่า"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsTeacherDropdownOpen(!isTeacherDropdownOpen)}
                        className="p-1 hover:text-gray-600 dark:hover:text-gray-200 transition"
                      >
                        <svg className={`w-4 h-4 transition-transform duration-150 ${isTeacherDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {isTeacherDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-xl max-h-60 overflow-y-auto z-50">
                      <div className="py-1">
                        <div
                          onClick={() => { 
                            setSubjTeacherId(""); 
                            setTeacherSearchQuery(""); 
                            setIsTeacherDropdownOpen(false); 
                          }}
                          className={`px-3 py-2 text-sm cursor-pointer italic ${!subjTeacherId ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 font-medium' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                          -- ไม่ระบุ --
                        </div>
                        {filteredTeachers.map(t => (
                          <div
                            key={t.id}
                            onClick={() => { 
                              setSubjTeacherId(t.id); 
                              setTeacherSearchQuery(t.name); 
                              setIsTeacherDropdownOpen(false); 
                            }}
                            className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between ${
                              subjTeacherId === t.id 
                                ? 'bg-indigo-50 text-indigo-900 border-l-2 border-indigo-500 dark:bg-indigo-900/60 dark:text-indigo-200' 
                                : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50 border-l-2 border-transparent'
                            }`}
                          >
                            <span className="font-semibold">{t.name}</span>
                            <span className="ml-2 text-xs text-gray-400">{t.role === "HEAD" ? "หัวหน้าแผนก" : "อาจารย์"}</span>
                          </div>
                        ))}
                        {filteredTeachers.length === 0 && (
                          <div className="px-4 py-3 text-sm text-gray-400 italic">ไม่พบอาจารย์ที่ค้นหา</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ห้องเรียน</label>
                {isRoomDropdownOpen && (
                  <div className="fixed inset-0 z-40" onClick={() => setIsRoomDropdownOpen(false)}></div>
                )}
                <div className="relative z-40 mt-1">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={subjRoom}
                      onChange={e => {
                        setSubjRoom(e.target.value);
                        setIsRoomDropdownOpen(true);
                      }}
                      onFocus={(e) => {
                        setIsRoomDropdownOpen(true);
                        e.target.select();
                      }}
                      placeholder="พิมพ์หรือเลือกห้องเรียน..."
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm px-3 py-2 pr-14 bg-white dark:bg-gray-800 dark:text-white"
                    />
                    <div className="absolute right-2 flex items-center gap-1 text-gray-400">
                      {subjRoom && (
                        <button
                          type="button"
                          onClick={() => {
                            setSubjRoom("");
                            setIsRoomDropdownOpen(false);
                          }}
                          className="p-1 hover:text-gray-600 dark:hover:text-gray-200 transition"
                          title="ล้างค่า"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsRoomDropdownOpen(!isRoomDropdownOpen)}
                        className="p-1 hover:text-gray-600 dark:hover:text-gray-200 transition"
                      >
                        <svg className={`w-4 h-4 transition-transform duration-150 ${isRoomDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {isRoomDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-xl max-h-60 overflow-y-auto z-50">
                      <div className="py-1">
                        <div 
                          onClick={() => { setSubjRoom(""); setIsRoomDropdownOpen(false); }}
                          className={`px-3 py-2 text-sm cursor-pointer italic ${!subjRoom ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 font-medium' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                          -- ไม่ระบุ --
                        </div>
                        {Object.entries(roomOptions).map(([dept, rooms]) => {
                          const query = (subjRoom || "").trim().toLowerCase();
                          const filteredRooms = rooms.filter(r => (!query || isExactRoom) ? true : r.toLowerCase().includes(query));
                          if (filteredRooms.length === 0) return null;

                          return (
                            <div key={dept}>
                              <div className="px-3 py-1.5 text-[11px] uppercase tracking-wider font-bold bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                                {dept}
                              </div>
                              {filteredRooms.map(r => (
                                <div 
                                  key={r} 
                                  onClick={() => { setSubjRoom(r); setIsRoomDropdownOpen(false); }}
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
                      <div className="flex items-center gap-2">
                        <button disabled={isLoading} type="submit" className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium shadow-sm transition flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                          เพิ่มวิชา
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            resetSubjectForm();
                            setIsAddSubjectOpen(false);
                          }}
                          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium transition"
                        >
                          ยกเลิก / ซ่อน
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-2 gap-3">
              <h3 className="text-lg font-bold dark:text-white">รายวิชาทั้งหมด ({displaySubjects.length})</h3>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm dark:text-gray-300 whitespace-nowrap flex-shrink-0">ภาคเรียน:</span>
                  <select 
                    value={filterSubjTerm} 
                    onChange={e => setFilterSubjTerm(e.target.value)} 
                    className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-1 border font-medium"
                  >
                    {termOptions.map(t => {
                      const key = `${t.term}/${t.academicYear}`;
                      return (
                        <option key={key} value={key}>
                          {t.isCurrent ? `เทอม ${t.term}/${t.academicYear} (ปัจจุบัน)` : `เทอม ${t.term}/${t.academicYear}`}
                        </option>
                      );
                    })}
                    <option value="all">ทุกภาคเรียน</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm dark:text-gray-300 whitespace-nowrap flex-shrink-0">ตัวกรองชั้นปี:</span>
                  <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-1 border font-medium">
                    <option value="ทั้งหมด">ทั้งหมด</option>
                    {levelsOptions.map(l => <option key={l} value={l}>{l}{l === "ปวช.1" ? " (ค่าเริ่มต้น)" : ""}</option>)}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto overflow-y-auto max-h-[70vh] border-t border-gray-200 dark:border-gray-700">
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
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10 shadow-sm">
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
                        <button disabled={isLoading} onClick={async () => { const ok = await showConfirm({ title: "ยืนยันการลบวิชานี้?", text: `ต้องการลบวิชา "${s.name}" (${s.code}) ใช่หรือไม่?\n(วิชาจะถูกย้ายไปถังขยะและลบถาวรใน 7 วัน)`, isDanger: true }); if(ok) deleteSubject(s.id); }} className="text-red-600 hover:text-red-900 ml-4 disabled:opacity-50">ลบ</button>
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
              <div>
                <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-300">จัดการตารางเรียนแยกตามชั้นปี</h3>
                <p className="text-sm text-indigo-700 dark:text-indigo-400">เลือกภาคเรียนและชั้นปีเพื่อดูและเพิ่มตารางเรียน</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                {/* ภาคเรียน */}
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap flex-shrink-0">ภาคเรียน:</span>
                  <select 
                    value={schedFilterTerm} 
                    onChange={e => setSchedFilterTerm(e.target.value)} 
                    className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-2.5 py-1 border font-medium outline-none bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400"
                  >
                    {termOptions.map(t => {
                      const key = `${t.term}/${t.academicYear}`;
                      return (
                        <option key={key} value={key}>
                          {t.isCurrent ? `เทอม ${t.term}/${t.academicYear} (ปัจจุบัน)` : `เทอม ${t.term}/${t.academicYear}`}
                        </option>
                      );
                    })}
                    <option value="all">ทุกภาคเรียน</option>
                  </select>
                </div>
                <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>
                {/* ชั้นปี */}
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap flex-shrink-0">ชั้นปี:</span>
                  <select value={schedFilterLevel} onChange={e => setSchedFilterLevel(e.target.value)} className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-1 border font-medium outline-none bg-white dark:bg-gray-700 dark:text-white">
                    {levelsOptions.map(l => <option key={l} value={l}>{l}</option>)}
                    <option value="ทั้งหมด">แสดงทั้งหมด</option>
                  </select>
                </div>
                <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>
                {/* กลุ่มเรียน */}
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap flex-shrink-0">กลุ่มเรียน:</span>
                  <select value={schedFilterGroup} onChange={e => setSchedFilterGroup(e.target.value)} className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-1 border font-medium outline-none bg-white dark:bg-gray-700 dark:text-white">
                    <option value="ทั้งหมด">ทุกกลุ่มเรียน</option>
                    {groupOptions.map(g => <option key={g} value={g}>กลุ่ม {g}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* เพิ่มวิชาเรียนลงตาราง (ไม่ซ่อนหุบ / Always Visible) */}
            <div id="schedule-form-section" className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <div className="mb-4">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  {schedId ? "แก้ไขวิชาในตารางเรียน" : "เพิ่มวิชาเรียนลงตาราง"}
                  {targetSchedTerm && targetSchedYear && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                      เทอม {targetSchedTerm}/{targetSchedYear}
                    </span>
                  )}
                  {schedFilterLevel !== "ทั้งหมด" && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      {schedFilterLevel}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {schedId ? "แก้ไขข้อมูลคาบเรียนและกดบันทึก" : "เลือกวิชาและกำหนดวันเวลาเพื่อจัดคาบเรียนลงในตาราง"}
                </p>
              </div>

              <form onSubmit={handleSaveSchedule} className="flex gap-4 items-end flex-wrap">
                <div className="flex-1 min-w-[250px] relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    วิชา {schedFilterLevel !== "ทั้งหมด" ? `(เฉพาะ ${schedFilterLevel}` : "("}
                    {schedFilterGroup !== "ทั้งหมด" ? ` | กลุ่ม ${schedFilterGroup}` : ""}
                    {targetSchedTerm && targetSchedYear ? ` | เทอม ${targetSchedTerm}/${targetSchedYear}` : ""}
                    {")"}
                  </label>
              
                  {isSchedDropdownOpen && (
                    <div className="fixed inset-0 z-40" onClick={() => setIsSchedDropdownOpen(false)}></div>
                  )}

                  <div className="relative z-40">
                    <div 
                      onClick={() => setIsSchedDropdownOpen(!isSchedDropdownOpen)}
                      className={`mt-1 flex items-center justify-between w-full rounded-md border shadow-sm sm:text-sm px-3 py-2 cursor-pointer bg-white dark:bg-gray-800 transition-colors ${isSchedDropdownOpen ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'}`}
                    >
                      <span className={`${schedSubjId ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-500'}`}>
                        {schedSubjId 
                          ? (() => {
                              const s = subjects.find(x => x.id === schedSubjId);
                              if (!s) return "-- เลือกวิชา --";
                              const groupBadge = s.group ? ` [กลุ่ม ${s.group}]` : "";
                              const teacherPart = s.teacher?.name ? ` (อ.${s.teacher.name}${s.room ? ` | ห้อง ${s.room}` : ""})` : (s.room ? ` (ห้อง ${s.room})` : "");
                              return `${s.code} ${s.name}${groupBadge}${teacherPart}`;
                            })()
                          : "-- เลือกวิชา --"}
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${isSchedDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>

                    {isSchedDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-xl max-h-64 overflow-y-auto z-50">
                        <div className="p-2 sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 z-10 shadow-sm">
                          <input
                            type="text"
                            value={schedSearchQuery}
                            onChange={e => setSchedSearchQuery(e.target.value)}
                            placeholder="ค้นหารหัส, ชื่อวิชา, กลุ่ม, อาจารย์ หรือห้อง..."
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
                          {(() => {
                            const levelsToScan = schedFilterLevel === "ทั้งหมด" ? levelsOptions : [schedFilterLevel];
                            let totalFound = 0;

                            const renderedLevels = levelsToScan.map(level => {
                              const levelSubjects = subjects.filter(s => {
                                if (s.deletedAt) return false;
                                if ((s.level || "ไม่ระบุ") !== level) return false;
                                if (schedFilterGroup !== "ทั้งหมด") {
                                  const grp = s.group || "";
                                  if (grp !== schedFilterGroup && !grp.includes(schedFilterGroup)) return false;
                                }
                                if (targetSchedTerm && (s.term || "1") !== targetSchedTerm) return false;
                                if (targetSchedYear && (s.academicYear || String(currentBEYear)) !== targetSchedYear) return false;
                                if (!schedSearchQuery) return true;
                                const q = schedSearchQuery.toLowerCase();
                                return (
                                  s.code.toLowerCase().includes(q) || 
                                  s.name.toLowerCase().includes(q) ||
                                  (s.group && s.group.toLowerCase().includes(q)) ||
                                  (s.teacher?.name && s.teacher.name.toLowerCase().includes(q)) ||
                                  (s.room && s.room.toLowerCase().includes(q))
                                );
                              });
                              if (levelSubjects.length === 0) return null;
                              totalFound += levelSubjects.length;

                              const groupedByTermYr: Record<string, any[]> = {};
                              levelSubjects.forEach(s => {
                                const yr = s.academicYear || currentBEYear;
                                const tm = s.term || "1";
                                const key = `ชั้นปี: ${level} | ภาคเรียนที่ ${tm}/${yr}`;
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
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-semibold text-gray-900 dark:text-gray-100">{s.code}</span>
                                          <span className="text-gray-800 dark:text-gray-200 font-medium">{s.name}</span>
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                                            กลุ่ม {s.group || "-"}
                                          </span>
                                        </div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                                          {s.teacher?.name ? `อ.${s.teacher.name}` : "ไม่ระบุผู้สอน"} {s.room ? `| ห้อง ${s.room}` : ""}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ));
                            });

                            if (totalFound === 0) {
                              return (
                                <div className="p-4 text-center text-xs text-gray-500 dark:text-gray-400">
                                  ไม่มีรายวิชาที่ตรงกับตัวกรองด้านบน
                                  <div className="text-[11px] text-gray-400 mt-1">
                                    (ชั้นปี: {schedFilterLevel}{targetSchedTerm ? ` | เทอม ${targetSchedTerm}/${targetSchedYear}` : ""}{schedFilterGroup !== "ทั้งหมด" ? ` | กลุ่ม ${schedFilterGroup}` : ""})
                                  </div>
                                </div>
                              );
                            }

                            return renderedLevels;
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">วันที่</label>
                  <select value={schedDay} onChange={e => setSchedDay(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border outline-none bg-white dark:bg-gray-700 dark:text-white">
                    {Object.entries(daysMap).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">เริ่ม</label>
                  <div className="flex items-center gap-1">
                    <select
                      value={schedStart ? schedStart.split(':')[0] : '08'}
                      onChange={e => setSchedStart(`${e.target.value}:${schedStart ? schedStart.split(':')[1] || '00' : '00'}`)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-2 py-2 border outline-none bg-white dark:bg-gray-700 dark:text-white"
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
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-2 py-2 border outline-none bg-white dark:bg-gray-700 dark:text-white"
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
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-2 py-2 border outline-none bg-white dark:bg-gray-700 dark:text-white"
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
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-2 py-2 border outline-none bg-white dark:bg-gray-700 dark:text-white"
                    >
                      {Array.from({length: 60}).map((_, i) => {
                        const v = i.toString().padStart(2, '0');
                        return <option key={v} value={v}>{v}</option>;
                      })}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button disabled={isLoading} type="submit" className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium text-sm shadow-sm transition">
                    {schedId ? "บันทึกการแก้ไข" : "+ เพิ่ม"}
                  </button>
                  {(schedId || schedSubjId) && (
                    <button
                      type="button"
                      onClick={resetScheduleForm}
                      className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium transition"
                    >
                      {schedId ? "ยกเลิกการแก้ไข" : "ล้างข้อมูล"}
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* ================= Schedule Grids ================= */}
            {!isAllTerms ? (
              renderScheduleGrid(
                displaySchedules,
                `แผนผังตารางเรียนเทอม ${targetSchedTerm}`
              )
            ) : (
              <div className="space-y-10">
                {renderScheduleGrid(
                  displaySchedules.filter(sc => (sc.subject?.term || "1") === "1"),
                  "แผนผังตารางเรียนเทอม 1",
                  "grid-term-1"
                )}
                {renderScheduleGrid(
                  displaySchedules.filter(sc => sc.subject?.term === "2"),
                  "แผนผังตารางเรียนเทอม 2",
                  "grid-term-2"
                )}
                {Array.from(new Set(displaySchedules.map(sc => sc.subject?.term).filter(t => t && t !== "1" && t !== "2"))).map(otherTerm => (
                  renderScheduleGrid(
                    displaySchedules.filter(sc => sc.subject?.term === otherTerm),
                    `แผนผังตารางเรียนเทอม ${otherTerm}`,
                    `grid-term-${otherTerm}`
                  )
                ))}
              </div>
            )}
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
                <div className="relative mt-1">
                  <input 
                    type={showUserPassword ? "text" : "password"} 
                    value={userPassword} 
                    onChange={e => setUserPassword(e.target.value)} 
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 pr-10 border dark:bg-gray-800 dark:border-gray-600 dark:text-white" 
                    placeholder="••••••••" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowUserPassword(!showUserPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    title={showUserPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  >
                    {showUserPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
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
                <div className="relative min-w-[240px]">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    ผูกกับนักเรียน (บุตรหลาน)
                  </label>
                  {isStudentDropdownOpen && (
                    <div className="fixed inset-0 z-40" onClick={() => setIsStudentDropdownOpen(false)}></div>
                  )}
                  <div className="relative z-40">
                    <div
                      onClick={() => setIsStudentDropdownOpen(!isStudentDropdownOpen)}
                      className={`mt-1 flex items-center justify-between w-full rounded-md border shadow-sm sm:text-sm px-3 py-2 cursor-pointer bg-white dark:bg-gray-800 transition-colors ${isStudentDropdownOpen ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'}`}
                    >
                      <span className={`${userStudentId ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-500'} truncate`}>
                        {userStudentId
                          ? (() => {
                              const st = users.find(u => u.id === userStudentId);
                              return st ? `${st.name} (${st.username})` : "-- ไม่ระบุ --";
                            })()
                          : "-- ค้นหาและเลือกนักเรียน --"}
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${isStudentDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>

                    {isStudentDropdownOpen && (
                      <div className="absolute w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-xl max-h-60 overflow-y-auto z-50">
                        <div className="p-2 sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 z-10 shadow-sm">
                          <input
                            type="text"
                            value={studentSearchQuery}
                            onChange={e => setStudentSearchQuery(e.target.value)}
                            placeholder="พิมพ์ชื่อ หรือ รหัสนักเรียน..."
                            className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                            autoFocus
                          />
                        </div>
                        <div className="py-1">
                          <div
                            onClick={() => {
                              setUserStudentId("");
                              setIsStudentDropdownOpen(false);
                              setStudentSearchQuery("");
                            }}
                            className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer italic"
                          >
                            -- ไม่ระบุ --
                          </div>
                          {users
                            .filter(u => u.role === "STUDENT" && !u.deletedAt)
                            .filter(u => {
                              if (!studentSearchQuery) return true;
                              const q = studentSearchQuery.toLowerCase();
                              return u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || (u.level && u.level.toLowerCase().includes(q));
                            })
                            .map(u => (
                              <div
                                key={u.id}
                                onClick={() => {
                                  setUserStudentId(u.id);
                                  setIsStudentDropdownOpen(false);
                                  setStudentSearchQuery("");
                                }}
                                className={`px-4 py-2 text-sm cursor-pointer transition-colors flex items-center justify-between ${userStudentId === u.id ? 'bg-indigo-50 text-indigo-900 border-l-2 border-indigo-500 dark:bg-indigo-900/60 dark:text-indigo-200' : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50 border-l-2 border-transparent'}`}
                              >
                                <div>
                                  <span className="font-semibold">{u.name}</span>
                                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({u.username})</span>
                                </div>
                                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-1.5 py-0.5 rounded">
                                  {u.level || "-"}
                                </span>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    )}
                  </div>
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
              <div className="flex items-center gap-4 flex-wrap justify-end">
                  <div className="flex items-center gap-2">
                    <span className="text-sm dark:text-gray-300 whitespace-nowrap flex-shrink-0">ค้นหา:</span>
                    <input 
                      type="text" 
                      value={searchUser} 
                      onChange={e => setSearchUser(e.target.value)} 
                      placeholder={filterUserRole === "PARENT" ? "พิมพ์ชื่อนักเรียนหรือรหัสนักเรียน..." : "พิมพ์ชื่อ หรือ Username..."} 
                      className={`rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-1 border outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white transition-all ${filterUserRole === "PARENT" ? "w-64" : "w-48 sm:w-56"}`}
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
                  <button
                    type="button"
                    onClick={() => setIsParentCodesModalOpen(true)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-xs font-bold transition shadow-sm flex items-center gap-1.5 whitespace-nowrap active:scale-95"
                    title="ดูรหัสผูกผู้ปกครองของนักเรียนทั้งหมดสำหรับแจกในวันประชุม"
                  >
                    🔑 รหัสผู้ปกครอง (Parent Codes)
                  </button>
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-[15px] text-gray-900 dark:text-white leading-tight truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition" title={u.name}>{u.name}</p>
                          {u.isTwin && (
                            <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800" title={u.twinNote ? `คู่แฝด: ${u.twinNote}` : "มีคู่แฝดในระบบ"}>
                              👥 คู่แฝด
                            </span>
                          )}
                        </div>
                        
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
                          <div className="col-span-2 flex items-center justify-between text-[11px] bg-amber-50/80 dark:bg-amber-950/30 px-2 py-1 rounded-lg border border-amber-200/80 dark:border-amber-800/40 mt-0.5">
                            <span className="text-amber-800 dark:text-amber-300 font-semibold">รหัสผู้ปกครอง:</span>
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (u.parentCode) {
                                  navigator.clipboard.writeText(u.parentCode);
                                  showToast(`คัดลอกรหัส ${u.parentCode} แล้ว`, "success");
                                }
                              }}
                              title="คลิกเพื่อคัดลอกรหัส"
                              className="font-mono font-bold text-amber-900 dark:text-amber-200 hover:text-amber-600 dark:hover:text-amber-300 cursor-pointer transition"
                            >
                              🔑 {u.parentCode || "-"}
                            </span>
                          </div>
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

                      <div className="flex justify-end border-t border-gray-200/60 dark:border-gray-700 pt-3">
                        <div className="flex gap-2">
                           <button disabled={isLoading} onClick={() => handleEditUser(u)} className="text-slate-600 hover:text-slate-900 border text-xs font-bold border-slate-200 bg-white hover:bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 px-3 py-1.5 rounded-md transition shadow-sm">แก้ไข</button>
                           <button disabled={isLoading} onClick={async () => { const ok = await showConfirm({ title: "ยืนยันการลบผู้ใช้?", text: `ต้องการย้าย "${u.name}" ออกจากระบบใช่หรือไม่? (ข้อมูลจะถูกย้ายไปถังขยะ)`, isDanger: true }); if(ok) deleteUser(u.id); }} className="text-red-600 hover:text-red-800 border text-xs font-bold border-red-200 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300 px-3 py-1.5 rounded-md transition shadow-sm">ลบ</button>
                        </div>
                      </div>
                      
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto overflow-y-auto max-h-[70vh] mt-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10 shadow-sm">
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {filterUserRole === "PARENT" ? "ชั้นปี (บุตรหลาน)" : "ชั้นปี"}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {filterUserRole === "PARENT" ? "รหัสผูกผู้ปกครอง" : "สิทธิ์แก้ไขโปรไฟล์"}
                      </th>
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
                          {u.role === "PARENT" && (
                            <span className="block text-xs text-indigo-500 mt-1 dark:text-indigo-400">
                              {u.approvedChildren && u.approvedChildren.length > 0 ? (
                                `บุตร: ${u.approvedChildren.map((s: any) => s.name || s.username).join(", ")}`
                              ) : u.student ? (
                                `บุตร: ${u.student.name}`
                              ) : (
                                <span className="text-gray-400 font-normal">ยังไม่ผูกกับนักเรียน</span>
                              )}
                            </span>
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
                          ) : u.role === "PARENT" ? (
                            u.approvedChildren && u.approvedChildren.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {u.approvedChildren.map((c: any) => (
                                  <span key={c.id} className="px-2.5 py-0.5 inline-flex text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                    {c.level || "-"}
                                  </span>
                                ))}
                              </div>
                            ) : u.student?.level ? (
                              <span className="px-2.5 py-0.5 inline-flex text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                {u.student.level}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )
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
                          ) : u.role === "PARENT" ? (
                            u.approvedChildren && u.approvedChildren.length > 0 ? (
                              <div className="flex flex-col gap-1.5">
                                {u.approvedChildren.map((c: any) => (
                                  <span 
                                    key={c.id} 
                                    onClick={() => {
                                      if (c.parentCode) {
                                        navigator.clipboard.writeText(c.parentCode);
                                        showToast(`คัดลอกรหัส ${c.parentCode} แล้ว`, "success");
                                      }
                                    }}
                                    title="คลิกเพื่อคัดลอกรหัส"
                                    className="font-mono text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800 inline-flex items-center gap-1.5 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/60 transition w-fit"
                                  >
                                    🔑 {c.parentCode || "-"}
                                  </span>
                                ))}
                              </div>
                            ) : u.student ? (
                              <span 
                                onClick={() => {
                                  if (u.student.parentCode) {
                                    navigator.clipboard.writeText(u.student.parentCode);
                                    showToast(`คัดลอกรหัส ${u.student.parentCode} แล้ว`, "success");
                                  }
                                }}
                                title="คลิกเพื่อคัดลอกรหัส"
                                className="font-mono text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800 inline-flex items-center gap-1.5 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/60 transition w-fit"
                              >
                                🔑 {u.student.parentCode || "-"}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {filterUserRole === "TRASH" ? (
                            <>
                              <button disabled={isLoading} onClick={async () => { const ok = await showConfirm({ title: "ยืนยันการกู้คืนข้อมูล?", text: `ต้องการกู้คืนผู้ใช้ "${u.name}" กลับสู่ระบบใช่หรือไม่?`, confirmText: "กู้คืน", icon: "question" }); if(ok) { setIsLoading(true); await restoreUser(u.id); setIsLoading(false); showToast("กู้คืนผู้ใช้สำเร็จ", "success"); } }} className="text-green-600 hover:text-green-900 mr-4">กู้คืน</button>
                              <button disabled={isLoading} onClick={async () => { const ok = await showConfirm({ title: "ยืนยันการลบถาวร?", text: `ต้องการลบข้อมูล "${u.name}" ออกจากระบบถาวรใช่หรือไม่?\n(ไม่สามารถกู้คืนได้)`, confirmText: "ลบถาวร", isDanger: true }); if(ok) { setIsLoading(true); await hardDeleteUser(u.id); setIsLoading(false); showToast("ลบข้อมูลถาวรแล้ว", "success"); } }} className="text-red-600 hover:text-red-900">ลบถาวร</button>
                            </>
                          ) : (
                            <>
                              <button disabled={isLoading} onClick={() => handleEditUser(u)} className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50">แก้ไข</button>
                              <button disabled={isLoading} onClick={async () => { const ok = await showConfirm({ title: "ยืนยันการลบผู้ใช้?", text: `ต้องการย้าย "${u.name}" ไปที่ถังขยะใช่หรือไม่?`, isDanger: true }); if(ok) deleteUser(u.id); }} className="text-red-600 hover:text-red-900 ml-4 disabled:opacity-50">ลบ</button>
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
                    <button disabled={isLoading} onClick={async () => { const ok = await showConfirm({ title: "ยืนยันกู้คืนวิชาทั้งหมด?", text: `ต้องการกู้คืนรายวิชาทั้งหมด ${trashedSubjects.length} รายการใช่หรือไม่?`, confirmText: "กู้คืนทั้งหมด", icon: "question" }); if(ok) { setIsLoading(true); await restoreAllSubjects(); setIsLoading(false); showToast("กู้คืนวิชาทั้งหมดแล้ว", "success"); } }} className="text-xs font-semibold px-3 py-1.5 rounded-md bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800 transition disabled:opacity-50">กู้คืนทั้งหมด</button>
                    <button disabled={isLoading} onClick={async () => { const ok = await showConfirm({ title: "⚠️ ยืนยันลบถาวรวิชาทั้งหมด?", text: `คุณแน่ใจหรือไม่ที่จะลบถาวรวิชาทั้งหมด ${trashedSubjects.length} รายการ?\n(ไม่สามารถกู้คืนข้อมูลได้!)`, confirmText: "ลบถาวรทั้งหมด", isDanger: true }); if(ok) { setIsLoading(true); await hardDeleteAllSubjects(); setIsLoading(false); showToast("ลบวิชาทั้งหมดถาวรแล้ว", "success"); } }} className="text-xs font-semibold px-3 py-1.5 rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800 transition disabled:opacity-50">ลบถาวรทั้งหมด</button>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto overflow-y-auto max-h-[70vh] bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10 shadow-sm">
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
                          <button disabled={isLoading} onClick={async () => { const ok = await showConfirm({ title: "ยืนยันกู้คืนวิชา?", text: `ต้องการกู้คืนวิชา "${s.name}" กลับสู่ระบบใช่หรือไม่?`, confirmText: "กู้คืน", icon: "question" }); if(ok) { setIsLoading(true); await restoreSubject(s.id); setIsLoading(false); showToast("กู้คืนวิชาสำเร็จ", "success"); } }} className="text-green-600 hover:text-green-900 mr-4 font-medium">กู้คืน</button>
                          <button disabled={isLoading} onClick={async () => { const ok = await showConfirm({ title: "ยืนยันการลบถาวร?", text: `ต้องการลบวิชา "${s.name}" ถาวรใช่หรือไม่?\n(ไม่สามารถกู้คืนได้)`, confirmText: "ลบถาวร", isDanger: true }); if(ok) { setIsLoading(true); await hardDeleteSubject(s.id); setIsLoading(false); showToast("ลบวิชาถาวรแล้ว", "success"); } }} className="text-red-600 hover:text-red-900 font-medium">ลบถาวร</button>
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
                    <button disabled={isLoading} onClick={async () => { const ok = await showConfirm({ title: "ยืนยันกู้คืนตารางเรียนทั้งหมด?", text: `ต้องการกู้คืนตารางเรียนทั้งหมด ${trashedSchedules.length} รายการใช่หรือไม่?`, confirmText: "กู้คืนทั้งหมด", icon: "question" }); if(ok) { setIsLoading(true); await restoreAllSchedules(); setIsLoading(false); showToast("กู้คืนตารางเรียนทั้งหมดแล้ว", "success"); } }} className="text-xs font-semibold px-3 py-1.5 rounded-md bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800 transition disabled:opacity-50">กู้คืนทั้งหมด</button>
                    <button disabled={isLoading} onClick={async () => { const ok = await showConfirm({ title: "⚠️ ยืนยันลบถาวรตารางเรียนทั้งหมด?", text: `คุณแน่ใจหรือไม่ที่จะลบถาวรตารางเรียนทั้งหมด ${trashedSchedules.length} รายการ?\n(ไม่สามารถกู้คืนข้อมูลได้!)`, confirmText: "ลบถาวรทั้งหมด", isDanger: true }); if(ok) { setIsLoading(true); await hardDeleteAllSchedules(); setIsLoading(false); showToast("ลบตารางเรียนถาวรแล้ว", "success"); } }} className="text-xs font-semibold px-3 py-1.5 rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800 transition disabled:opacity-50">ลบถาวรทั้งหมด</button>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto overflow-y-auto max-h-[70vh] bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10 shadow-sm">
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
                          <button disabled={isLoading} onClick={async () => { const ok = await showConfirm({ title: "ยืนยันกู้คืนตารางเรียน?", text: `ต้องการกู้คืนวิชา "${sc.subject?.name}" กลับสู่ตารางเรียนใช่หรือไม่?`, confirmText: "กู้คืน", icon: "question" }); if(ok) { setIsLoading(true); await restoreSchedule(sc.id); setIsLoading(false); showToast("กู้คืนตารางเรียนสำเร็จ", "success"); } }} className="text-green-600 hover:text-green-900 mr-4 font-medium">กู้คืน</button>
                          <button disabled={isLoading} onClick={async () => { const ok = await showConfirm({ title: "ยืนยันการลบถาวร?", text: `ต้องการลบคาบวิชา "${sc.subject?.name}" ถาวรใช่หรือไม่?\n(ไม่สามารถกู้คืนได้)`, confirmText: "ลบถาวร", isDanger: true }); if(ok) { setIsLoading(true); await hardDeleteSchedule(sc.id); setIsLoading(false); showToast("ลบตารางเรียนถาวรแล้ว", "success"); } }} className="text-red-600 hover:text-red-900 font-medium">ลบถาวร</button>
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
                    <button disabled={isLoading} onClick={async () => { const ok = await showConfirm({ title: "ยืนยันกู้คืนผู้ใช้งานทั้งหมด?", text: `ต้องการกู้คืนผู้ใช้งานทั้งหมด ${trashedUsers.length} คนใช่หรือไม่?`, confirmText: "กู้คืนทั้งหมด", icon: "question" }); if(ok) { setIsLoading(true); await restoreAllUsers(); setIsLoading(false); showToast("กู้คืนผู้ใช้งานทั้งหมดแล้ว", "success"); } }} className="text-xs font-semibold px-3 py-1.5 rounded-md bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800 transition disabled:opacity-50">กู้คืนทั้งหมด</button>
                    <button disabled={isLoading} onClick={async () => { const ok = await showConfirm({ title: "⚠️ ยืนยันลบถาวรผู้ใช้งานทั้งหมด?", text: `คุณแน่ใจหรือไม่ที่จะลบถาวรผู้ใช้งานทั้งหมด ${trashedUsers.length} คน?\n(ไม่สามารถกู้คืนได้!)`, confirmText: "ลบถาวรทั้งหมด", isDanger: true }); if(ok) { setIsLoading(true); await hardDeleteAllUsers(); setIsLoading(false); showToast("ลบผู้ใช้ถาวรทั้งหมดแล้ว", "success"); } }} className="text-xs font-semibold px-3 py-1.5 rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800 transition disabled:opacity-50">ลบถาวรทั้งหมด</button>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto overflow-y-auto max-h-[70vh] bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10 shadow-sm">
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
                          <button disabled={isLoading} onClick={async () => { const ok = await showConfirm({ title: "ยืนยันกู้คืนผู้ใช้?", text: `ต้องการกู้คืนผู้ใช้ "${u.name}" กลับสู่ระบบใช่หรือไม่?`, confirmText: "กู้คืน", icon: "question" }); if(ok) { setIsLoading(true); await restoreUser(u.id); setIsLoading(false); showToast("กู้คืนผู้ใช้สำเร็จ", "success"); } }} className="text-green-600 hover:text-green-900 mr-4 font-medium">กู้คืน</button>
                          <button disabled={isLoading} onClick={async () => { const ok = await showConfirm({ title: "ยืนยันการลบถาวร?", text: `ต้องการลบข้อมูลผู้ใช้ "${u.name}" ออกจากระบบถาวรใช่หรือไม่?\n(ไม่สามารถกู้คืนได้)`, confirmText: "ลบถาวร", isDanger: true }); if(ok) { setIsLoading(true); await hardDeleteUser(u.id); setIsLoading(false); showToast("ลบข้อมูลผู้ใช้ถาวรแล้ว", "success"); } }} className="text-red-600 hover:text-red-900 font-medium">ลบถาวร</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Trashed Makeup Classes Section */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <span className="bg-gray-200 dark:bg-gray-700 w-8 h-8 flex items-center justify-center rounded-full text-sm">{trashedMakeupClasses.length}</span>
                  คลาสสอนชดเชยที่ถูกลบ
                </h4>
                {trashedMakeupClasses.length > 0 && (
                  <div className="flex gap-2">
                    <button disabled={isLoading} onClick={handleRestoreAllMakeupHead} className="text-xs font-semibold px-3 py-1.5 rounded-md bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800 transition disabled:opacity-50">กู้คืนทั้งหมด</button>
                    <button disabled={isLoading} onClick={handleHardDeleteAllMakeupHead} className="text-xs font-semibold px-3 py-1.5 rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800 transition disabled:opacity-50">ลบถาวรทั้งหมด</button>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto overflow-y-auto max-h-[70vh] bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">วิชา (รหัส)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">วัน / เวลาชดเชย</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">วันที่ลบ</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {trashedMakeupClasses.length === 0 && <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-400">ไม่มีข้อมูล</td></tr>}
                    {trashedMakeupClasses.map((mc: any) => (
                      <tr key={mc.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{mc.subject?.name} <span className="text-gray-400 font-normal">({mc.subject?.code})</span></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {new Date(mc.date).toLocaleDateString('th-TH')} ({mc.startTime} - {mc.endTime} น.)
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500 text-right">{mc.deletedAt ? new Date(mc.deletedAt).toLocaleDateString('th-TH') : "-"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <button disabled={isLoading} onClick={() => handleRestoreMakeupHead(mc.id, mc.subject?.name)} className="text-green-600 hover:text-green-900 mr-4 font-medium">กู้คืน</button>
                          <button disabled={isLoading} onClick={() => handleHardDeleteMakeupHead(mc.id, mc.subject?.name)} className="text-red-600 hover:text-red-900 font-medium">ลบถาวร</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
          </div>
        )}

        {/* ================= Advisors Tab ================= */}
        {activeTab === "advisors" && (
          <HeadAdvisorManagement teachers={teachers} users={users} termConfigs={termConfigs} />
        )}

        {/* ================= Progression Tab ================= */}
        {activeTab === "progression" && (
          <HeadProgressionManagement users={users} termConfigs={termConfigs} setActiveTab={setActiveTab} />
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
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">เทอม</label>
                  <select value={subjTerm} onChange={e => setSubjTerm(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border">
                    <option value="1">1</option>
                    <option value="2">2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">หน่วยกิต</label>
                  <input required type="number" step="0.5" min="0" value={subjCredit} onChange={e => setSubjCredit(parseFloat(e.target.value))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">กลุ่มเรียน</label>
                  <select value={subjGroup} onChange={e => setSubjGroup(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border">
                    {groupOptions.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">อาจารย์ประจำวิชา</label>
                  {isTeacherDropdownOpen && (
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => {
                        setIsTeacherDropdownOpen(false);
                        const cur = teachers.find(t => t.id === subjTeacherId);
                        setTeacherSearchQuery(cur ? cur.name : "");
                      }}
                    ></div>
                  )}
                  <div className="relative z-40 mt-1">
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={teacherSearchQuery}
                        onChange={e => {
                          setTeacherSearchQuery(e.target.value);
                          setIsTeacherDropdownOpen(true);
                          if (!e.target.value) setSubjTeacherId("");
                        }}
                        onFocus={(e) => {
                          setIsTeacherDropdownOpen(true);
                          e.target.select();
                        }}
                        placeholder="พิมพ์ค้นหาชื่ออาจารย์..."
                        className="block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm px-3 py-2 pr-14 bg-white dark:bg-gray-800 dark:text-white"
                      />
                      <div className="absolute right-2 flex items-center gap-1 text-gray-400">
                        {(subjTeacherId || teacherSearchQuery) && (
                          <button
                            type="button"
                            onClick={() => {
                              setSubjTeacherId("");
                              setTeacherSearchQuery("");
                              setIsTeacherDropdownOpen(false);
                            }}
                            className="p-1 hover:text-gray-600 dark:hover:text-gray-200 transition"
                            title="ล้างค่า"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsTeacherDropdownOpen(!isTeacherDropdownOpen)}
                          className="p-1 hover:text-gray-600 dark:hover:text-gray-200 transition"
                        >
                          <svg className={`w-4 h-4 transition-transform duration-150 ${isTeacherDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {isTeacherDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-xl max-h-48 overflow-y-auto z-50">
                        <div className="py-1">
                          <div
                            onClick={() => { 
                              setSubjTeacherId(""); 
                              setTeacherSearchQuery(""); 
                              setIsTeacherDropdownOpen(false); 
                            }}
                            className={`px-3 py-2 text-sm cursor-pointer italic ${!subjTeacherId ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 font-medium' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                          >
                            -- ไม่ระบุ --
                          </div>
                          {filteredTeachers.map(t => (
                            <div
                              key={t.id}
                              onClick={() => { 
                                setSubjTeacherId(t.id); 
                                setTeacherSearchQuery(t.name); 
                                setIsTeacherDropdownOpen(false); 
                              }}
                              className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between ${
                                subjTeacherId === t.id 
                                  ? 'bg-indigo-50 text-indigo-900 border-l-2 border-indigo-500 dark:bg-indigo-900/60 dark:text-indigo-200' 
                                  : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50 border-l-2 border-transparent'
                              }`}
                            >
                              <span className="font-semibold">{t.name}</span>
                              <span className="ml-2 text-xs text-gray-400">{t.role === "HEAD" ? "หัวหน้าแผนก" : "อาจารย์"}</span>
                            </div>
                          ))}
                          {filteredTeachers.length === 0 && (
                            <div className="px-4 py-3 text-sm text-gray-400 italic">ไม่พบอาจารย์ที่ค้นหา</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ห้องเรียน</label>
                  {isRoomDropdownOpen && (
                    <div className="fixed inset-0 z-40" onClick={() => setIsRoomDropdownOpen(false)}></div>
                  )}
                  <div className="relative z-40 mt-1">
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={subjRoom}
                        onChange={e => {
                          setSubjRoom(e.target.value);
                          setIsRoomDropdownOpen(true);
                        }}
                        onFocus={(e) => {
                          setIsRoomDropdownOpen(true);
                          e.target.select();
                        }}
                        placeholder="พิมพ์หรือเลือกห้องเรียน..."
                        className="block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm px-3 py-2 pr-14 bg-white dark:bg-gray-800 dark:text-white"
                      />
                      <div className="absolute right-2 flex items-center gap-1 text-gray-400">
                        {subjRoom && (
                          <button
                            type="button"
                            onClick={() => {
                              setSubjRoom("");
                              setIsRoomDropdownOpen(false);
                            }}
                            className="p-1 hover:text-gray-600 dark:hover:text-gray-200 transition"
                            title="ล้างค่า"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsRoomDropdownOpen(!isRoomDropdownOpen)}
                          className="p-1 hover:text-gray-600 dark:hover:text-gray-200 transition"
                        >
                          <svg className={`w-4 h-4 transition-transform duration-150 ${isRoomDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {isRoomDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-xl max-h-48 overflow-y-auto z-50">
                        <div className="py-1">
                          <div 
                            onClick={() => { setSubjRoom(""); setIsRoomDropdownOpen(false); }}
                            className={`px-3 py-2 text-sm cursor-pointer italic ${!subjRoom ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 font-medium' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                          >
                            -- ไม่ระบุ --
                          </div>
                          {Object.entries(roomOptions).map(([dept, rooms]) => {
                            const query = (subjRoom || "").trim().toLowerCase();
                            const filteredRooms = rooms.filter(r => (!query || isExactRoom) ? true : r.toLowerCase().includes(query));
                            if (filteredRooms.length === 0) return null;

                            return (
                              <div key={dept}>
                                <div className="px-3 py-1.5 text-[11px] uppercase tracking-wider font-bold bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                                  {dept}
                                </div>
                                {filteredRooms.map(r => (
                                  <div 
                                    key={r} 
                                    onClick={() => { setSubjRoom(r); setIsRoomDropdownOpen(false); }}
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

      {/* ================= Edit Schedule Modal ================= */}
      {isEditScheduleModalOpen && schedId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 flex flex-col rounded-2xl shadow-2xl max-w-lg w-full animate-in fade-in zoom-in-95 duration-200 overflow-hidden border border-gray-100 dark:border-gray-700">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-indigo-50/50 to-white dark:from-gray-800 dark:to-gray-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                  📅
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">แก้ไขคาบเรียนในตาราง</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">ปรับเปลี่ยนวัน เวลา หรือรายวิชาในตารางเรียน</p>
                </div>
              </div>
              <button 
                onClick={resetScheduleForm} 
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveSchedule} className="p-6 space-y-5">
              {/* Subject Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  รายวิชา <span className="text-red-500">*</span>
                </label>
                <select
                  value={schedSubjId}
                  onChange={e => setSchedSubjId(e.target.value)}
                  required
                  className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3.5 py-2.5 border bg-white dark:bg-gray-700 dark:text-white font-medium outline-none"
                >
                  <option value="">-- เลือกวิชา --</option>
                  {subjects.filter(s => !s.deletedAt).map(s => {
                    const grp = s.group ? ` [กลุ่ม ${s.group}]` : "";
                    const teacher = s.teacher?.name ? ` (อ.${s.teacher.name})` : "";
                    const room = s.room ? ` ห้อง ${s.room}` : "";
                    return (
                      <option key={s.id} value={s.id}>
                        {s.code} {s.name}{grp}{teacher}{room}
                      </option>
                    );
                  })}
                </select>
                {/* Subject Quick Preview Card */}
                {(() => {
                  const s = subjects.find(x => x.id === schedSubjId);
                  if (!s) return null;
                  return (
                    <div className="mt-2.5 p-3 rounded-lg bg-indigo-50/60 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40 text-xs flex flex-wrap gap-x-4 gap-y-1.5 text-indigo-900 dark:text-indigo-200">
                      <div><span className="font-semibold text-gray-600 dark:text-gray-400">ชั้นปี:</span> {s.level || "-"}</div>
                      <div><span className="font-semibold text-gray-600 dark:text-gray-400">กลุ่ม:</span> <span className="font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 px-1 rounded">กลุ่ม {s.group || "-"}</span></div>
                      <div><span className="font-semibold text-gray-600 dark:text-gray-400">ผู้สอน:</span> {s.teacher?.name ? `อ.${s.teacher.name}` : "-"}</div>
                      <div><span className="font-semibold text-gray-600 dark:text-gray-400">ห้อง:</span> {s.room || "-"}</div>
                    </div>
                  );
                })()}
              </div>

              {/* Day of Week */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  วันที่เรียน <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-5 sm:grid-cols-7 gap-1.5">
                  {Object.entries(daysMap).map(([k, v]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setSchedDay(k)}
                      className={`py-2 px-1 text-xs font-bold rounded-lg border transition text-center ${
                        schedDay === k
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-200 dark:ring-indigo-900'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">เวลาเริ่ม</label>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={schedStart ? schedStart.split(':')[0] : '08'}
                      onChange={e => setSchedStart(`${e.target.value}:${schedStart ? schedStart.split(':')[1] || '00' : '00'}`)}
                      className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-2.5 py-2 border bg-white dark:bg-gray-700 dark:text-white font-medium outline-none text-center"
                    >
                      {Array.from({length: 24}).map((_, i) => {
                        const v = i.toString().padStart(2, '0');
                        return <option key={v} value={v}>{v}</option>;
                      })}
                    </select>
                    <span className="font-bold text-gray-400">:</span>
                    <select
                      value={schedStart ? schedStart.split(':')[1] : '00'}
                      onChange={e => setSchedStart(`${schedStart ? schedStart.split(':')[0] || '08' : '08'}:${e.target.value}`)}
                      className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-2.5 py-2 border bg-white dark:bg-gray-700 dark:text-white font-medium outline-none text-center"
                    >
                      {Array.from({length: 60}).map((_, i) => {
                        const v = i.toString().padStart(2, '0');
                        return <option key={v} value={v}>{v}</option>;
                      })}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">เวลาสิ้นสุด</label>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={schedEnd ? schedEnd.split(':')[0] : '10'}
                      onChange={e => setSchedEnd(`${e.target.value}:${schedEnd ? schedEnd.split(':')[1] || '00' : '00'}`)}
                      className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-2.5 py-2 border bg-white dark:bg-gray-700 dark:text-white font-medium outline-none text-center"
                    >
                      {Array.from({length: 24}).map((_, i) => {
                        const v = i.toString().padStart(2, '0');
                        return <option key={v} value={v}>{v}</option>;
                      })}
                    </select>
                    <span className="font-bold text-gray-400">:</span>
                    <select
                      value={schedEnd ? schedEnd.split(':')[1] : '00'}
                      onChange={e => setSchedEnd(`${schedEnd ? schedEnd.split(':')[0] || '10' : '10'}:${e.target.value}`)}
                      className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-2.5 py-2 border bg-white dark:bg-gray-700 dark:text-white font-medium outline-none text-center"
                    >
                      {Array.from({length: 60}).map((_, i) => {
                        const v = i.toString().padStart(2, '0');
                        return <option key={v} value={v}>{v}</option>;
                      })}
                    </select>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={resetScheduleForm}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isLoading ? (
                    <span>กำลังบันทึก...</span>
                  ) : (
                    <>
                      <span>✓</span>
                      <span>บันทึกการแก้ไข</span>
                    </>
                  )}
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
                <div className="relative mt-1">
                  <input 
                    type={showEditUserPassword ? "text" : "password"} 
                    value={userPassword} 
                    onChange={e => setUserPassword(e.target.value)} 
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 pr-10 border dark:bg-gray-800 dark:border-gray-600 dark:text-white" 
                    placeholder="••••••••" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditUserPassword(!showEditUserPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    title={showEditUserPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  >
                    {showEditUserPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">สิทธิ์</label>
                <select value={userRole} onChange={e => setUserRole(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border">
                  {Object.entries(rolesMap).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {userRole === "STUDENT" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ชั้นปี</label>
                    <select value={userLevel} onChange={e => setUserLevel(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border">
                      {studentLevelsOptions.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">รหัสผูกผู้ปกครอง (Parent Code)</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input 
                        type="text" 
                        value={userParentCode} 
                        onChange={e => setUserParentCode(e.target.value.toUpperCase())} 
                        placeholder="เช่น P-7492-8K2M" 
                        className="block w-full font-mono font-bold rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 uppercase" 
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
                          let num = Math.floor(1000 + Math.random() * 9000);
                          let str = "";
                          for (let i = 0; i < 4; i++) str += chars.charAt(Math.floor(Math.random() * chars.length));
                          setUserParentCode(`P-${num}-${str}`);
                        }}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md text-xs font-semibold whitespace-nowrap transition"
                        title="สุ่มรหัสใหม่"
                      >
                        สุ่มใหม่
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">รหัสเฉพาะสำหรับผู้ปกครองของนักเรียนคนนี้ใช้ผูกข้อมูล</p>
                  </div>
                </>
              )}
              {userRole === "PARENT" && (
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    ผูกกับนักเรียน (บุตรหลาน)
                  </label>
                  {isStudentDropdownOpen && (
                    <div className="fixed inset-0 z-40" onClick={() => setIsStudentDropdownOpen(false)}></div>
                  )}
                  <div className="relative z-40">
                    <div
                      onClick={() => setIsStudentDropdownOpen(!isStudentDropdownOpen)}
                      className={`mt-1 flex items-center justify-between w-full rounded-md border shadow-sm sm:text-sm px-3 py-2 cursor-pointer bg-white dark:bg-gray-800 transition-colors ${isStudentDropdownOpen ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'}`}
                    >
                      <span className={`${userStudentId ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-500'} truncate`}>
                        {userStudentId
                          ? (() => {
                              const st = users.find(u => u.id === userStudentId);
                              return st ? `${st.name} (${st.username})` : "-- ไม่ระบุ --";
                            })()
                          : "-- ค้นหาและเลือกนักเรียน --"}
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${isStudentDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>

                    {isStudentDropdownOpen && (
                      <div className="absolute w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-xl max-h-52 overflow-y-auto z-50">
                        <div className="p-2 sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 z-10 shadow-sm">
                          <input
                            type="text"
                            value={studentSearchQuery}
                            onChange={e => setStudentSearchQuery(e.target.value)}
                            placeholder="พิมพ์ชื่อ หรือ รหัสนักเรียน..."
                            className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                            autoFocus
                          />
                        </div>
                        <div className="py-1">
                          <div
                            onClick={() => {
                              setUserStudentId("");
                              setIsStudentDropdownOpen(false);
                              setStudentSearchQuery("");
                            }}
                            className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer italic"
                          >
                            -- ไม่ระบุ --
                          </div>
                          {users
                            .filter(u => u.role === "STUDENT" && !u.deletedAt)
                            .filter(u => {
                              if (!studentSearchQuery) return true;
                              const q = studentSearchQuery.toLowerCase();
                              return u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || (u.level && u.level.toLowerCase().includes(q));
                            })
                            .map(u => (
                              <div
                                key={u.id}
                                onClick={() => {
                                  setUserStudentId(u.id);
                                  setIsStudentDropdownOpen(false);
                                  setStudentSearchQuery("");
                                }}
                                className={`px-4 py-2 text-sm cursor-pointer transition-colors flex items-center justify-between ${userStudentId === u.id ? 'bg-indigo-50 text-indigo-900 border-l-2 border-indigo-500 dark:bg-indigo-900/60 dark:text-indigo-200' : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50 border-l-2 border-transparent'}`}
                              >
                                <div>
                                  <span className="font-semibold">{u.name}</span>
                                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({u.username})</span>
                                </div>
                                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-1.5 py-0.5 rounded">
                                  {u.level || "-"}
                                </span>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    )}
                  </div>
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

      {/* ================= Parent Codes Management Modal ================= */}
      {isParentCodesModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 flex flex-col rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-700 bg-amber-50/60 dark:bg-amber-950/20 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xl shadow-sm">
                  🔑
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                    รหัสผูกผู้ปกครอง (Parent Codes) ของนักเรียนทั้งหมด
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    นำรหัสเฉพาะเหล่านี้ไปแจกให้ผู้ปกครองในวันประชุมผู้ปกครอง หรือส่งให้นักเรียนเพื่อส่งต่อให้พ่อแม่ใช้ลงทะเบียน
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsParentCodesModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition"
              >
                ✕
              </button>
            </div>

            {/* Actions Bar */}
            {(() => {
              const missingCount = users.filter((u: any) => u.role === "STUDENT" && !u.deletedAt && (!u.parentCode || !u.parentCode.trim())).length;
              return (
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-750 flex flex-wrap items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <input 
                      type="text" 
                      value={parentCodeSearch}
                      onChange={e => setParentCodeSearch(e.target.value)}
                      placeholder="ค้นหาชื่อ, รหัสนักศึกษา, ชั้นปี หรือรหัสโค้ด..." 
                      className="w-full sm:w-72 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {missingCount > 0 && (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={async () => {
                          setIsLoading(true);
                          try {
                            const res = await generateParentCodesForAllStudents();
                            showToast(`สร้างรหัสผู้ปกครองสำเร็จ (${res.count} คน)`, "success");
                          } catch (e: any) {
                            showError("เกิดข้อผิดพลาด", e.message);
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                      >
                        ⚡ สร้างรหัสให้อัตโนมัติ ({missingCount} คนที่ยังไม่มี)
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handlePrintParentCodes}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                    >
                      🖨️ พิมพ์รายการ
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Students Table */}
            <div className="overflow-y-auto flex-1 p-4">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 shadow-xs">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">ลำดับ</th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">รหัสนักศึกษา</th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">ชื่อ-นามสกุล</th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">ชั้นปี</th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">รหัสผูกผู้ปกครอง (Parent Code)</th>
                    <th className="px-4 py-2.5 text-right text-xs font-bold text-gray-500 uppercase">คัดลอก</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-750">
                  {users
                    .filter(u => u.role === "STUDENT" && !u.deletedAt)
                    .filter(u => {
                      if (!parentCodeSearch) return true;
                      const q = parentCodeSearch.toLowerCase();
                      return (
                        u.name?.toLowerCase().includes(q) ||
                        u.username?.toLowerCase().includes(q) ||
                        u.level?.toLowerCase().includes(q) ||
                        u.parentCode?.toLowerCase().includes(q)
                      );
                    })
                    .map((st, idx) => (
                      <tr key={st.id} className="hover:bg-amber-50/40 dark:hover:bg-gray-700/50 transition">
                        <td className="px-4 py-2 text-gray-400 font-mono text-xs">{idx + 1}</td>
                        <td className="px-4 py-2 font-mono font-semibold text-gray-900 dark:text-white">{st.username}</td>
                        <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{st.name}</td>
                        <td className="px-4 py-2">
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {st.level || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className="font-mono font-bold text-amber-900 dark:text-amber-200 bg-amber-100/70 dark:bg-amber-950/40 px-2.5 py-1 rounded border border-amber-300/80 dark:border-amber-800 tracking-wider">
                            {st.parentCode || <span className="text-gray-400 font-normal italic">ยังไม่มีรหัส</span>}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              if (st.parentCode) {
                                navigator.clipboard.writeText(st.parentCode);
                                showToast(`คัดลอกรหัส ${st.parentCode} (${st.name}) แล้ว`, "success");
                              }
                            }}
                            disabled={!st.parentCode}
                            className="text-xs px-2.5 py-1 bg-white hover:bg-gray-50 border border-gray-200 dark:bg-gray-700 dark:border-gray-600 rounded text-gray-700 dark:text-gray-200 font-medium transition disabled:opacity-30"
                          >
                            คัดลอก
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-750 flex justify-end">
              <button
                type="button"
                onClick={() => setIsParentCodesModalOpen(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-semibold transition"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
