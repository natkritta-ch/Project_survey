import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import prisma from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    const userName = (session.user as any)?.name || "หัวหน้าแผนก/อาจารย์";

    if (userRole !== "TEACHER" && userRole !== "HEAD") {
      return NextResponse.json({ success: false, message: "ไม่มีสิทธิ์ดำเนินการนี้" }, { status: 403 });
    }

    const { level, academicYear = "2569", term = "1" } = await request.json();

    const studentWhere: any = {
      role: "STUDENT",
      deletedAt: null
    };
    if (level && level !== "all") {
      studentWhere.level = level;
    }

    const isHead = userRole === "HEAD";
    const statusQuery = isHead ? { in: ["TEACHER_APPROVED", "SUBMITTED"] } : "SUBMITTED";

    const pendingSubmissions = await (prisma as any).gradeSubmission.findMany({
      where: {
        academicYear,
        term,
        status: statusQuery,
        student: studentWhere
      },
      include: {
        student: {
          select: { id: true, name: true, level: true }
        }
      }
    });

    if (pendingSubmissions.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: isHead 
          ? "ไม่มีใบเกรดที่รอรับรองในกลุ่มนี้" 
          : "ไม่มีใบเกรดที่รออาจารย์ตรวจสอบในกลุ่มนี้"
      });
    }

    let approvedStudentsCount = 0;
    let totalSyncedGrades = 0;

    for (const submission of pendingSubmissions) {
      let subjectsList: any[] = [];
      if (submission.extractedData) {
        try {
          subjectsList = JSON.parse(submission.extractedData);
        } catch (e) {
          subjectsList = [];
        }
      }

      // ถ้าเป็นหัวหน้าแผนกรับรอง ให้ซิงก์วิชาและเกรด
      if (isHead) {
        for (const sub of subjectsList) {
          if (!sub.code) continue;
          let subjectRecord = await prisma.subject.findFirst({
            where: { code: sub.code, deletedAt: null }
          });

          if (!subjectRecord) {
            subjectRecord = await prisma.subject.create({
              data: {
                code: sub.code,
                name: sub.name || sub.code,
                credit: sub.credits || 3,
                academicYear: submission.academicYear,
                term: submission.term,
                level: submission.student?.level || "-",
                group: "ก.1,2"
              }
            });
          }

          const numGrade = sub.gradeValue !== undefined && sub.gradeValue !== null ? sub.gradeValue : parseFloat(sub.grade);
          if (!isNaN(numGrade)) {
            await prisma.grade.upsert({
              where: {
                studentId_subjectId: {
                  studentId: submission.studentId,
                  subjectId: subjectRecord.id
                }
              },
              update: { grade: numGrade, updatedAt: new Date() },
              create: {
                id: crypto.randomUUID(),
                studentId: submission.studentId,
                subjectId: subjectRecord.id,
                grade: numGrade,
                updatedAt: new Date()
              }
            });
            totalSyncedGrades++;
          }
        }
      }

      const targetStatus = isHead ? "APPROVED" : "TEACHER_APPROVED";
      const finalApprovedBy = isHead
        ? (submission.approvedBy && !submission.approvedBy.includes("หัวหน้าแผนก") 
            ? `${submission.approvedBy} (อาจารย์) / ${userName} (หัวหน้าแผนก)` 
            : `${userName} (หัวหน้าแผนก)`)
        : userName;

      await (prisma as any).gradeSubmission.update({
        where: { id: submission.id },
        data: {
          status: targetStatus,
          approvedBy: finalApprovedBy,
          approvedAt: new Date(),
          rejectReason: null,
          updatedAt: new Date()
        }
      });
      approvedStudentsCount++;
    }

    return NextResponse.json({
      success: true,
      count: approvedStudentsCount,
      totalSyncedGrades,
      message: `อนุมัติใบเกรดแบบทั้งห้องสำเร็จ ${approvedStudentsCount} คน (รวมเกรดรายวิชา ${totalSyncedGrades} รายการ)`
    });
  } catch (error: any) {
    console.error("Batch approve error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
