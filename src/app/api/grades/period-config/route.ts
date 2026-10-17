import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import {
  getGradePeriodConfigs,
  upsertGradePeriodConfig,
  deleteGradePeriodConfig
} from "../../../../lib/gradePeriodConfig";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const configs = getGradePeriodConfigs();
    return NextResponse.json({ success: true, configs });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (userRole !== "HEAD" && userRole !== "TEACHER") {
      return NextResponse.json({ success: false, message: "เฉพาะหัวหน้าแผนกหรืออาจารย์เท่านั้นที่สามารถตั้งค่าระยะเวลาได้" }, { status: 403 });
    }

    const body = await request.json();
    const { level, academicYear, term, startDate, endDate, graceDays, isBlocking, id } = body;

    if (!level || !startDate || !endDate) {
      return NextResponse.json({ success: false, message: "กรุณาระบุระดับชั้น, วันที่เริ่มต้น และวันที่สิ้นสุดให้ครบถ้วน" }, { status: 400 });
    }

    const saved = upsertGradePeriodConfig({
      id,
      level,
      academicYear: academicYear || "2569",
      term: term || "1",
      startDate,
      endDate,
      graceDays: Number(graceDays) >= 0 ? Number(graceDays) : 7,
      isBlocking: isBlocking !== false
    });

    return NextResponse.json({
      success: true,
      message: "บันทึกระยะเวลาการยื่นเกรดเรียบร้อยแล้ว",
      config: saved
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (userRole !== "HEAD") {
      return NextResponse.json({ success: false, message: "เฉพาะหัวหน้าแผนกเท่านั้นที่มีสิทธิ์ลบการตั้งค่า" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "กรุณาระบุ id ที่ต้องการลบ" }, { status: 400 });
    }

    const deleted = deleteGradePeriodConfig(id);
    return NextResponse.json({ success: deleted, message: deleted ? "ลบรายการเรียบร้อยแล้ว" : "ไม่พบรายการที่ต้องการลบ" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
