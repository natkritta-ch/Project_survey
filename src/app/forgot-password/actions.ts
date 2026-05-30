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

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPass },
  });

  await transporter.sendMail({
    from: `"ระบบโรงเรียน" <${gmailUser}>`,
    to: toEmail,
    subject: "รหัส OTP สำหรับตั้งรหัสผ่านใหม่",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <h2 style="color: #1d4ed8; margin-bottom: 8px;">🔐 รหัส OTP ของคุณ</h2>
        <p style="color: #374151;">กรุณาใช้รหัสด้านล่างเพื่อตั้งรหัสผ่านใหม่ในระบบโรงเรียน</p>
        <div style="background: #eff6ff; border: 2px dashed #93c5fd; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #1d4ed8;">${otpCode}</span>
        </div>
        <p style="color: #6b7280; font-size: 13px;">⏱ รหัสนี้มีอายุ <strong>5 นาที</strong> เท่านั้น</p>
        <p style="color: #6b7280; font-size: 13px;">หากคุณไม่ได้ขอรหัสนี้ กรุณาเพิกเฉยต่ออีเมลนี้</p>
      </div>
    `,
  });

  return { sent: true };
}

export async function sendOtp(username: string, email: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || user.deletedAt) {
    return { success: false, error: "ไม่พบชื่อผู้ใช้งานนี้ในระบบ" };
  }

  if (!user.email) {
    return { success: false, error: "บัญชีนี้ไม่ได้ลงทะเบียนอีเมลไว้ ไม่สามารถยืนยันตัวตนได้ กรุณาให้หัวหน้าแผนกเพิ่มอีเมลให้ก่อน" };
  }

  const cleanDbEmail = user.email.trim().toLowerCase();
  const cleanInputEmail = email.trim().toLowerCase();

  if (cleanDbEmail !== cleanInputEmail) {
    return { success: false, error: "อีเมลไม่ถูกต้อง (ไม่ตรงกับที่ลงทะเบียนไว้ในระบบ)" };
  }

  // สร้าง OTP 6 หลัก
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  otpStore.set(username, {
    code: otpCode,
    expires: Date.now() + 5 * 60 * 1000,
    verified: false
  });

  const result = await sendEmailOtp(cleanDbEmail, otpCode);

  // ซ่อนอีเมลบางส่วน เช่น ab***@gmail.com
  const [localPart, domain] = cleanDbEmail.split("@");
  const maskedEmail = localPart.substring(0, 2) + "***@" + domain;

  if (result.sent) {
    // Production: ส่งอีเมลจริงแล้ว ไม่ return OTP กลับ
    return { success: true, userId: user.id, displayEmail: maskedEmail };
  }

  // Dev mode: return OTP กลับให้แสดงบนหน้าจอ
  return {
    success: true,
    userId: user.id,
    displayEmail: maskedEmail,
    mockOtp: otpCode
  };
}

export async function verifyOtp(username: string, inputCode: string) {
  const record = otpStore.get(username);

  if (!record) {
    return { success: false, error: "ไม่พบการร้องขอ OTP กรุณากดส่งรหัสใหม่" };
  }

  if (Date.now() > record.expires) {
    otpStore.delete(username);
    return { success: false, error: "รหัส OTP หมดอายุแล้ว กรุณากดขอใหม่" };
  }

  if (record.code !== inputCode) {
    return { success: false, error: "รหัส OTP ไม่ถูกต้อง" };
  }

  otpStore.set(username, { ...record, verified: true });
  const user = await prisma.user.findUnique({ where: { username } });
  return { success: true, userId: user?.id };
}

export async function updatePassword(username: string, newPasswordRaw: string) {
  const record = otpStore.get(username);

  if (!record || !record.verified) {
    return { success: false, error: "สิทธิ์ถูกปฏิเสธ: ยังไม่ผ่านการยืนยันตัวตน OTP" };
  }

  if (newPasswordRaw.length < 4) {
    return { success: false, error: "รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร" };
  }

  const hashedPassword = bcrypt.hashSync(newPasswordRaw, 10);
  await prisma.user.update({
    where: { username },
    data: { password: hashedPassword }
  });

  otpStore.delete(username);
  return { success: true };
}
