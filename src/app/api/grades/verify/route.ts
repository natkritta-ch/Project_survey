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
    const userName = (session.user as any)?.name || "อาจารย์";

    if (userRole !== "TEACHER" && userRole !== "HEAD") {
      return NextResponse.json({ success: false, message: "เฉพาะอาจารย์หรือหัวหน้าแผนกเท่านั้นที่มีสิทธิ์ตรวจสอบเกรด" }, { status: 403 });
    }

    const body = await request.json();
    const { submissionId, action, rejectReason, editedSubjects, gpa, gpax } = body;

    if (!submissionId || !action) {
      return NextResponse.json({ success: false, message: "ข้อมูลไม่ครบถ้วน (ต้องการ submissionId และ action)" }, { status: 400 });
    }

    const submission = await (prisma as any).gradeSubmission.findUnique({
      where: { id: submissionId },
      include: {
        student: {
          select: { id: true, name: true, username: true, level: true }
        }
      }
    });

    if (!submission) {
      return NextResponse.json({ success: false, message: "ไม่พบข้อมูลการส่งใบเกรดนี้" }, { status: 404 });
    }

    if (action === "REJECT") {
      const updated = await (prisma as any).gradeSubmission.update({
        where: { id: submissionId },
        data: {
          status: "REJECTED",
          rejectReason: rejectReason || "เอกสารไม่ชัดเจน หรือข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและอัปโหลดใหม่",
          approvedBy: null,
          approvedAt: null,
          updatedAt: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        message: `ปฏิเสธใบเกรดของ ${submission.student?.name} เรียบร้อยแล้ว ระบบจะแจ้งเตือนให้นักเรียนส่งใหม่`,
        submission: updated
      });
    }

    if (action === "REVOKE") {
      const updated = await (prisma as any).gradeSubmission.update({
        where: { id: submissionId },
        data: {
          status: "SUBMITTED",
          approvedBy: null,
          approvedAt: null,
          rejectReason: "ยกเลิกการอนุมัติเพื่อปลดล็อกแก้ไข",
          updatedAt: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        message: `ยกเลิกการอนุมัติใบเกรดของ ${submission.student?.name} เรียบร้อยแล้ว (ปลดล็อกสถานะ)`,
        submission: updated
      });
    }

    if (action === "APPROVE") {
      // 1. ดึงรายการวิชาจาก editedSubjects (หากอาจารย์แก้หน้าจอ) หรือจาก extractedData เดิม
      let subjectsList: any[] = [];
      if (editedSubjects && Array.isArray(editedSubjects)) {
        subjectsList = editedSubjects;
      } else if (submission.extractedData) {
        try {
          subjectsList = JSON.parse(submission.extractedData);
        } catch (e) {
          subjectsList = [];
        }
      }

      // 2. บันทึก / ซิงก์เกรดรายวิชาลงในตาราง grade จริงในฐานข้อมูล
      let syncedCount = 0;
      for (const sub of subjectsList) {
        if (!sub.code) continue;

        // ค้นหาวิชาในระบบตามรหัสวิชา code (เช่น 30000-1101)
        let subjectRecord = await prisma.subject.findFirst({
          where: {
            code: sub.code,
            deletedAt: null
          }
        });

        // หากยังไม่มีวิชาในระบบ ให้สร้างวิชาให้อัตโนมัติตามข้อมูลในใบรายงานผลการศึกษา
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

        // ถ้าวิชามีเกรดที่เป็นตัวเลข (เช่น 4.0, 3.5, 3.0 ...) หรือค่า gradeValue
        const numGrade = sub.gradeValue !== undefined && sub.gradeValue !== null ? sub.gradeValue : parseFloat(sub.grade);
        if (!isNaN(numGrade)) {
          await prisma.grade.upsert({
            where: {
              studentId_subjectId: {
                studentId: submission.studentId,
                subjectId: subjectRecord.id
              }
            },
            update: {
              grade: numGrade,
              updatedAt: new Date()
            },
            create: {
              id: crypto.randomUUID(),
              studentId: submission.studentId,
              subjectId: subjectRecord.id,
              grade: numGrade,
              updatedAt: new Date()
            }
          });
          syncedCount++;
        }
      }

      // 3. ปรับสถานะใบเกรดเป็น APPROVED
      const updated = await (prisma as any).gradeSubmission.update({
        where: { id: submissionId },
        data: {
          status: "APPROVED",
          approvedBy: userName,
          approvedAt: new Date(),
          rejectReason: null,
          extractedData: JSON.stringify(subjectsList),
          ...(gpa !== undefined && gpa !== null && gpa !== "" && !isNaN(parseFloat(gpa)) ? { gpa: parseFloat(gpa) } : {}),
          ...(gpax !== undefined && gpax !== null && gpax !== "" && !isNaN(parseFloat(gpax)) ? { gpax: parseFloat(gpax) } : {}),
          updatedAt: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        message: `อนุมัติผลการเรียนของ ${submission.student?.name} สำเร็จ บันทึกเกรดรายวิชาแล้ว ${syncedCount} วิชา ผู้ปกครองและนักเรียนสามารถดูได้ทันที`,
        submission: updated,
        syncedCount
      });
    }

    return NextResponse.json({ success: false, message: "action ไม่ถูกต้อง (รองรับ APPROVE, REJECT, REVOKE)" }, { status: 400 });
  } catch (error: any) {
    console.error("Grade verify error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
