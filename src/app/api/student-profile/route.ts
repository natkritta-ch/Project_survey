import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "STUDENT") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const studentId = (session.user as any)?.id;

    // ตรวจสอบว่านักเรียนคนนี้ถูกเปิดสิทธิ์แก้ไขหรือไม่
    const student = await prisma.user.findUnique({ where: { id: studentId } });
    if (!student || !student.canEditProfile) {
      return NextResponse.json({ success: false, message: "ไม่ได้รับอนุญาตให้แก้ไขข้อมูล กรุณาติดต่อหัวหน้าแผนก" }, { status: 403 });
    }

    const body = await request.json();
    const { level, faceDescriptor, profilePicture, email } = body;

    // อัปเดตเฉพาะฟิลด์ที่ส่งมา
    const updateData: any = {};
    if (level !== undefined) updateData.level = level;
    if (faceDescriptor !== undefined) updateData.faceDescriptor = faceDescriptor;
    if (profilePicture !== undefined) updateData.profilePicture = profilePicture;
    if (email !== undefined) updateData.email = email;

    await prisma.user.update({
      where: { id: studentId },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Student profile update error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
