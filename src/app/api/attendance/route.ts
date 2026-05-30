import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";

export async function POST(request: Request) {
  try {
    // Bug #2 fix: ตรวจสอบ Auth ก่อนเสมอ
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const userRole = (session.user as any)?.role;
    const userId = (session.user as any)?.id;
    if (userRole !== "TEACHER" && userRole !== "HEAD") {
      return NextResponse.json({ success: false, message: "เฉพาะอาจารย์หรือหัวหน้าแผนกเท่านั้น" }, { status: 403 });
    }

    const { studentId, subjectId, type, status } = await request.json();

    if (!studentId) {
      return NextResponse.json({ success: false, message: "กรุณาระบุ studentId" }, { status: 400 });
    }

    // ดึงข้อมูลนักเรียนและวิชาเพื่อตรวจสอบระดับชั้น (ยกเว้นเข้าแถวที่เช็คได้ทุกคน)
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { level: true, name: true }
    });

    if (!student) {
      return NextResponse.json({ success: false, message: "ไม่พบข้อมูลนักเรียน" }, { status: 404 });
    }

    if (subjectId && type !== "assembly") {
      const subject = await prisma.subject.findUnique({
        where: { id: subjectId },
        select: { teacherId: true, level: true, name: true }
      });

      if (!subject) {
        return NextResponse.json({ success: false, message: "ไม่พบข้อมูลรายวิชา" }, { status: 404 });
      }

      // ตรวจสอบสิทธิ์อาจารย์
      if (userRole === "TEACHER" && subject.teacherId !== userId) {
        return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์เช็คชื่อในรายวิชานี้" }, { status: 403 });
      }

      // ตรวจสอบระดับชั้น (ข้ามการตรวจสอบหากนักเรียนหรือวิชาไม่ได้ระบุระดับชั้น)
      if (student.level && subject.level && student.level !== subject.level) {
        return NextResponse.json({ 
          success: false, 
          message: `นักเรียนชั้น ${student.level} ไม่สามารถเช็คชื่อในวิชาของชั้น ${subject.level} ได้` 
        }, { status: 400 });
      }
    }

    // กำหนดช่วงเวลาตรวจซ้ำตามประเภท
    const isAssembly = !subjectId || type === "assembly";
    const duplicateWhere: any = { studentId };

    if (isAssembly) {
      // เข้าแถว: ตรวจซ้ำการบันทึกในวันเดียวกัน (เครื่องเดียวกันใน production ใช้ UTC+7)
      const now = new Date();
      const thaiFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' });
      const parts = thaiFormatter.formatToParts(now);
      const month = parts.find(p => p.type === 'month')?.value;
      const day = parts.find(p => p.type === 'day')?.value;
      const year = parts.find(p => p.type === 'year')?.value;
      
      const todayStart = new Date(`${year}-${month}-${day}T00:00:00.000+07:00`);
      const todayEnd = new Date(`${year}-${month}-${day}T23:59:59.999+07:00`);

      duplicateWhere.subjectId = null;
      duplicateWhere.type = "assembly";
      duplicateWhere.timestamp = { gte: todayStart, lte: todayEnd };
    } else {
      // เข้าเรียน: ตรวจซ้ำภายใน 5 นาที (ใซ่คาบเดียวกัน สแกนหลายครั้ง)
      duplicateWhere.subjectId = subjectId;
      duplicateWhere.timestamp = { gt: new Date(Date.now() - 5 * 60 * 1000) };
    }

    const recent = await prisma.attendance.findFirst({
      where: duplicateWhere
    });

    if (recent) {
      return NextResponse.json({ success: true, message: "Checked in recently", duplicate: true });
    }

    const attendance = await prisma.attendance.create({
      data: {
        studentId,
        subjectId: subjectId || null,
        type: type || "class",
        status: status || "PRESENT"
      }
    });

    return NextResponse.json({ success: true, attendance });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
