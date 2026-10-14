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
      nationalId,
      profilePicture,
    } = body;

    // ตรวจสอบว่ามีผู้ใช้นี้ในระบบอยู่แล้วหรือไม่
    const existingUser = await prisma.user.findFirst({
      where: { username, role: "STUDENT", deletedAt: null }
    });

    if (existingUser) {
      if (existingUser.faceDescriptor) {
        return NextResponse.json(
          { success: false, message: "รหัสนักเรียนนี้ได้ทำการลงทะเบียนและสแกนใบหน้าแล้ว หากต้องการอัปเดตใบหน้าใหม่ กรุณาเข้าสู่ระบบแล้วไปที่เมนูแก้ไขโปรไฟล์" },
          { status: 409 }
        );
      }

      // อัปเดตข้อมูลนักเรียนเดิมที่ยังไม่มีใบหน้า
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: name || existingUser.name,
          nickname: nickname || existingUser.nickname,
          password: await bcrypt.hash(password, 10),
          faceDescriptor,
          level: level || existingUser.level,
          phone: phone || existingUser.phone,
          email: email || existingUser.email,
          address: address || existingUser.address,
          bloodType: bloodType || existingUser.bloodType,
          gender: gender || existingUser.gender,
          nationalId: nationalId || existingUser.nationalId,
          profilePicture: profilePicture || existingUser.profilePicture,
        }
      });
      return NextResponse.json({ success: true, user: { id: updatedUser.id, username: updatedUser.username } });
    }

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
        nationalId: nationalId || null,
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
      // Fix #10: ใช้ 409 Conflict สำหรับ unique constraint แทน 500 Internal Error
      { status: error.code === "P2002" ? 409 : 500 }
    );
  }
}
