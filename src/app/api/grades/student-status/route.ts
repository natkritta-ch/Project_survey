import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { checkStudentGradeSubmissionStatus } from "../../../../lib/gradePeriodConfig";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetStudentId = searchParams.get("studentId");
    const term = searchParams.get("term") || "1";
    const academicYear = searchParams.get("academicYear") || "2569";

    const userRole = (session.user as any)?.role;
    const currentUserId = (session.user as any)?.id;

    let studentId = currentUserId;
    if (targetStudentId && (userRole === "TEACHER" || userRole === "HEAD" || userRole === "PARENT")) {
      studentId = targetStudentId;
    }

    const result = await checkStudentGradeSubmissionStatus(studentId, academicYear, term);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
