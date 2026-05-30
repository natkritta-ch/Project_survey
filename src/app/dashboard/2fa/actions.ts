"use server";

import prisma from "../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import speakeasy from "speakeasy";
import qrcode from "qrcode";

export async function generate2FASecret() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: "Not authenticated" };

  const username = (session.user as any).name || (session.user as any).id; // Actually we need DB username
  const user = await prisma.user.findUnique({ where: { id: (session.user as any).id } });
  if (!user) return { success: false, error: "User not found" };

  // Generate new secret
  const secretData = speakeasy.generateSecret({ name: `School Attendance System (${user.username})` });
  const secret = secretData.base32;
  const otpauthUrl = secretData.otpauth_url;

  const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

  // We should NOT save this to DB immediately. Only save it when they verify it successfully!
  // To do that statelessly, we return the secret to the client, and the client sends it back along with the verify code.
  return { 
    success: true, 
    secret, 
    qrCodeDataUrl 
  };
}

export async function verifyAndEnable2FA(secret: string, token: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: "Not authenticated" };

  // Validating the token
  const isValid = speakeasy.totp.verify({ 
    secret, 
    encoding: 'base32', 
    token,
    window: 2
  });

  if (!isValid) {
    return { success: false, error: "รหัสไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง" };
  }

  // Save to DB
  await prisma.user.update({
    where: { id: (session.user as any).id },
    data: {
      twoFactorSecret: secret,
      isTwoFactorEnabled: true
    }
  });

  return { success: true };
}

export async function disable2FA() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: "Not authenticated" };

  await prisma.user.update({
    where: { id: (session.user as any).id },
    data: {
      isTwoFactorEnabled: false,
      twoFactorSecret: null
    }
  });

  return { success: true };
}

export async function get2FAStatus() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, isEnabled: false };

  // any hack because prisma generated client might be outdated on user's machine currently
  const user: any = await prisma.user.findUnique({ where: { id: (session.user as any).id } });

  return { success: true, isEnabled: user?.isTwoFactorEnabled || false };
}
