import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || ((session.user as any)?.role !== "TEACHER" && (session.user as any)?.role !== "HEAD")) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { studentIds, subjectId, type } = await request.json();

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ success: false, message: "Invalid studentIds array" }, { status: 400 });
    }

    const isAssembly = !subjectId || type === "assembly";

    // ตรวจสอบประวัติเข้าเรียน/เข้าแถวในวันนี้ (รองรับเวลาไทย UTC+7)
    const now = new Date();
    const thaiFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' });
    const parts = thaiFormatter.formatToParts(now);
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    const year = parts.find(p => p.type === 'year')?.value;
    
    const todayStart = new Date(`${year}-${month}-${day}T00:00:00.000+07:00`);
    const todayEnd = new Date(`${year}-${month}-${day}T23:59:59.999+07:00`);

    const alreadyPresentWhere: any = {
      studentId: { in: studentIds },
      status: "PRESENT",
      timestamp: { gte: todayStart, lte: todayEnd },
    };

    if (isAssembly) {
      alreadyPresentWhere.type = "assembly";
      alreadyPresentWhere.subjectId = null;
    } else {
      alreadyPresentWhere.subjectId = subjectId;
    }

    const alreadyPresent = await prisma.attendance.findMany({
      where: alreadyPresentWhere,
      select: { studentId: true }
    });

    const alreadyPresentIds = new Set(alreadyPresent.map(a => a.studentId));

    // กรองเฉพาะคนที่ขาดจริงๆ (ยังไม่มี PRESENT ในวันนี้เลย)
    const trulyAbsentIds = studentIds.filter((id: string) => !alreadyPresentIds.has(id));

    if (trulyAbsentIds.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: "ไม่มีนักเรียนที่ต้องบันทึกขาดเพิ่มเติม (ทุกคนเช็คชื่อแล้วจากเครื่องอื่น)" });
    }

    const attendanceData = trulyAbsentIds.map((studentId: string) => ({
      studentId,
      subjectId: subjectId || null,
      type: type || "class",
      status: "ABSENT"
    }));

    await prisma.attendance.createMany({ data: attendanceData });

    return NextResponse.json({ success: true, count: attendanceData.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

