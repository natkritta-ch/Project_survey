import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, username, password, parentCode, phone, address, email } = body;

    if (!parentCode || !parentCode.trim()) {
      return NextResponse.json(
        { success: false, message: "กรุณาระบุรหัสผูกผู้ปกครอง (Parent Code)" },
        { status: 400 }
      );
    }

    const cleanCode = parentCode.trim();

    // 1. ตรวจสอบรหัสผูกผู้ปกครองกับนักเรียนในระบบ
    const student = await prisma.user.findFirst({
      where: {
        parentCode: cleanCode,
        role: "STUDENT",
        deletedAt: null,
      },
      select: { id: true, name: true, username: true, level: true }
    });

    if (!student) {
      return NextResponse.json(
        { success: false, message: "ไม่พบข้อมูลนักเรียนจากรหัสผูกผู้ปกครองนี้ กรุณาตรวจสอบรหัสที่ได้รับจากทางแผนกวิชาอีกครั้ง" },
        { status: 404 }
      );
    }

    // 2. สร้างบัญชีผู้ปกครองใหม่ และผูก studentId ให้เรียบร้อย
    const parent = await prisma.user.create({
      data: {
        name,
        username,
        password: await bcrypt.hash(password, 10),
        role: "PARENT",
        phone: phone || null,
        address: address || null,
        email: email || null,
        studentId: student.id,
      },
    });

    // 3. สร้าง ParentStudentLink พร้อมสถานะ APPROVED ทันที ไม่ต้องรออนุมัติ
    await prisma.parentStudentLink.create({
      data: {
        parentId: parent.id,
        studentId: student.id,
        status: "APPROVED",
      }
    });

    return NextResponse.json({ 
      success: true, 
      user: { id: parent.id, username: parent.username },
      message: `สมัครสมาชิกสำเร็จและเชื่อมโยงกับนักเรียน (${student.name} - ชั้น ${student.level || "ไม่ระบุ"}) เรียบร้อยแล้ว`
    });
  } catch (error: any) {
    console.error("Register parent error:", error);
    let errorMessage = "เกิดข้อผิดพลาดในการลงทะเบียนผู้ปกครอง";
    if (error.code === "P2002") {
      errorMessage = "ชื่อผู้ใช้งานนี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น";
    }
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
