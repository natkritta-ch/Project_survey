import prisma from "./prisma";

/**
 * สุ่มสร้างรหัสผูกผู้ปกครอง (Parent Code)
 * รูปแบบ: P-ตัวเลข 4 หลัก-ตัวอักษร 4 หลัก (เช่น P-7492-8K2M)
 * ตัดตัวที่สับสนง่ายออก เช่น 0, 1, I, O
 */
export function generateParentCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let numPart = "";
  let charPart = "";

  for (let i = 0; i < 4; i++) {
    numPart += Math.floor(Math.random() * 10).toString();
  }
  for (let i = 0; i < 4; i++) {
    charPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `P-${numPart}-${charPart}`;
}

/**
 * ตรวจสอบและสร้าง Parent Code ให้นักเรียนหากยังไม่มี
 */
export async function ensureStudentParentCode(studentId: string, currentCode?: string | null): Promise<string> {
  if (currentCode && currentCode.trim()) {
    return currentCode.trim();
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateParentCode();
    try {
      await prisma.user.update({
        where: { id: studentId },
        data: { parentCode: code }
      });
      return code;
    } catch (e: any) {
      if (e.code === "P2002") {
        // ชนกับ unique code อื่น ให้สุ่มใหม่
        continue;
      }
      console.error("Error generating parent code for student:", studentId, e);
      break;
    }
  }

  return "";
}
