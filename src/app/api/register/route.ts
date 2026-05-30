import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      nickname,
      username,
      password,
      faceDescriptor,
      level,
      phone,
      email,
      address,
      bloodType,
      gender,
      profilePicture,
    } = body;

    const user = await prisma.user.create({
      data: {
        name,
        nickname: nickname || null,
        username,
        password: await bcrypt.hash(password, 10), // Bug #11 fix: hash password
        role: "STUDENT",
        faceDescriptor,
        level: level || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        bloodType: bloodType || null,
        gender: gender || null,
        profilePicture: profilePicture || null,
      },
    });

    return NextResponse.json({ success: true, user: { id: user.id, username: user.username } });
  } catch (error: any) {
    console.error("Registration error:", error);
    let errorMessage = "เกิดข้อผิดพลาดในการสมัครสมาชิก";
    if (error.code === "P2002") {
      errorMessage = "ชื่อผู้ใช้งานนี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น";
    }
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
