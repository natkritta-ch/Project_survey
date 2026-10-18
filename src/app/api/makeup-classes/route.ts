import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";

// ลบข้อมูลขยะที่เกิน 7 วันโดยอัตโนมัติ
async function autoCleanupOldTrash() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await (prisma as any).makeupClass.deleteMany({
      where: {
        deletedAt: {
          lt: sevenDaysAgo
        }
      }
    });
  } catch (e) {
    // กรณีที่ฐานข้อมูลยังไม่ได้เพิ่มคอลัมน์ deletedAt จะข้ามไปก่อน
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    const userId = (session.user as any)?.id;

    // รันทำความสะอาดถังขยะเกิน 7 วัน
    await autoCleanupOldTrash();

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subjectId");
    const dateParam = searchParams.get("date"); // e.g. "2026-10-14"
    const trashedParam = searchParams.get("trashed"); // "true" = ถังขยะ, "all" = ทั้งหมด, default = เฉพาะที่ยังไม่ลบ

    const where: any = {};

    if (userRole === "TEACHER") {
      where.subject = { teacherId: userId };
    }

    if (subjectId) {
      where.subjectId = subjectId;
    }
    if (dateParam) {
      const targetDate = new Date(`${dateParam}T00:00:00.000Z`);
      where.date = targetDate;
    }

    if (trashedParam === "true") {
      where.deletedAt = { not: null };
    } else if (trashedParam !== "all") {
      where.deletedAt = null;
    }

    let makeupClasses: any[] = [];
    try {
      makeupClasses = await (prisma as any).makeupClass.findMany({
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
        orderBy: trashedParam === "true" 
          ? [{ deletedAt: "desc" }] 
          : [{ date: "desc" }, { startTime: "asc" }]
      });
    } catch (err) {
      // Fallback ถ้ายังไม่มีคอลัมน์ deletedAt
      delete where.deletedAt;
      if (trashedParam === "true") {
        makeupClasses = [];
      } else {
        makeupClasses = await (prisma as any).makeupClass.findMany({
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
      }
    }

    // คำนวณวันที่เหลือสำหรับข้อมูลในถังขยะ (7 วัน)
    const msInDay = 24 * 60 * 60 * 1000;
    const processedList = makeupClasses.map((item: any) => {
      if (item.deletedAt) {
        const deletedTime = new Date(item.deletedAt).getTime();
        const expiryTime = deletedTime + (7 * msInDay);
        const daysRemaining = Math.max(0, Math.ceil((expiryTime - Date.now()) / msInDay));
        return {
          ...item,
          daysRemaining
        };
      }
      return item;
    });

    return NextResponse.json({ success: true, makeupClasses: processedList });
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
        remark: remark || null,
        deletedAt: null
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

    const body = await request.json().catch(() => ({}));
    const { id, permanent, permanentAll, action } = body;

    // 1. จัดการล้างถังขยะทั้งหมด (ลบถาวรทุกรายการในถังขยะ)
    if (action === "bulk-delete-permanent" || permanentAll) {
      const deleteWhere: any = { deletedAt: { not: null } };
      if (userRole === "TEACHER") {
        deleteWhere.subject = { teacherId: userId };
      }
      await (prisma as any).makeupClass.deleteMany({
        where: deleteWhere
      });
      return NextResponse.json({ success: true, message: "ลบรายการในถังขยะทั้งหมดอย่างถาวรเรียบร้อยแล้ว" });
    }

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
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์จัดการคลาสสอนชดเชยนี้" }, { status: 403 });
    }

    // 2. ถ้าสั่งลบถาวร
    if (permanent) {
      await (prisma as any).makeupClass.delete({
        where: { id }
      });
      return NextResponse.json({ success: true, message: "ลบคลาสสอนชดเชยอย่างถาวรเรียบร้อย" });
    }

    // 3. ซอฟต์ดีลีท (ย้ายไปถังขยะ)
    try {
      await (prisma as any).makeupClass.update({
        where: { id },
        data: { deletedAt: new Date() }
      });
    } catch (err) {
      // Fallback ถ้ายังไม่มีฟิลด์ deletedAt ในตารางจริง ให้ลบปกติ
      await (prisma as any).makeupClass.delete({
        where: { id }
      });
    }

    return NextResponse.json({ success: true, message: "ย้ายคลาสสอนชดเชยไปที่ถังขยะเรียบร้อย (กู้คืนได้ภายใน 7 วัน)" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
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

    const body = await request.json().catch(() => ({}));
    const { id, action } = body;

    // 1. กู้คืนรายการทั้งหมด
    if (action === "restore-all") {
      const restoreWhere: any = { deletedAt: { not: null } };
      if (userRole === "TEACHER") {
        restoreWhere.subject = { teacherId: userId };
      }
      await (prisma as any).makeupClass.updateMany({
        where: restoreWhere,
        data: { deletedAt: null }
      });
      return NextResponse.json({ success: true, message: "กู้คืนคลาสสอนชดเชยทั้งหมดเรียบร้อยแล้ว" });
    }

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
      return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์จัดการคลาสสอนชดเชยนี้" }, { status: 403 });
    }

    const restoredClass = await (prisma as any).makeupClass.update({
      where: { id },
      data: { deletedAt: null },
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
      }
    });

    return NextResponse.json({ success: true, message: "กู้คืนคลาสสอนชดเชยสำเร็จ", makeupClass: restoredClass });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
