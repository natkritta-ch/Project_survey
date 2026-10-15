import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { revalidatePath } from "next/cache";

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

    // ตรวจสอบใบหน้าซ้ำกับนักเรียนคนอื่น
    if (faceDescriptor) {
      const { calculateEuclideanDistance, distanceToSimilarity } = await import("../../../lib/faceLiveness");
      let incomingDesc: number[] = [];
      try {
        incomingDesc = typeof faceDescriptor === "string" ? JSON.parse(faceDescriptor) : faceDescriptor;
      } catch {}

      if (Array.isArray(incomingDesc) && incomingDesc.length === 128) {
        const otherStudents = await prisma.user.findMany({
          where: {
            role: "STUDENT",
            deletedAt: null,
            faceDescriptor: { not: null },
            id: { not: studentId }
          },
          select: { id: true, name: true, username: true, faceDescriptor: true, isTwin: true }
        });

        for (const other of otherStudents) {
          try {
            const otherDesc = JSON.parse(other.faceDescriptor!);
            const dist = calculateEuclideanDistance(incomingDesc, otherDesc);
            if (dist < 0.38) {
              const simPercent = distanceToSimilarity(dist);
              if (!student.isTwin) {
                return NextResponse.json({
                  success: false,
                  message: `ใบหน้านี้มีความเหมือนกับ "${other.name}" (${simPercent}%) ระบบไม่อนุญาตให้ใช้ใบหน้าซ้ำกับผู้อื่น`
                }, { status: 409 });
              }
            }
          } catch {}
        }
      }
    }

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

    // Revalidate paths so that the updated face descriptor is fetched correctly
    revalidatePath("/dashboard/teacher/scan");
    revalidatePath("/dashboard/head");
    revalidatePath("/dashboard/student");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Student profile update error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
