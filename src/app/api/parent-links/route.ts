import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";

// ดึงรายการคำขอผูกบัญชี (สำหรับนักเรียน) หรือ ข้อมูลลูก (สำหรับผู้ปกครอง)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any)?.id;
    const userRole = (session.user as any)?.role;

    if (userRole === "STUDENT") {
      // นักเรียนดึงรายการผู้ปกครองที่รออนุมัติ
      const links = await prisma.parentStudentLink.findMany({
        where: { studentId: userId },
        include: { parent: { select: { name: true, phone: true } } }
      });
      return NextResponse.json({ success: true, links });
    } else if (userRole === "PARENT") {
      // ผู้ปกครองดึงข้อมูลลูกทั้งหมดที่ผูกไว้ (ทั้งรอยืนยันและยืนยันแล้ว)
      const links = await prisma.parentStudentLink.findMany({
        where: { parentId: userId },
        include: { student: { select: { name: true, level: true, username: true } } }
      });
      return NextResponse.json({ success: true, links });
    }

    return NextResponse.json({ success: false, message: "Role not supported" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// อนุมัติ / ปฏิเสธ (สำหรับนักเรียน)
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any)?.id;
    const { linkId, status } = await request.json(); // status: "APPROVED" | "REJECTED"

    const link = await prisma.parentStudentLink.findUnique({ where: { id: linkId } });
    if (!link || link.studentId !== userId) {
      return NextResponse.json({ success: false, message: "Link not found or unauthorized" }, { status: 404 });
    }

    const updated = await prisma.parentStudentLink.update({
      where: { id: linkId },
      data: { status }
    });

    return NextResponse.json({ success: true, link: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// ผู้ปกครองขอเพิ่มบุตรหลานคนใหม่
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "PARENT") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const parentId = (session.user as any).id;
    const { studentUsername, studentNationalId } = await request.json();

    // ค้นหานักเรียน
    const student = await prisma.user.findFirst({
      where: { username: studentUsername, role: "STUDENT" }
    });

    if (!student) {
      return NextResponse.json({ success: false, message: "ไม่พบรหัสนักเรียนในระบบ" }, { status: 404 });
    }

    // ตรวจสอบเลขบัตร 4 ตัวท้าย
    if (student.nationalId) {
      const last4 = student.nationalId.slice(-4);
      if (last4 !== studentNationalId) {
        return NextResponse.json({ success: false, message: "เลขบัตรประชาชน 4 ตัวท้ายไม่ถูกต้อง" }, { status: 400 });
      }
    } else {
      return NextResponse.json({ success: false, message: "นักเรียนยังไม่ได้อัปเดตข้อมูลเลขบัตรประชาชนในระบบ กรุณาให้นักเรียนอัปเดตโปรไฟล์ก่อน" }, { status: 400 });
    }

    // เช็คว่าขอไปแล้วหรือยัง
    const existingLink = await prisma.parentStudentLink.findFirst({
      where: { parentId, studentId: student.id }
    });

    if (existingLink) {
      return NextResponse.json({ success: false, message: "คุณส่งคำขอหรือติดตามนักเรียนคนนี้ไปแล้ว" }, { status: 400 });
    }

    const newLink = await prisma.parentStudentLink.create({
      data: {
        parentId,
        studentId: student.id,
        status: "PENDING"
      }
    });

    return NextResponse.json({ success: true, link: newLink });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาด: " + error.message }, { status: 500 });
  }
}
