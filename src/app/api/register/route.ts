import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import bcrypt from "bcryptjs";
import { calculateEuclideanDistance, distanceToSimilarity } from "../../../lib/faceLiveness";

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
      isTwin = false,
      twinNote = null,
    } = body;

    // 1. ตรวจสอบเลขบัตรประจำตัวประชาชน 13 หลัก (ถ้ามี) ต้องไม่ซ้ำกับผู้อื่น
    if (nationalId && nationalId.trim()) {
      const cleanNationalId = nationalId.trim();
      const existingNationalId = await prisma.user.findFirst({
        where: { nationalId: cleanNationalId, deletedAt: null, NOT: { username } }
      });
      if (existingNationalId) {
        return NextResponse.json(
          { success: false, message: "หมายเลขประจำตัวประชาชน 13 หลักนี้ ถูกลงทะเบียนในระบบเรียบร้อยแล้ว" },
          { status: 409 }
        );
      }
    }

    // 2. ตรวจสอบชื่อ-นามสกุลซ้ำกับนักเรียนอื่นในระบบ
    if (name && name.trim()) {
      const existingName = await prisma.user.findFirst({
        where: { name: name.trim(), role: "STUDENT", deletedAt: null, NOT: { username } }
      });
      if (existingName) {
        // หากไม่ได้กรอกเลขบัตร ปชช. หรือมีเลขบัตรตรงกับคนเดิม ให้ปฏิเสธเพื่อป้องกันบัญชีทับซ้อน
        const cleanNatId = nationalId?.trim();
        if (!cleanNatId || (existingName.nationalId && existingName.nationalId === cleanNatId)) {
          return NextResponse.json(
            {
              success: false,
              message: `ชื่อ-นามสกุล "${name}" มีอยู่ในระบบแล้ว (รหัสประจำตัว ${existingName.username}) หากท่านเป็นเจ้าของบัญชีเดิมกรุณาเข้าสู่ระบบ หรือหากเป็นบุคคลคนละท่านที่ชื่อ-สกุลพ้องกัน กรุณากรอกเลขประจำตัวประชาชน 13 หลักเพื่อยืนยันสิทธิ์`
            },
            { status: 409 }
          );
        }
        // หากเลขบัตร ปชช. ต่างกัน ชี้ชัดว่าเป็นคนละบุคคลกันตามกฎหมาย อนุญาตให้สมัครได้ตามปกติ
      }
    }

    // 3. ตรวจสอบใบหน้าซ้ำตามเกณฑ์ 1 คนต่อ 1 บัญชีต่อ 1 ใบหน้า (Biometric Uniqueness Check)
    if (faceDescriptor) {
      let incomingDesc: number[] = [];
      try {
        incomingDesc = typeof faceDescriptor === "string" ? JSON.parse(faceDescriptor) : faceDescriptor;
      } catch {
        return NextResponse.json({ success: false, message: "รูปแบบข้อมูลใบหน้าไม่ถูกต้อง" }, { status: 400 });
      }

      if (Array.isArray(incomingDesc) && incomingDesc.length === 128) {
        // ดึงนักเรียนทุกคนที่มีใบหน้าในระบบมาเปรียบเทียบ
        const allStudentsWithFace = await prisma.user.findMany({
          where: {
            role: "STUDENT",
            deletedAt: null,
            faceDescriptor: { not: null },
            NOT: { username }
          },
          select: { id: true, name: true, username: true, nationalId: true, faceDescriptor: true, isTwin: true }
        });

        let matchedStudent: any = null;
        let minDistance = 999;

        for (const st of allStudentsWithFace) {
          try {
            const existingDesc = JSON.parse(st.faceDescriptor!);
            const dist = calculateEuclideanDistance(incomingDesc, existingDesc);
            if (dist < minDistance) {
              minDistance = dist;
              matchedStudent = st;
            }
          } catch {
            // ข้ามข้อมูลที่ parse ไม่ได้
          }
        }

        // หากระยะทางต่ำกว่า 0.38 ถือว่าเป็นใบหน้าเดียวกันหรือเหมือนกันมาก (>62% similarity)
        if (minDistance < 0.38 && matchedStudent) {
          const simPercent = distanceToSimilarity(minDistance);

          if (isTwin) {
            // กรณีเป็นฝาแฝด ต้องมีเลขบัตร ปชช. ที่ชัดเจนและไม่ซ้ำกัน
            if (!nationalId || !nationalId.trim()) {
              return NextResponse.json(
                {
                  success: false,
                  message: `ตรวจพบใบหน้าของท่านมีความเหมือนกับ "${matchedStudent.name}" (${simPercent}%) เนื่องจากท่านระบุว่าเป็นคู่แฝดแท้ กรุณากรอกหมายเลขประจำตัวประชาชน 13 หลักให้ครบถ้วนเพื่อใช้ยืนยันตัวตน`
                },
                { status: 400 }
              );
            }
            if (matchedStudent.nationalId && matchedStudent.nationalId === nationalId.trim()) {
              return NextResponse.json(
                { success: false, message: "หมายเลขประจำตัวประชาชนตรงกับบัญชีที่มีอยู่แล้ว ไม่สามารถลงทะเบียนซ้ำได้" },
                { status: 409 }
              );
            }
            // ผ่านเกณฑ์ฝาแฝด: บันทึกข้อมูลและติด Flag รอให้อาจารย์ที่ปรึกษายืนยัน
          } else {
            return NextResponse.json(
              {
                success: false,
                message: `⚠️ ตรวจพบใบหน้านี้มีความเหมือนกับบัญชีของ "${matchedStudent.name}" (รหัสนักศึกษา ${matchedStudent.username}) สูงถึง ${simPercent}%\n\nระบบไม่อนุญาตให้ใช้ใบหน้าซ้ำกันตามเกณฑ์ 1 คน 1 บัญชี 1 ใบหน้า\nหากท่านมีคู่แฝดแท้ที่กำลังศึกษาในแผนกวิชา กรุณาทำเครื่องหมาย 'ฉันมีพี่น้องฝาแฝด' และระบุเลขบัตรประชาชนเพื่อรอให้อาจารย์รับรอง`
              },
              { status: 409 }
            );
          }
        }
      }
    }

    // 4. ตรวจสอบว่ามีผู้ใช้นี้ในระบบอยู่แล้วหรือไม่
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
          isTwin: Boolean(isTwin),
          twinNote: twinNote || null,
          twinVerified: false,
        }
      });
      return NextResponse.json({ success: true, user: { id: updatedUser.id, username: updatedUser.username } });
    }

    const user = await prisma.user.create({
      data: {
        name,
        nickname: nickname || null,
        username,
        password: await bcrypt.hash(password, 10),
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
        isTwin: Boolean(isTwin),
        twinNote: twinNote || null,
        twinVerified: false,
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
