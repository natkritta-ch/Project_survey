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

// อนุมัติ / ปฏิเสธ / ยกเลิก (สำหรับนักเรียน)
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

    // ซิงค์ฟิลด์ studentId ในตาราง user ของผู้ปกครองให้เชื่อมโยงกันทั้งระบบ
    if (status === "REJECTED") {
      await prisma.user.updateMany({
        where: { id: link.parentId, studentId: link.studentId },
        data: { studentId: null }
      });
    } else if (status === "APPROVED") {
      await prisma.user.update({
        where: { id: link.parentId },
        data: { studentId: link.studentId }
      });
    }

    return NextResponse.json({ success: true, link: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// ผู้ปกครองขอเพิ่มบุตรหลานคนใหม่ด้วย Parent Code หรือ ผูกข้อมูลซ้ำ
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "PARENT") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const parentId = (session.user as any).id;
    const body = await request.json();
    const { parentCode, studentUsername, studentNationalId } = body;

    let student: any = null;

    if (parentCode && parentCode.trim()) {
      const cleanCode = parentCode.trim().toUpperCase();
      student = await prisma.user.findFirst({
        where: { parentCode: cleanCode, role: "STUDENT", deletedAt: null }
      });
      if (!student) {
        return NextResponse.json({ success: false, message: "ไม่พบข้อมูลนักเรียนจากรหัสผูกผู้ปกครองที่ระบุ กรุณาตรวจสอบรหัสอีกครั้ง" }, { status: 404 });
      }
    } else if (studentUsername) {
      student = await prisma.user.findFirst({
        where: { username: studentUsername, role: "STUDENT", deletedAt: null }
      });
      if (!student) {
        return NextResponse.json({ success: false, message: "ไม่พบรหัสนักเรียนในระบบ" }, { status: 404 });
      }
      if (student.nationalId && studentNationalId) {
        const last4 = student.nationalId.slice(-4);
        if (last4 !== studentNationalId) {
          return NextResponse.json({ success: false, message: "เลขบัตรประชาชน 4 ตัวท้ายไม่ถูกต้อง" }, { status: 400 });
        }
      }
    } else {
      return NextResponse.json({ success: false, message: "กรุณาระบุรหัสผูกผู้ปกครอง (Parent Code)" }, { status: 400 });
    }

    // ตรวจสอบว่าเคยผูกไปแล้วหรือไม่
    const existingLink = await prisma.parentStudentLink.findFirst({
      where: { parentId, studentId: student.id }
    });

    if (existingLink) {
      if (existingLink.status === "APPROVED") {
        return NextResponse.json({ success: false, message: `คุณผูกบัญชีกับนักเรียน (${student.name}) อยู่แล้ว` }, { status: 400 });
      }
      // ปรับสถานะเป็น APPROVED ทันที
      const updatedLink = await prisma.parentStudentLink.update({
        where: { id: existingLink.id },
        data: { status: "APPROVED" }
      });

      // ซิงค์ studentId ให้กับผู้ปกครอง
      await prisma.user.update({
        where: { id: parentId },
        data: { studentId: student.id }
      });

      return NextResponse.json({ 
        success: true, 
        link: updatedLink, 
        message: `ผูกข้อมูลกับนักเรียน (${student.name}) สำเร็จเรียบร้อยแล้ว` 
      });
    }

    const newLink = await prisma.parentStudentLink.create({
      data: {
        parentId,
        studentId: student.id,
        status: "APPROVED"
      }
    });

    // ซิงค์ studentId ให้กับผู้ปกครองถ้ายังไม่มี
    const parentUser = await prisma.user.findUnique({ where: { id: parentId }, select: { studentId: true } });
    if (!parentUser?.studentId) {
      await prisma.user.update({
        where: { id: parentId },
        data: { studentId: student.id }
      });
    }

    return NextResponse.json({ 
      success: true, 
      link: newLink,
      message: `ผูกข้อมูลกับนักเรียน (${student.name} - ชั้น ${student.level || "ไม่ระบุ"}) เรียบร้อยแล้ว` 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาด: " + error.message }, { status: 500 });
  }
}

// ลบรายการเชื่อมต่อ (ทั้งนักเรียนและผู้ปกครอง)
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any)?.id;
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get("linkId");

    if (!linkId) {
      return NextResponse.json({ success: false, message: "Missing linkId" }, { status: 400 });
    }

    const link = await prisma.parentStudentLink.findUnique({ where: { id: linkId } });
    if (!link || (link.studentId !== userId && link.parentId !== userId)) {
      return NextResponse.json({ success: false, message: "Link not found or unauthorized" }, { status: 404 });
    }

    await prisma.parentStudentLink.delete({ where: { id: linkId } });

    // ซิงค์เคลียร์ studentId ถ้าชี้ไปที่นักเรียนคนนี้
    await prisma.user.updateMany({
      where: { id: link.parentId, studentId: link.studentId },
      data: { studentId: null }
    });

    return NextResponse.json({ success: true, message: "ลบการเชื่อมต่อเรียบร้อยแล้ว" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
