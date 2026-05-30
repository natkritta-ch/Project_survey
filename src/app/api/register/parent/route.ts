import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, username, password, studentUsername, phone, address, email } = body;

    // 1. ตรวจสอบว่ามีรหัสนักเรียนนี้ในระบบหรือไม่
    const student = await prisma.user.findFirst({
      where: {
        username: studentUsername,
        role: "STUDENT",
      },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, message: "ไม่พบรหัสนักเรียนในระบบ กรุณาตรวจสอบอีกครั้ง" },
        { status: 404 }
      );
    }

    // 2. ถ้าเจอ ให้สร้างบัญชีผู้ปกครองและผูก id 
    const parent = await prisma.user.create({
      data: {
        name,
        username,
        password: await bcrypt.hash(password, 10),
        role: "PARENT",
        studentId: student.id, // ผูกบัญชีนักเรียน
        phone: phone || null,
        address: address || null,
        email: email || null,
      },
    });

    return NextResponse.json({ 
      success: true, 
      user: { id: parent.id, username: parent.username, studentId: parent.studentId } 
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
