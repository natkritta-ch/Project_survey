"use server";

import prisma from "../../../lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { generateParentCode } from "../../../lib/parentCode";

import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";

async function requireHeadAuth() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "HEAD") {
    throw new Error("Unauthorized: Only HEAD can perform this action");
  }
}


export async function createSubject(data: { code: string; name: string; level: string; group?: string; room?: string | null; teacherId?: string | null; academicYear?: string; term?: string; credit?: number }) {
  await requireHeadAuth();
  await prisma.subject.create({ data });
  revalidatePath("/dashboard/head");
}

export async function updateSubject(id: string, data: { code: string; name: string; level: string; group?: string; room?: string | null; teacherId?: string | null; academicYear?: string; term?: string; credit?: number }) {
  await requireHeadAuth();
  await prisma.subject.update({ where: { id }, data });
  revalidatePath("/dashboard/head");
}

export async function deleteSubject(id: string) {
  await requireHeadAuth();
  await prisma.subject.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/dashboard/head");
}

export async function deleteManySubjects(ids: string[]) {
  await requireHeadAuth();
  if (!ids || ids.length === 0) return;
  await prisma.subject.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date() } });
  revalidatePath("/dashboard/head");
}

export async function restoreSubject(id: string) {
  await requireHeadAuth();
  await prisma.subject.update({ where: { id }, data: { deletedAt: null } });
  revalidatePath("/dashboard/head");
}

export async function hardDeleteSubject(id: string) {
  await requireHeadAuth();
  await prisma.subject.delete({ where: { id } });
  revalidatePath("/dashboard/head");
}

import { timeToMinutes, isOverlapping } from "../../../lib/timeUtils";

// Helper: ตรวจสอบว่า 2 กลุ่มเรียนมีนักเรียนกลุ่มเดียวกันหรือไม่ (เช่น ก.1,2 ชนกับ ก.1)
function doGroupsOverlap(g1?: string | null, g2?: string | null): boolean {
  const a = (g1 || "").trim();
  const b = (g2 || "").trim();
  if (!a || !b) return true; // ถ้าไม่ระบุ ถือว่าเรียนรวมทุกกลุ่ม
  if (a === b) return true; // กลุ่มเดียวกันเป๊ะ เช่น ก.1 กับ ก.1

  const extractTokens = (s: string) => {
    const nums = s.match(/\d+/g);
    if (nums && nums.length > 0) return nums;
    return [s.toLowerCase()];
  };

  const partsA = extractTokens(a);
  const partsB = extractTokens(b);
  return partsA.some(x => partsB.includes(x));
}

export async function createSchedule(data: { subjectId: string; dayOfWeek: number; startTime: string; endTime: string }) {
  await requireHeadAuth();

  // ดึงข้อมูลวิชาที่จะสร้างตารางเรียนเพื่อเอาห้องและอาจารย์
  const currentSubject = await prisma.subject.findUnique({
    where: { id: data.subjectId },
    include: { teacher: true }
  });

  if (!currentSubject) {
    return { success: false, error: "ไม่พบข้อมูลวิชาที่เลือก" };
  }

  // ดึงตารางเรียนทั้งหมดในวันเดียวกันที่ไม่ถูกลบ
  const existingSchedules = await prisma.schedule.findMany({
    where: { dayOfWeek: data.dayOfWeek, deletedAt: null },
    include: { subject: { include: { teacher: true } } }
  });

  for (const sc of existingSchedules) {
    if (!sc.subject || sc.subject.deletedAt) continue;

    // ตรวจสอบภาคเรียนและปีการศึกษา: ถ้าอยู่คนละเทอม หรือคนละปีการศึกษา ไม่ถือว่าชนกัน (เพราะเรียนคนละช่วงเวลาของปี)
    const currentTerm = String(currentSubject.term || "1");
    const currentYear = String(currentSubject.academicYear || "2569");
    const existingTerm = String(sc.subject.term || "1");
    const existingYear = String(sc.subject.academicYear || "2569");

    if (currentTerm !== existingTerm || currentYear !== existingYear) {
      continue;
    }

    if (isOverlapping(data.startTime, data.endTime, sc.startTime, sc.endTime)) {
      // 1. วิชาเดียวกัน (แถวเดียวกันใน DB)
      if (sc.subjectId === data.subjectId) {
        const grp = currentSubject.group ? ` [กลุ่ม ${currentSubject.group}]` : "";
        return {
          success: false,
          error: `TIME_COLLISION: วิชานี้ (${currentSubject.name}${grp}) มีตารางเรียนในวันนี้ที่เวลา ${sc.startTime}–${sc.endTime} แล้ว ซึ่งชนกับ ${data.startTime}–${data.endTime} กรุณาเลือกเวลาอื่น`
        };
      }

      // 2. นักเรียนชั้นปีและกลุ่มเรียนเดียวกัน (ห้ามมีเรียนซ้อนกัน เช่น เรียนอังกฤษอยู่ จะลงคณิตเวลาเดียวกันไม่ได้)
      const currentLevel = (currentSubject.level || "").trim();
      const existingLevel = (sc.subject.level || "").trim();
      const sameLevel = (!currentLevel && !existingLevel) || currentLevel === existingLevel;

      if (sameLevel && doGroupsOverlap(currentSubject.group, sc.subject.group)) {
        const scGroup = sc.subject.group ? ` [กลุ่ม ${sc.subject.group}]` : "";
        const levelDisplay = currentSubject.level && currentSubject.level !== "-" ? `ชั้น ${currentSubject.level}` : "";
        return {
          success: false,
          error: `TIME_COLLISION: นักเรียน${levelDisplay}${scGroup} มีตารางเรียนวิชา "${sc.subject.name}" (${sc.subject.code}) ในวันนี้ที่เวลา ${sc.startTime}–${sc.endTime} แล้ว ซึ่งชนกับเวลาที่เลือก (${data.startTime}–${data.endTime}) นักเรียนไม่สามารถเรียน 2 วิชาพร้อมกันได้ กรุณาเลือกเวลาอื่น`
        };
      }

      // 3. ห้องเรียนเดียวกัน (ถ้ามีการระบุห้อง และไม่ใช่ห้องเรียนรวม/สนาม/ลาน/ออนไลน์)
      const currentRoom = currentSubject.room?.trim() || "";
      const existingRoom = sc.subject.room?.trim() || "";
      const isExemptRoom = (r: string) => !r || r === "-" || r.includes("รวม") || r.includes("สนาม") || r.includes("ลาน") || r.includes("ออนไลน์");

      if (currentRoom && existingRoom && currentRoom === existingRoom && !isExemptRoom(currentRoom)) {
        const scTeacher = sc.subject.teacher?.name ? ` (อ.${sc.subject.teacher.name})` : "";
        const scGroup = sc.subject.group ? ` [กลุ่ม ${sc.subject.group}]` : "";
        return {
          success: false,
          error: `TIME_COLLISION: ห้องเรียน "${currentRoom}" มีวิชา "${sc.subject.name}"${scGroup}${scTeacher} ใช้เรียนในวันนี้ที่เวลา ${sc.startTime}–${sc.endTime} แล้ว ซึ่งชนกับเวลาที่เลือก กรุณาระบุห้องเรียนคนละห้อง (เช่น แยกห้อง 201, 202) หรือเปลี่ยนเวลาเรียน`
        };
      }

      // 4. อาจารย์ผู้สอนคนเดียวกัน (ถ้ามีการระบุอาจารย์)
      if (currentSubject.teacherId && sc.subject.teacherId === currentSubject.teacherId) {
        const teacherName = currentSubject.teacher?.name || "อาจารย์ผู้สอน";
        const scGroup = sc.subject.group ? ` [กลุ่ม ${sc.subject.group}]` : "";
        return {
          success: false,
          error: `TIME_COLLISION: ${teacherName} มีคาบสอนวิชา "${sc.subject.name}"${scGroup} ในวันนี้ที่เวลา ${sc.startTime}–${sc.endTime} แล้ว ซึ่งชนกับเวลาที่เลือก กรุณาเปลี่ยนเวลา`
        };
      }
    }
  }

  await prisma.schedule.create({ data });
  revalidatePath("/dashboard/head");
  return { success: true };
}

export async function updateSchedule(id: string, data: { subjectId: string; dayOfWeek: number; startTime: string; endTime: string }) {
  await requireHeadAuth();

  // ดึงข้อมูลวิชาที่จะสร้างตารางเรียนเพื่อเอาห้องและอาจารย์
  const currentSubject = await prisma.subject.findUnique({
    where: { id: data.subjectId },
    include: { teacher: true }
  });

  if (!currentSubject) {
    return { success: false, error: "ไม่พบข้อมูลวิชาที่เลือก" };
  }

  // ดึงตารางเรียนทั้งหมดในวันเดียวกันที่ไม่ถูกลบ (ยกเว้น record ตัวเอง)
  const existingSchedules = await prisma.schedule.findMany({
    where: { dayOfWeek: data.dayOfWeek, deletedAt: null, id: { not: id } },
    include: { subject: { include: { teacher: true } } }
  });

  for (const sc of existingSchedules) {
    if (!sc.subject || sc.subject.deletedAt) continue;

    // ตรวจสอบภาคเรียนและปีการศึกษา: ถ้าอยู่คนละเทอม หรือคนละปีการศึกษา ไม่ถือว่าชนกัน (เพราะเรียนคนละช่วงเวลาของปี)
    const currentTerm = String(currentSubject.term || "1");
    const currentYear = String(currentSubject.academicYear || "2569");
    const existingTerm = String(sc.subject.term || "1");
    const existingYear = String(sc.subject.academicYear || "2569");

    if (currentTerm !== existingTerm || currentYear !== existingYear) {
      continue;
    }

    if (isOverlapping(data.startTime, data.endTime, sc.startTime, sc.endTime)) {
      // 1. วิชาเดียวกัน (แถวเดียวกันใน DB)
      if (sc.subjectId === data.subjectId) {
        const grp = currentSubject.group ? ` [กลุ่ม ${currentSubject.group}]` : "";
        return {
          success: false,
          error: `TIME_COLLISION: วิชานี้ (${currentSubject.name}${grp}) มีตารางเรียนในวันนี้ที่เวลา ${sc.startTime}–${sc.endTime} แล้ว ซึ่งชนกับ ${data.startTime}–${data.endTime} กรุณาเลือกเวลาอื่น`
        };
      }

      // 2. นักเรียนชั้นปีและกลุ่มเรียนเดียวกัน (ห้ามมีเรียนซ้อนกัน)
      const currentLevel = (currentSubject.level || "").trim();
      const existingLevel = (sc.subject.level || "").trim();
      const sameLevel = (!currentLevel && !existingLevel) || currentLevel === existingLevel;

      if (sameLevel && doGroupsOverlap(currentSubject.group, sc.subject.group)) {
        const scGroup = sc.subject.group ? ` [กลุ่ม ${sc.subject.group}]` : "";
        const levelDisplay = currentSubject.level && currentSubject.level !== "-" ? `ชั้น ${currentSubject.level}` : "";
        return {
          success: false,
          error: `TIME_COLLISION: นักเรียน${levelDisplay}${scGroup} มีตารางเรียนวิชา "${sc.subject.name}" (${sc.subject.code}) ในวันนี้ที่เวลา ${sc.startTime}–${sc.endTime} แล้ว ซึ่งชนกับเวลาที่เลือก (${data.startTime}–${data.endTime}) นักเรียนไม่สามารถเรียน 2 วิชาพร้อมกันได้ กรุณาเลือกเวลาอื่น`
        };
      }

      // 3. ห้องเรียนเดียวกัน (ถ้ามีการระบุห้อง และไม่ใช่ห้องเรียนรวม/สนาม/ลาน/ออนไลน์)
      const currentRoom = currentSubject.room?.trim() || "";
      const existingRoom = sc.subject.room?.trim() || "";
      const isExemptRoom = (r: string) => !r || r === "-" || r.includes("รวม") || r.includes("สนาม") || r.includes("ลาน") || r.includes("ออนไลน์");

      if (currentRoom && existingRoom && currentRoom === existingRoom && !isExemptRoom(currentRoom)) {
        const scTeacher = sc.subject.teacher?.name ? ` (อ.${sc.subject.teacher.name})` : "";
        const scGroup = sc.subject.group ? ` [กลุ่ม ${sc.subject.group}]` : "";
        return {
          success: false,
          error: `TIME_COLLISION: ห้องเรียน "${currentRoom}" มีวิชา "${sc.subject.name}"${scGroup}${scTeacher} ใช้เรียนในวันนี้ที่เวลา ${sc.startTime}–${sc.endTime} แล้ว ซึ่งชนกับเวลาที่เลือก กรุณาระบุห้องเรียนคนละห้อง (เช่น แยกห้อง 201, 202) หรือเปลี่ยนเวลาเรียน`
        };
      }

      // 4. อาจารย์ผู้สอนคนเดียวกัน (ถ้ามีการระบุอาจารย์)
      if (currentSubject.teacherId && sc.subject.teacherId === currentSubject.teacherId) {
        const teacherName = currentSubject.teacher?.name || "อาจารย์ผู้สอน";
        const scGroup = sc.subject.group ? ` [กลุ่ม ${sc.subject.group}]` : "";
        return {
          success: false,
          error: `TIME_COLLISION: ${teacherName} มีคาบสอนวิชา "${sc.subject.name}"${scGroup} ในวันนี้ที่เวลา ${sc.startTime}–${sc.endTime} แล้ว ซึ่งชนกับเวลาที่เลือก กรุณาเปลี่ยนเวลา`
        };
      }
    }
  }

  await prisma.schedule.update({ where: { id }, data });
  revalidatePath("/dashboard/head");
  return { success: true };
}

export async function deleteSchedule(id: string) {
  await requireHeadAuth();
  await prisma.schedule.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/dashboard/head");
}

export async function deleteManySchedules(ids: string[]) {
  await requireHeadAuth();
  if (!ids || ids.length === 0) return;
  await prisma.schedule.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date() } });
  revalidatePath("/dashboard/head");
}

export async function restoreSchedule(id: string) {
  await requireHeadAuth();
  await prisma.schedule.update({ where: { id }, data: { deletedAt: null } });
  revalidatePath("/dashboard/head");
}

export async function hardDeleteSchedule(id: string) {
  await requireHeadAuth();
  await prisma.schedule.delete({ where: { id } });
  revalidatePath("/dashboard/head");
}

export async function createUser(data: any) {
  await requireHeadAuth();
  // Bug #11 fix: hash password ก่อน store
  if (data.password) {
    data.password = await bcrypt.hash(data.password, 10);
  }
  // ถ้าเป็นนักเรียนและยังไม่มี parentCode ให้สร้างอัตโนมัติ
  if (data.role === "STUDENT" && !data.parentCode) {
    data.parentCode = generateParentCode();
  }
  const created = await prisma.user.create({ data });

  // ถ้าเป็นผู้ปกครองและมีการระบุ studentId ให้สร้าง ParentStudentLink สถานะ APPROVED อัตโนมัติ
  if (data.role === "PARENT" && data.studentId) {
    await prisma.parentStudentLink.upsert({
      where: { parentId_studentId: { parentId: created.id, studentId: data.studentId } },
      create: { parentId: created.id, studentId: data.studentId, status: "APPROVED" },
      update: { status: "APPROVED" }
    });
  }

  revalidatePath("/dashboard/head");
  revalidatePath("/dashboard/parent");
  revalidatePath("/dashboard/student");
}

export async function generateParentCodesForAllStudents() {
  await requireHeadAuth();
  const studentsWithoutCode = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      OR: [
        { parentCode: null },
        { parentCode: "" }
      ]
    },
    select: { id: true }
  });

  for (const st of studentsWithoutCode) {
    for (let i = 0; i < 5; i++) {
      try {
        await prisma.user.update({
          where: { id: st.id },
          data: { parentCode: generateParentCode() }
        });
        break;
      } catch (err: any) {
        if (err.code === "P2002") continue;
        break;
      }
    }
  }

  revalidatePath("/dashboard/head");
  revalidatePath("/dashboard/student");
  return { count: studentsWithoutCode.length };
}

export async function updateUser(id: string, data: any) {
  await requireHeadAuth();
  // Bug #11 fix: hash password เมื่อมีการเปลี่ยนรหัสผ่าน
  if (data.password) {
    data.password = await bcrypt.hash(data.password, 10);
  }
  await prisma.user.update({ where: { id }, data });

  // ซิงค์ ParentStudentLink สำหรับผู้ปกครอง
  if (data.role === "PARENT" || data.studentId !== undefined) {
    if (data.studentId) {
      await prisma.parentStudentLink.upsert({
        where: { parentId_studentId: { parentId: id, studentId: data.studentId } },
        create: { parentId: id, studentId: data.studentId, status: "APPROVED" },
        update: { status: "APPROVED" }
      });
    } else if (data.studentId === null) {
      // ถ้าเคลียร์ studentId ให้ปรับสถานะ ParentStudentLink เป็น REJECTED
      await prisma.parentStudentLink.updateMany({
        where: { parentId: id },
        data: { status: "REJECTED" }
      });
    }
  }

  revalidatePath("/dashboard/head");
  revalidatePath("/dashboard/parent");
  revalidatePath("/dashboard/student");
}

export async function deleteUser(id: string) {
  await requireHeadAuth();
  await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/dashboard/head");
}

export async function deleteManyUsers(ids: string[]) {
  await requireHeadAuth();
  if (!ids || ids.length === 0) return;
  await prisma.user.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date() } });
  revalidatePath("/dashboard/head");
}

export async function restoreUser(id: string) {
  await requireHeadAuth();
  await prisma.user.update({ where: { id }, data: { deletedAt: null } });
  revalidatePath("/dashboard/head");
}

export async function hardDeleteUser(id: string) {
  await requireHeadAuth();
  await prisma.user.delete({ where: { id } });
  revalidatePath("/dashboard/head");
}

// ================= BULK TRASH ACTIONS =================
export async function restoreAllSubjects() {
  await requireHeadAuth();
  await prisma.subject.updateMany({ where: { deletedAt: { not: null } }, data: { deletedAt: null } });
  revalidatePath("/dashboard/head");
}

export async function hardDeleteAllSubjects() {
  await requireHeadAuth();
  await prisma.subject.deleteMany({ where: { deletedAt: { not: null } } });
  revalidatePath("/dashboard/head");
}

export async function restoreAllSchedules() {
  await requireHeadAuth();
  await prisma.schedule.updateMany({ where: { deletedAt: { not: null } }, data: { deletedAt: null } });
  revalidatePath("/dashboard/head");
}

export async function hardDeleteAllSchedules() {
  await requireHeadAuth();
  await prisma.schedule.deleteMany({ where: { deletedAt: { not: null } } });
  revalidatePath("/dashboard/head");
}

export async function restoreAllUsers() {
  await requireHeadAuth();
  await prisma.user.updateMany({ where: { deletedAt: { not: null } }, data: { deletedAt: null } });
  revalidatePath("/dashboard/head");
}

export async function hardDeleteAllUsers() {
  await requireHeadAuth();
  await prisma.user.deleteMany({ where: { deletedAt: { not: null } } });
  revalidatePath("/dashboard/head");
}

export async function clearOldTrash() {
  await requireHeadAuth();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  await prisma.subject.deleteMany({ where: { deletedAt: { lt: sevenDaysAgo } } });
  await prisma.schedule.deleteMany({ where: { deletedAt: { lt: sevenDaysAgo } } });
  await prisma.user.deleteMany({ where: { deletedAt: { lt: sevenDaysAgo } } });
  try {
    await (prisma as any).makeupClass.deleteMany({ where: { deletedAt: { lt: sevenDaysAgo } } });
  } catch (e) {
    // Ignore if table/column not available
  }
}


export async function toggleEditPermission(id: string, canEditProfile: boolean) {
  await requireHeadAuth();
  await prisma.user.update({ where: { id }, data: { canEditProfile } });
  revalidatePath("/dashboard/head");
}

export async function createOrUpdateTermConfig(data: { academicYear: string; term: string; startDate: Date; endDate: Date }) {
  await requireHeadAuth();
  const existing = await prisma.termConfig.findUnique({
    where: { academicYear_term: { academicYear: data.academicYear, term: data.term } }
  });
  if (existing) {
    await prisma.termConfig.update({ where: { id: existing.id }, data });
  } else {
    await prisma.termConfig.create({ data });
  }
  revalidatePath("/dashboard/head");
  revalidatePath("/dashboard/teacher");
}

export async function advanceAcademicTerm(data: {
  nextTerm: string;
  nextYear: string;
  startDate: string;
  endDate: string;
  promoteLevels: boolean;
  promoteAdvisors?: boolean;
  cloneSubjectsAndSchedules?: boolean;
}) {
  await requireHeadAuth();

  // หาปีการศึกษาเดิมก่อนหน้าเพื่อใช้ในการเลื่อนอาจารย์ที่ปรึกษาตามรุ่นและ Auto-clone รายวิชา/ตารางสอน
  const currentActiveTerm = await prisma.termConfig.findFirst({
    where: { isCurrent: true }
  });
  const previousYear = currentActiveTerm?.academicYear;

  const start = new Date(data.startDate);
  const end = new Date(data.endDate);

  // 1. ปิด isCurrent ของทุกเทอมเก่า
  await prisma.termConfig.updateMany({
    data: { isCurrent: false }
  });

  // 2. สร้างหรืออัปเดตเทอมใหม่ พร้อมตั้ง isCurrent: true
  const existingTerm = await prisma.termConfig.findUnique({
    where: { academicYear_term: { academicYear: data.nextYear, term: data.nextTerm } }
  });

  if (existingTerm) {
    await prisma.termConfig.update({
      where: { id: existingTerm.id },
      data: { startDate: start, endDate: end, isCurrent: true }
    });
  } else {
    await prisma.termConfig.create({
      data: { academicYear: data.nextYear, term: data.nextTerm, startDate: start, endDate: end, isCurrent: true }
    });
  }

  // 3. กรณีเลื่อนชั้นปี (promoteLevels = true)
  const promotedCounts: Record<string, number> = {};
  let totalPromoted = 0;

  if (data.promoteLevels) {
    const students = await prisma.user.findMany({ where: { role: "STUDENT", deletedAt: null } });
    const transactions: any[] = [];

    for (const student of students) {
      let nextLevel = student.level;
      let transitionKey = "";
      if (student.level === "ปวช.1") { nextLevel = "ปวช.2"; transitionKey = "ปวช.1 ➡️ ปวช.2"; }
      else if (student.level === "ปวช.2") { nextLevel = "ปวช.3"; transitionKey = "ปวช.2 ➡️ ปวช.3"; }
      else if (student.level === "ปวช.3") { nextLevel = "จบการศึกษา"; transitionKey = "ปวช.3 ➡️ จบการศึกษา"; }
      else if (student.level === "ปวส.1") { nextLevel = "ปวส.2"; transitionKey = "ปวส.1 ➡️ ปวส.2"; }
      else if (student.level === "ปวส.2") { nextLevel = "จบการศึกษา"; transitionKey = "ปวส.2 ➡️ จบการศึกษา"; }
      else if (student.level === "ปวส.1(ม.6)") { nextLevel = "ปวส.2(ม.6)"; transitionKey = "ปวส.1(ม.6) ➡️ ปวส.2(ม.6)"; }
      else if (student.level === "ปวส.2(ม.6)") { nextLevel = "จบการศึกษา"; transitionKey = "ปวส.2(ม.6) ➡️ จบการศึกษา"; }

      if (nextLevel && nextLevel !== student.level) {
        if (transitionKey) promotedCounts[transitionKey] = (promotedCounts[transitionKey] || 0) + 1;
        totalPromoted++;
        if (nextLevel === "จบการศึกษา") {
          transactions.push(
            prisma.user.update({
              where: { id: student.id },
              data: { level: nextLevel, updatedAt: new Date() }
            })
          );
        } else {
          transactions.push(
            prisma.user.update({
              where: { id: student.id },
              data: { level: nextLevel }
            })
          );
        }
      }
    }

    if (transactions.length > 0) {
      await prisma.$transaction(transactions);
    }

    // เลื่อนอาจารย์ที่ปรึกษาตามรุ่นชั้นปี (ถ้าติ๊กเลือก)
    if (data.promoteAdvisors && previousYear && previousYear !== data.nextYear) {
      try {
        await promoteAdvisorsToNextYear(previousYear, data.nextYear);
      } catch (err) {
        console.error("Failed to auto-promote advisors:", err);
      }
    }
  }

  // 4. Auto-clone รายวิชาและตารางสอนข้ามปี (ถ้าติ๊กเลือก และเลื่อนข้ามปีการศึกษา)
  let clonedSubjectsCount = 0;
  let clonedSchedulesCount = 0;
  if (data.cloneSubjectsAndSchedules !== false && previousYear && previousYear !== data.nextYear) {
    try {
      const cloneRes = await copySubjectsAndSchedulesFromPreviousYear(previousYear, data.nextYear);
      clonedSubjectsCount = cloneRes.clonedSubjects;
      clonedSchedulesCount = cloneRes.clonedSchedules;
    } catch (err) {
      console.error("Failed to auto-clone subjects and schedules:", err);
    }
  }

  revalidatePath("/dashboard/head");
  revalidatePath("/dashboard/teacher");
  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/parent");

  return {
    success: true,
    nextTerm: data.nextTerm,
    nextYear: data.nextYear,
    promoteLevels: data.promoteLevels,
    promotedCounts,
    totalPromoted,
    clonedSubjectsCount,
    clonedSchedulesCount
  };
}

export async function copySubjectsAndSchedulesFromPreviousYear(
  fromYear: string,
  toYear: string,
  targetTerm?: string
) {
  await requireHeadAuth();

  if (!fromYear || !toYear) {
    throw new Error("กรุณาระบุปีการศึกษาต้นทางและปลายทาง");
  }
  if (fromYear === toYear) {
    throw new Error("ปีการศึกษาต้นทางและปลายทางต้องไม่เป็นปีเดียวกัน");
  }

  // 1. ค้นหารายวิชาต้นทางทั้งหมดที่ยังไม่ถูกลบ
  const sourceSubjects = await prisma.subject.findMany({
    where: {
      academicYear: fromYear,
      deletedAt: null,
      ...(targetTerm && targetTerm !== "all" ? { term: targetTerm } : {})
    },
    include: {
      schedule: {
        where: { deletedAt: null }
      }
    }
  });

  if (sourceSubjects.length === 0) {
    return {
      success: true,
      clonedSubjects: 0,
      clonedSchedules: 0,
      message: `ไม่พบรายวิชาในปีการศึกษา ${fromYear}${targetTerm && targetTerm !== "all" ? ` (เทอม ${targetTerm})` : ""}`
    };
  }

  let clonedSubjectsCount = 0;
  let clonedSchedulesCount = 0;

  for (const srcSubj of sourceSubjects) {
    // ตรวจสอบครูผู้สอนว่ายังมีอยู่ในระบบหรือไม่
    let teacherIdToUse = srcSubj.teacherId;
    if (teacherIdToUse) {
      const teacherExists = await prisma.user.findFirst({
        where: { id: teacherIdToUse, deletedAt: null }
      });
      if (!teacherExists) {
        teacherIdToUse = null;
      }
    }

    // ตรวจสอบว่ามีวิชานี้ในปีปลายทางหรือยัง (code, academicYear, term, group, level)
    let targetSubj = await prisma.subject.findFirst({
      where: {
        code: srcSubj.code,
        academicYear: toYear,
        term: srcSubj.term,
        group: srcSubj.group,
        level: srcSubj.level
      }
    });

    if (!targetSubj) {
      targetSubj = await prisma.subject.create({
        data: {
          name: srcSubj.name,
          code: srcSubj.code,
          level: srcSubj.level,
          group: srcSubj.group,
          room: srcSubj.room,
          academicYear: toYear,
          term: srcSubj.term,
          credit: srcSubj.credit,
          teacherId: teacherIdToUse,
          lateThresholdMin: srcSubj.lateThresholdMin,
        }
      });
      clonedSubjectsCount++;
    } else if (targetSubj.deletedAt) {
      // หากเคยถูกลบไว้ ให้กู้คืน
      await prisma.subject.update({
        where: { id: targetSubj.id },
        data: { deletedAt: null }
      });
    }

    // คัดลอกตารางสอนของวิชานี้
    if (srcSubj.schedule && srcSubj.schedule.length > 0) {
      for (const sc of srcSubj.schedule) {
        const existingSchedule = await prisma.schedule.findFirst({
          where: {
            subjectId: targetSubj.id,
            dayOfWeek: sc.dayOfWeek,
            startTime: sc.startTime,
            endTime: sc.endTime,
            deletedAt: null
          }
        });

        if (!existingSchedule) {
          await prisma.schedule.create({
            data: {
              subjectId: targetSubj.id,
              dayOfWeek: sc.dayOfWeek,
              startTime: sc.startTime,
              endTime: sc.endTime
            }
          });
          clonedSchedulesCount++;
        }
      }
    }
  }

  revalidatePath("/dashboard/head");
  revalidatePath("/dashboard/teacher");
  return {
    success: true,
    clonedSubjects: clonedSubjectsCount,
    clonedSchedules: clonedSchedulesCount,
    message: `คัดลอกรายวิชาสำเร็จ ${clonedSubjectsCount} วิชา และตารางสอน ${clonedSchedulesCount} คาบ จากปี ${fromYear} สู่ปี ${toYear}`
  };
}

export async function promoteStudents() {
  await requireHeadAuth();
  const students = await prisma.user.findMany({ where: { role: "STUDENT", deletedAt: null } });
  
  const transactions: any[] = [];
  
  for (const student of students) {
    let nextLevel = student.level;
    if (student.level === "ปวช.1") nextLevel = "ปวช.2";
    else if (student.level === "ปวช.2") nextLevel = "ปวช.3";
    else if (student.level === "ปวช.3") nextLevel = "จบการศึกษา";
    else if (student.level === "ปวส.1") nextLevel = "ปวส.2";
    else if (student.level === "ปวส.2") nextLevel = "จบการศึกษา";
    else if (student.level === "ปวส.1(ม.6)") nextLevel = "ปวส.2(ม.6)";
    else if (student.level === "ปวส.2(ม.6)") nextLevel = "จบการศึกษา";
    
    if (nextLevel !== student.level) {
      if (nextLevel === "จบการศึกษา") {
        transactions.push(
          prisma.user.update({
            where: { id: student.id },
            data: { level: nextLevel, updatedAt: new Date() }
          })
        );
      } else {
        transactions.push(
          prisma.user.update({
            where: { id: student.id },
            data: { level: nextLevel }
          })
        );
      }
    }
  }
  
  if (transactions.length > 0) {
    await prisma.$transaction(transactions);
  }
  
  revalidatePath("/dashboard/head");
}

export async function clearOldGraduates() {
  await requireHeadAuth();
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

  await prisma.user.deleteMany({
    where: {
      role: "STUDENT",
      level: "จบการศึกษา",
      updatedAt: { lt: threeYearsAgo }
    }
  });
  revalidatePath("/dashboard/head");
}

export async function getUserDetails(userId: string) {
  await requireHeadAuth();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      attendances: { include: { subject: true }, orderBy: { timestamp: 'desc' } }
    }
  });
  return user;
}

// ================= CLASSROOM ADVISOR MANAGEMENT =================

export async function getClassroomAdvisors(academicYear: string) {
  await requireHeadAuth();
  try {
    const advisors = await (prisma as any).classroomAdvisor.findMany({
      where: { academicYear },
      include: {
        primaryAdvisor: { select: { id: true, name: true, username: true, nickname: true, phone: true } },
        coAdvisor: { select: { id: true, name: true, username: true, nickname: true, phone: true } }
      }
    });
    return advisors;
  } catch (e: any) {
    console.error("Error fetching classroom advisors:", e);
    return [];
  }
}

export async function bulkSaveClassroomAdvisors(
  academicYear: string,
  assignments: Array<{
    level: string;
    primaryAdvisorId?: string | null;
    coAdvisorId?: string | null;
  }>
) {
  await requireHeadAuth();
  
  for (const item of assignments) {
    await (prisma as any).classroomAdvisor.upsert({
      where: {
        academicYear_level: {
          academicYear,
          level: item.level
        }
      },
      update: {
        primaryAdvisorId: item.primaryAdvisorId || null,
        coAdvisorId: item.coAdvisorId || null,
        updatedAt: new Date()
      },
      create: {
        academicYear,
        level: item.level,
        primaryAdvisorId: item.primaryAdvisorId || null,
        coAdvisorId: item.coAdvisorId || null
      }
    });
  }

  revalidatePath("/dashboard/head");
  revalidatePath("/dashboard/teacher");
  revalidatePath("/dashboard/student");
  return { success: true };
}

export async function copyAdvisorsFromPreviousYear(fromYear: string, toYear: string) {
  await requireHeadAuth();
  const source = await (prisma as any).classroomAdvisor.findMany({
    where: { academicYear: fromYear }
  });

  if (!source || source.length === 0) {
    throw new Error(`ไม่พบข้อมูลการแต่งตั้งครูที่ปรึกษาของปีการศึกษา ${fromYear}`);
  }

  for (const item of source) {
    await (prisma as any).classroomAdvisor.upsert({
      where: {
        academicYear_level: {
          academicYear: toYear,
          level: item.level
        }
      },
      update: {
        primaryAdvisorId: item.primaryAdvisorId,
        coAdvisorId: item.coAdvisorId,
        updatedAt: new Date()
      },
      create: {
        academicYear: toYear,
        level: item.level,
        primaryAdvisorId: item.primaryAdvisorId,
        coAdvisorId: item.coAdvisorId
      }
    });
  }

  revalidatePath("/dashboard/head");
  revalidatePath("/dashboard/teacher");
  return { success: true, count: source.length };
}

export async function promoteAdvisorsToNextYear(fromYear: string, toYear: string) {
  await requireHeadAuth();
  const source = await (prisma as any).classroomAdvisor.findMany({
    where: { academicYear: fromYear }
  });

  if (!source || source.length === 0) {
    throw new Error(`ไม่พบข้อมูลการแต่งตั้งครูที่ปรึกษาของปีการศึกษา ${fromYear}`);
  }

  const levelPromotionMap: Record<string, string> = {
    "ปวช.1": "ปวช.2",
    "ปวช.2": "ปวช.3",
    "ปวส.1": "ปวส.2",
    "ปวส.1(ม.6)": "ปวส.2(ม.6)"
  };

  let promotedCount = 0;
  for (const item of source) {
    const nextLevel = levelPromotionMap[item.level];
    if (nextLevel) {
      await (prisma as any).classroomAdvisor.upsert({
        where: {
          academicYear_level: {
            academicYear: toYear,
            level: nextLevel
          }
        },
        update: {
          primaryAdvisorId: item.primaryAdvisorId,
          coAdvisorId: item.coAdvisorId,
          updatedAt: new Date()
        },
        create: {
          academicYear: toYear,
          level: nextLevel,
          primaryAdvisorId: item.primaryAdvisorId,
          coAdvisorId: item.coAdvisorId
        }
      });
      promotedCount++;
    }
  }

  revalidatePath("/dashboard/head");
  revalidatePath("/dashboard/teacher");
  return { success: true, count: promotedCount };
}

// ================= TWIN VERIFICATION =================

export async function verifyTwinStudent(studentId: string, approved: boolean) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== "HEAD" && role !== "TEACHER") {
    throw new Error("Unauthorized: Only HEAD or TEACHER can verify twins");
  }

  await prisma.user.update({
    where: { id: studentId },
    data: {
      twinVerified: approved,
      updatedAt: new Date()
    }
  });

  revalidatePath("/dashboard/head");
  revalidatePath("/dashboard/teacher");
  revalidatePath("/dashboard/student");
  return { success: true };
}

