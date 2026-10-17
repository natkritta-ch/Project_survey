"use server";

import prisma from "../../lib/prisma";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

// In-memory store for OTPs
const otpStore = new Map<string, { code: string, expires: number, verified: boolean }>();

async function sendEmailOtp(toEmail: string, otpCode: string) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPass) {
    // Dev mode: ไม่ส่งอีเมลจริง
    return { sent: false };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: gmailUser, pass: gmailPass },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000,
    });

    await transporter.sendMail({
      from: `"ระบบแผนกวิชาสำรวจ" <${gmailUser}>`,
      to: toEmail,
      subject: "รหัส OTP สำหรับตั้งรหัสผ่านใหม่",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #1d4ed8; margin-bottom: 8px;">🔐 รหัส OTP ของคุณ</h2>
          <p style="color: #374151;">กรุณาใช้รหัสด้านล่างเพื่อตั้งรหัสผ่านใหม่ในระบบแผนกวิชาสำรวจ</p>
          <div style="background: #eff6ff; border: 2px dashed #93c5fd; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #1d4ed8;">${otpCode}</span>
          </div>
          <p style="color: #6b7280; font-size: 13px;">⏱ รหัสนี้มีอายุ <strong>5 นาที</strong> เท่านั้น</p>
          <p style="color: #6b7280; font-size: 13px;">หากคุณไม่ได้ขอรหัสนี้ กรุณาเพิกเฉยต่ออีเมลนี้</p>
        </div>
      `,
    });

    return { sent: true };
  } catch (error: any) {
    console.error("sendEmailOtp error:", error?.message || error);
    return { sent: false, error: error?.message };
  }
}

export async function sendOtp(username: string, email: string) {
  try {
    const cleanUsername = username?.trim() || "";
    const cleanEmail = email?.trim().toLowerCase() || "";

    if (!cleanUsername || !cleanEmail) {
      return { success: false, error: "กรุณากรอก Username และ Email ให้ครบถ้วน" };
    }

    const user = await prisma.user.findFirst({
      where: {
        username: cleanUsername,
        deletedAt: null
      }
    });

    if (!user) {
      return { success: false, error: "ไม่พบชื่อผู้ใช้งานนี้ในระบบ" };
    }

    if (!user.email) {
      return { success: false, error: "บัญชีนี้ไม่ได้ลงทะเบียนอีเมลไว้ ไม่สามารถยืนยันตัวตนได้ กรุณาติดต่อหัวหน้าแผนกเพื่อเพิ่มอีเมลในระบบก่อน" };
    }

    const cleanDbEmail = user.email.trim().toLowerCase();

    if (cleanDbEmail !== cleanEmail) {
      return { success: false, error: "อีเมลไม่ถูกต้อง (ไม่ตรงกับที่ลงทะเบียนไว้ในระบบ)" };
    }

    // สร้าง OTP 6 หลัก
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    otpStore.set(cleanUsername, {
      code: otpCode,
      expires: Date.now() + 5 * 60 * 1000,
      verified: false
    });

    const result = await sendEmailOtp(cleanDbEmail, otpCode);

    // ซ่อนอีเมลบางส่วน เช่น ab***@gmail.com
    const [localPart, domain] = cleanDbEmail.split("@");
    const maskedEmail = (localPart ? localPart.substring(0, 2) : "") + "***@" + (domain || "");

    if (result.sent) {
      // Production: ส่งอีเมลจริงสำเร็จ
      return { success: true, userId: user.id, displayEmail: maskedEmail };
    }

    // Fallback: หากส่งอีเมลไม่สำเร็จ (เช่น Gmail App Password มีปัญหา หรือไม่มีเน็ต)
    // ให้ส่ง OTP กลับให้แสดงบนหน้าจอทันที เพื่อให้ผู้ใช้สามารถตั้งรหัสผ่านใหม่ได้ทันที ไม่เกิด Error ค้าง
    return {
      success: true,
      userId: user.id,
      displayEmail: maskedEmail,
      mockOtp: otpCode,
      warning: "เซิร์ฟเวอร์ส่งอีเมลขัดข้อง ระบบจึงแสดงรหัส OTP สำรองให้บนหน้าจอเพื่อดำเนินการต่อได้ทันที"
    };
  } catch (error: any) {
    console.error("sendOtp error:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล: " + (error?.message || "โปรดลองใหม่อีกครั้ง") };
  }
}

export async function verifyOtp(username: string, inputCode: string) {
  try {
    const cleanUsername = username?.trim() || "";
    const cleanCode = inputCode?.trim() || "";
    const record = otpStore.get(cleanUsername);

    if (!record) {
      return { success: false, error: "ไม่พบการร้องขอ OTP กรุณากดส่งรหัสใหม่" };
    }

    if (Date.now() > record.expires) {
      otpStore.delete(cleanUsername);
      return { success: false, error: "รหัส OTP หมดอายุแล้ว กรุณากดขอใหม่" };
    }

    if (record.code !== cleanCode) {
      return { success: false, error: "รหัส OTP ไม่ถูกต้อง" };
    }

    otpStore.set(cleanUsername, { ...record, verified: true });
    const user = await prisma.user.findFirst({
      where: { username: cleanUsername, deletedAt: null }
    });
    return { success: true, userId: user?.id };
  } catch (error: any) {
    return { success: false, error: error?.message || "เกิดข้อผิดพลาดในการตรวจสอบ OTP" };
  }
}

export async function updatePassword(username: string, newPasswordRaw: string) {
  try {
    const cleanUsername = username?.trim() || "";
    const record = otpStore.get(cleanUsername);

    if (!record || !record.verified) {
      return { success: false, error: "สิทธิ์ถูกปฏิเสธ: ยังไม่ผ่านการยืนยันตัวตน OTP" };
    }

    if (!newPasswordRaw || newPasswordRaw.length < 4) {
      return { success: false, error: "รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร" };
    }

    const hashedPassword = bcrypt.hashSync(newPasswordRaw, 10);
    await prisma.user.update({
      where: { username: cleanUsername },
      data: { password: hashedPassword }
    });

    otpStore.delete(cleanUsername);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน" };
  }
}
