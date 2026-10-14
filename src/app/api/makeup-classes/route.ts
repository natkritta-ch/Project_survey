import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subjectId");
    const dateParam = searchParams.get("date"); // e.g. "2026-10-14"

    const where: any = {};
    if (subjectId) {
      where.subjectId = subjectId;
    }
    if (dateParam) {
      const targetDate = new Date(`${dateParam}T00:00:00.000Z`);
      where.date = targetDate;
    }

    const makeupClasses = await (prisma as any).makeupClass.findMany({
      where,
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
            level: true,
            room: true
          }
        }
      },
      orderBy: [{ date: "desc" }, { startTime: "asc" }]
    });

    return NextResponse.json({ success: true, makeupClasses });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    const { subjectId, date, startTime, endTime, remark } = await request.json();

    if (!subjectId || !date || !startTime || !endTime) {
      return NextResponse.json({ success: false, message: "กรุณากรอกข้อมูลให้ครบถ้วน (วิชา, วันที่, เวลาเริ่ม, เวลาเลิก)" }, { status: 400 });
    }

    // ตรวจสอบว่าอาจารย์สอนวิชานี้จริงไหม (ถ้าไม่ใช่ HEAD)
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId }
    });

    if (!subject) {
      return NextResponse.json({ success: false, message: "ไม่พบข้อมูลวิชา" }, { status: 404 });
    }

    if (userRole === "TEACHER" && subject.teacherId !== userId) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์สร้างคลาสสอนชดเชยสำหรับวิชานี้" }, { status: 403 });
    }

    // แปลง date เป็น Date object
    // format: YYYY-MM-DD
    const dateObj = new Date(`${date}T00:00:00.000Z`);

    const newMakeupClass = await (prisma as any).makeupClass.create({
      data: {
        subjectId,
        date: dateObj,
        startTime,
        endTime,
        remark: remark || null
      },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
            level: true
          }
        }
      }
    });

    return NextResponse.json({ success: true, makeupClass: newMakeupClass });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    const userId = (session.user as any)?.id;
    if (userRole !== "TEACHER" && userRole !== "HEAD") {
      return NextResponse.json({ success: false, message: "ไม่มีสิทธิ์ดำเนินการ" }, { status: 403 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ success: false, message: "กรุณาระบุ id คลาสสอนชดเชย" }, { status: 400 });
    }

    const makeup = await (prisma as any).makeupClass.findUnique({
      where: { id },
      include: { subject: true }
    });

    if (!makeup) {
      return NextResponse.json({ success: false, message: "ไม่พบคลาสสอนชดเชยนี้" }, { status: 404 });
    }

    if (userRole === "TEACHER" && makeup.subject.teacherId !== userId) {
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์ลบคลาสสอนชดเชยนี้" }, { status: 403 });
    }

    await (prisma as any).makeupClass.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "ลบคลาสสอนชดเชยเรียบร้อย" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
