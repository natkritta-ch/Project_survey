"use server";

import prisma from "../../../../lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { saveAttendanceRemark, deleteAttendanceRemark } from "../../../../lib/attendanceRemarks";

export async function updateAttendanceStatus(id: string, status: string, remark?: string) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;
  const userName = session?.user?.name || "อาจารย์ผู้สอน";

  if (userRole !== "TEACHER" && userRole !== "HEAD") {
    throw new Error("คุณไม่มีสิทธิ์ในการแก้ไขสถานะการเข้าเรียน");
  }

  // ป้องกันการทุจริต: สถานะมาเรียน (PRESENT) และมาสาย (LATE) ต้องเกิดจากการสแกนใบหน้าเท่านั้น
  const ALLOWED_MANUAL_STATUSES = ["LEAVE_PERSONAL", "LEAVE_SICK", "ABSENT"];
  if (!ALLOWED_MANUAL_STATUSES.includes(status)) {
    throw new Error("ไม่อนุญาตให้เปลี่ยนสถานะเป็น 'มาเรียน' หรือ 'มาสาย' ด้วยตนเองได้ (ต้องผ่านการสแกนใบหน้าเท่านั้นเพื่อความโปร่งใส)");
  }

  // อัปเดตสถานะในฐานข้อมูล
  await prisma.attendance.update({
    where: { id },
    data: { status }
  });

  // บันทึกหรือลบหมายเหตุการลา
  if (status === "LEAVE_PERSONAL" || status === "LEAVE_SICK") {
    await saveAttendanceRemark(id, remark, userName);
  } else {
    // ถ้าคืนสถานะเป็นขาดเรียน (ABSENT) ให้ล้างหมายเหตุการลาออก
    await deleteAttendanceRemark(id);
  }
  
  revalidatePath("/dashboard/teacher/report");
  revalidatePath("/dashboard/teacher");
  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/parent");
  revalidatePath("/dashboard/head");
}
