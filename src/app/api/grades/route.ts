import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";

// Bug #8 fix: อาจารย์หรือหัวหน้าแผนกต้องอนุญาตก่อน (canSubmitGrades) 
// นักเรียนถึงจะกรอกเกรดได้ — เช่นเดียวกันกับ canEditProfile
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;
    const body = await request.json();
    const { subjectId, grade, studentId: targetStudentId } = body;

    let actualStudentId: string;

    if (!subjectId) {
      return NextResponse.json({ success: false, message: "กรุณาระบุ subjectId" }, { status: 400 });
    }

    if (userRole === "TEACHER" || userRole === "HEAD") {
      if (userRole === "TEACHER") {
        const subject = await prisma.subject.findUnique({
          where: { id: subjectId },
          select: { teacherId: true }
        });
        if (!subject || subject.teacherId !== userId) {
          return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์แก้ไขคะแนนในรายวิชานี้" }, { status: 403 });
        }
      }

      // อาจารย์/หัวหน้ากรอกเกรดให้นักเรียนได้โดยตรง ต้องส่ง studentId มาด้วย
      if (!targetStudentId) {
        return NextResponse.json({ success: false, message: "กรุณาระบุ studentId" }, { status: 400 });
      }
      actualStudentId = targetStudentId;
    } else if (userRole === "STUDENT") {
      // นักเรียนกรอกเกรดตัวเองได้ ถ้าได้รับอนุญาตจากอาจารย์/หัวหน้า
      const student = await prisma.user.findUnique({ where: { id: userId } });
      if (!student || !student.canSubmitGrades) {
        return NextResponse.json({
          success: false,
          message: "ยังไม่ได้รับอนุญาตให้กรอกเกรด กรุณาติดต่ออาจารย์ประจำวิชาหรือหัวหน้าแผนกเพื่อเปิดสิทธิ์"
        }, { status: 403 });
      }
      actualStudentId = userId;
    } else {
      return NextResponse.json({ success: false, message: `ไม่มีสิทธิ์ดำเนินการนี้ (role: ${userRole || 'undefined'})` }, { status: 403 });
    }

    if (!subjectId || grade === undefined || isNaN(parseFloat(grade))) {
      return NextResponse.json({ success: false, message: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
    }

    const numericGrade = parseFloat(grade);
    if (numericGrade < 0 || numericGrade > 4) {
      return NextResponse.json({ success: false, message: "เกรดต้องอยู่ระหว่าง 0 - 4" }, { status: 400 });
    }

    const record = await prisma.grade.upsert({
      where: {
        studentId_subjectId: {
          studentId: actualStudentId,
          subjectId: subjectId,
        }
      },
      update: { grade: numericGrade },
      create: {
        studentId: actualStudentId,
        subjectId: subjectId,
        grade: numericGrade,
      }
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error("Grade Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
