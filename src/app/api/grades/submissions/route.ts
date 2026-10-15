import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import prisma from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    const userId = (session.user as any)?.id;
    const { searchParams } = new URL(request.url);

    const level = searchParams.get("level") || "all";
    const academicYear = searchParams.get("academicYear") || "2569";
    const term = searchParams.get("term") || "1";
    const status = searchParams.get("status") || "all";

    if (userRole === "STUDENT") {
      // ดึงประวัติการส่งของนักเรียนที่ล็อกอินอยู่
      const submissions = await (prisma as any).gradeSubmission.findMany({
        where: { studentId: userId },
        orderBy: [{ academicYear: "desc" }, { term: "desc" }]
      });

      return NextResponse.json({ success: true, submissions });
    }

    if (userRole !== "TEACHER" && userRole !== "HEAD") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    // สำหรับ อาจารย์ / หัวหน้าแผนก
    const studentWhere: any = {
      role: "STUDENT",
      deletedAt: null,
      NOT: {
        level: { in: ["จบการศึกษา", "ดรอปเรียน", "พ้นสภาพ"] }
      }
    };

    if (level && level !== "all") {
      studentWhere.level = level;
    }

    // 1. ดึงนักเรียนทั้งหมดในระดับชั้นนี้
    const allStudents = await prisma.user.findMany({
      where: studentWhere,
      select: {
        id: true,
        name: true,
        username: true,
        level: true
      },
      orderBy: [{ level: "asc" }, { username: "asc" }]
    });

    // 2. ดึงใบเกรดที่ส่งเข้ามาในเทอม/ปีนี้
    const submissionWhere: any = {
      academicYear,
      term,
      student: studentWhere
    };

    if (status && status !== "all") {
      submissionWhere.status = status;
    }

    const submissions = await (prisma as any).gradeSubmission.findMany({
      where: submissionWhere,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            username: true,
            level: true
          }
        }
      },
      orderBy: [{ updatedAt: "desc" }]
    });

    const submittedStudentIds = new Set(submissions.map((s: any) => s.studentId));
    const unsubmittedStudents = allStudents.filter(st => !submittedStudentIds.has(st.id));

    const totalStudents = allStudents.length;
    const submittedCount = submissions.length;
    const approvedCount = submissions.filter((s: any) => s.status === "APPROVED").length;
    const pendingCount = submissions.filter((s: any) => s.status === "SUBMITTED").length;
    const rejectedCount = submissions.filter((s: any) => s.status === "REJECTED").length;

    return NextResponse.json({
      success: true,
      submissions,
      progress: {
        totalStudents,
        submittedCount,
        approvedCount,
        pendingCount,
        rejectedCount,
        percent: totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0,
        approvedPercent: totalStudents > 0 ? Math.round((approvedCount / totalStudents) * 100) : 0,
        unsubmittedStudents
      }
    });
  } catch (error: any) {
    console.error("Fetch submissions error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
