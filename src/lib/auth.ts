import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "./prisma";
import bcrypt from "bcryptjs";

// Simple In-Memory Rate Limiter (ป้องกัน Brute Force)
const loginAttempts = new Map<string, { count: number, resetAt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000; // ล็อค 1 นาที

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "กรอกชื่อผู้ใช้งาน" },
        password: { label: "Password", type: "password", placeholder: "รหัสผ่าน" },
        totpCode: { label: "2FA Code", type: "text" }
      },
      async authorize(credentials) {
        console.log("Login Trial:", credentials?.username);
        
        if (!credentials?.username || !credentials?.password) {
          console.log("Error: Missing credentials");
          throw new Error("Missing username or password");
        }

        const username = credentials.username;
        const now = Date.now();
        const attempt = loginAttempts.get(username);
        
        // ตรวจสอบว่าโดนแบนอยู่หรือไม่
        if (attempt && now < attempt.resetAt && attempt.count >= MAX_ATTEMPTS) {
          console.log(`Rate limit exceeded for ${username}`);
          throw new Error("บัญชีถูกระงับชั่วคราวเนื่องจากใส่รหัสผิดเกิน 5 ครั้ง กรุณารอ 1 นาที");
        } else if (attempt && now >= attempt.resetAt) {
           loginAttempts.delete(username); // รีเซ็ตเมื่อหมดเวลา
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username, deletedAt: null }
        });

        console.log("DB User Found:", user ? user.username : "None");

        if (!user) {
          console.log("Error: User not found in DB");
          throw new Error("User not found");
        }
        
        // Bug #11 fix: ใช้ bcrypt.compare เพื่อความปลอดภัย
        // รองรับทั้ง bcrypt hash (ใหม่) และ plain text (เก่า) เพื่อ migration ที่นุ่มนวล
        const isPasswordValid = user.password.startsWith('$2') 
          ? await bcrypt.compare(credentials.password, user.password)  // bcrypt hash
          : user.password === credentials.password; // plain text (legacy)

        if (!isPasswordValid) {
          // บันทึกการล็อกอินล้มเหลว
          const currentAttempt = loginAttempts.get(username) || { count: 0, resetAt: now + LOCKOUT_MS };
          currentAttempt.count += 1;
          currentAttempt.resetAt = now + LOCKOUT_MS; // เริ่มนับเวลาใหม่เมื่อผิดอีกรอบ
          loginAttempts.set(username, currentAttempt);
          
          console.log("Error: Invalid password");
          throw new Error("Invalid password");
        }

        // ล็อกอินสำเร็จ ล้างประวัติการใส่รหัสผิด
        loginAttempts.delete(username);

        // --- 2FA Check ---
        // Need to use any because Prisma client might not be fully generated yet for the new fields
        const userWith2FA = user as any;
        if (userWith2FA.isTwoFactorEnabled && userWith2FA.twoFactorSecret) {
          if (!credentials.totpCode) {
            console.log("Error: 2FA required for this user");
            throw new Error("2FA_REQUIRED");
          }
          
          const speakeasy = require('speakeasy');
          const isValid = speakeasy.totp.verify({
            secret: userWith2FA.twoFactorSecret,
            encoding: 'base32',
            token: credentials.totpCode
          });
          
          if (!isValid) {
            console.log("Error: Invalid 2FA token");
            throw new Error("INVALID_2FA_CODE");
          }
        }

        console.log("Login Success! Role:", user.role);

        return {
          id: user.id,
          name: user.name,
          role: user.role, // เรามี Role Enum จาก Prisma: HEAD, TEACHER, STUDENT, PARENT
        } as any;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }

      // Check if user is soft deleted to invalidate active sessions (Fix for Issue #1)
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { deletedAt: true }
        });
        if (!dbUser || dbUser.deletedAt) {
          return {}; // returning empty token invalidates session
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login", // เราจะสร้างหน้า login เอง
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "super-secret-dev-key",
};
