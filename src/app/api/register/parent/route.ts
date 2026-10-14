import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, username, password, studentUsername, studentNationalId, phone, address, email } = body;

    // 1. ตรวจสอบว่ามีรหัสนักเรียนนี้หรือไม่ (เพิ่ม Security ด่านแรก)
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

    // ตรวจสอบเลขบัตรประชาชน 4 ตัวท้าย (ถ้ามี)
    if (student.nationalId && studentNationalId) {
      const last4 = student.nationalId.slice(-4);
      if (last4 !== studentNationalId) {
        return NextResponse.json(
          { success: false, message: "ข้อมูลยืนยันตัวตน (เลขบัตรประชาชน 4 ตัวท้าย) ไม่ถูกต้อง" },
          { status: 400 }
        );
      }
    } else if (!student.nationalId) {
      return NextResponse.json(
        { success: false, message: "นักเรียนยังไม่ได้อัปเดตข้อมูลเลขบัตรประชาชนในระบบ กรุณาให้นักเรียนอัปเดตโปรไฟล์ก่อน" },
        { status: 400 }
      );
    }

    // 2. สร้างบัญชีผู้ปกครองใหม่ (ไม่ต้องใส่ studentId แล้ว)
    const parent = await prisma.user.create({
      data: {
        name,
        username,
        password: await bcrypt.hash(password, 10),
        role: "PARENT",
        phone: phone || null,
        address: address || null,
        email: email || null,
      },
    });

    // 3. สร้าง ParentStudentLink พร้อมสถานะ PENDING รอให้นักเรียนอนุมัติ
    await prisma.parentStudentLink.create({
      data: {
        parentId: parent.id,
        studentId: student.id,
        status: "PENDING",
      }
    });

    return NextResponse.json({ 
      success: true, 
      user: { id: parent.id, username: parent.username },
      message: "สมัครสมาชิกสำเร็จ โปรดรอนักเรียนอนุมัติการเข้าถึงข้อมูล"
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
