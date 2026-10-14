import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    
    const userRole = (session.user as any)?.role;
    const userId = (session.user as any)?.id;
    if (userRole !== "TEACHER" && userRole !== "HEAD") {
      return NextResponse.json({ success: false, message: "เฉพาะอาจารย์หรือหัวหน้าแผนกเท่านั้น" }, { status: 403 });
    }

    const { subjectId, lateThresholdMin } = await request.json();

    if (!subjectId || typeof lateThresholdMin !== "number") {
      return NextResponse.json({ success: false, message: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
    }

    // ตรวจสอบว่าเป็นอาจารย์ประจำวิชานั้นจริงไหม
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) {
      return NextResponse.json({ success: false, message: "ไม่พบวิชา" }, { status: 404 });
    }

    if (userRole === "TEACHER" && subject.teacherId !== userId) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์แก้ไขวิชานี้" }, { status: 403 });
    }

    const updated = await prisma.subject.update({
      where: { id: subjectId },
      data: { lateThresholdMin }
    });

    return NextResponse.json({ success: true, subject: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
