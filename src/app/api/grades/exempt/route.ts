import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import prisma from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (userRole !== "HEAD" && userRole !== "TEACHER") {
      return NextResponse.json({ success: false, message: "เฉพาะอาจารย์หรือหัวหน้าแผนกเท่านั้นที่มีสิทธิ์ปลดล็อก" }, { status: 403 });
    }

    const { studentId, exempt } = await request.json();

    if (!studentId) {
      return NextResponse.json({ success: false, message: "กรุณาระบุ studentId" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: studentId },
      data: { canSubmitGrades: exempt === true },
      select: { id: true, name: true, username: true, canSubmitGrades: true }
    });

    return NextResponse.json({
      success: true,
      message: exempt
        ? `ปลดล็อกการระงับสิทธิ์เช็คชื่อให้ ${updated.name} เรียบร้อยแล้ว (สามารถเช็คชื่อได้ตามปกติ)`
        : `ยกเลิกการปลดล็อกพิเศษของ ${updated.name} แล้ว (ใช้ตามเกณฑ์กำหนดเวลาปกติ)`,
      student: updated
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
