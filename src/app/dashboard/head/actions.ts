"use server";

import prisma from "../../../lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

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

export async function createSchedule(data: { subjectId: string; dayOfWeek: number; startTime: string; endTime: string }) {
  await requireHeadAuth();
  await prisma.schedule.create({ data });
  revalidatePath("/dashboard/head");
}

export async function updateSchedule(id: string, data: { subjectId: string; dayOfWeek: number; startTime: string; endTime: string }) {
  await requireHeadAuth();
  await prisma.schedule.update({ where: { id }, data });
  revalidatePath("/dashboard/head");
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
  await prisma.user.create({ data });
  revalidatePath("/dashboard/head");
}

export async function updateUser(id: string, data: any) {
  await requireHeadAuth();
  // Bug #11 fix: hash password เมื่อมีการเปลี่ยนรหัสผ่าน
  if (data.password) {
    data.password = await bcrypt.hash(data.password, 10);
  }
  await prisma.user.update({ where: { id }, data });
  revalidatePath("/dashboard/head");
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
}

export async function resetAllFaces() {
  await requireHeadAuth();

  await prisma.user.updateMany({
    where: { role: "STUDENT" },
    data: {
      faceDescriptor: null,
      profilePicture: null
    }
  });
  revalidatePath("/dashboard/head");
}

export async function toggleEditPermission(id: string, canEditProfile: boolean) {
  await requireHeadAuth();
  await prisma.user.update({ where: { id }, data: { canEditProfile } });
  revalidatePath("/dashboard/head");
}

export async function toggleGradeSubmission(id: string, canSubmitGrades: boolean) {
  await requireHeadAuth();
  await prisma.user.update({ where: { id }, data: { canSubmitGrades } });
  revalidatePath("/dashboard/head");
}

export async function toggleAllStudentsGradeSubmission(canSubmitGrades: boolean) {
  await requireHeadAuth();
  await prisma.user.updateMany({
    where: { role: "STUDENT", deletedAt: null },
    data: { canSubmitGrades }
  });
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
          prisma.user.delete({
            where: { id: student.id }
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
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  await prisma.user.deleteMany({
    where: {
      role: "STUDENT",
      level: "จบการศึกษา",
      updatedAt: { lt: twoYearsAgo }
    }
  });
  revalidatePath("/dashboard/head");
}

export async function getUserDetails(userId: string) {
  await requireHeadAuth();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      grades: { include: { subject: true } },
      attendances: { include: { subject: true }, orderBy: { timestamp: 'desc' } }
    }
  });
  return user;
}
