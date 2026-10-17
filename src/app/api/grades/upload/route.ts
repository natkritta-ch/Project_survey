import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import prisma from "../../../../lib/prisma";
import { parseGradePdf } from "../../../../lib/pdfGradeParser";
import { checkStudentGradeSubmissionStatus } from "../../../../lib/gradePeriodConfig";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: "กรุณาเข้าสู่ระบบก่อนดำเนินการ" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    const userId = (session.user as any)?.id;
    const currentUsername = (session.user as any)?.username;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const targetStudentId = formData.get("targetStudentId") as string | null;

    if (!file) {
      return NextResponse.json({ success: false, message: "กรุณาแนบไฟล์ PDF รายงานผลการเรียน" }, { status: 400 });
    }

    // ตรวจสอบนามสกุลและประเภทไฟล์
    const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
    if (!isPdf) {
      return NextResponse.json({
        success: false,
        message: "ระบบรองรับเฉพาะไฟล์เอกสาร .pdf ทางการที่ดาวน์โหลดจากระบบ ศธ.02/RMS เท่านั้น"
      }, { status: 400 });
    }

    // กำหนดนักเรียนเป้าหมาย
    let actualStudentId = userId;
    let expectedUsername = currentUsername;
    let expectedName = (session.user as any)?.name;

    if (userRole === "TEACHER" || userRole === "HEAD") {
      if (targetStudentId) {
        const targetStudent = await prisma.user.findUnique({
          where: { id: targetStudentId },
          select: { id: true, username: true, name: true }
        });
        if (!targetStudent) {
          return NextResponse.json({ success: false, message: "ไม่พบข้อมูลนักเรียนเป้าหมาย" }, { status: 404 });
        }
        actualStudentId = targetStudent.id;
        expectedUsername = targetStudent.username;
        expectedName = targetStudent.name;
      }
    } else if (userRole === "STUDENT") {
      // ตรวจสอบสถานะระยะเวลาการส่งใบเกรดและสิทธิ์ปลดล็อกกรณีพิเศษ
      const statusCheck = await checkStudentGradeSubmissionStatus(userId);
      if (statusCheck.isSuspended && !statusCheck.canSubmitGrades) {
        return NextResponse.json({
          success: false,
          message: statusCheck.reason || "หมดเวลาส่งใบรายงานผลการศึกษาสำหรับภาคเรียนนี้แล้ว (พ้นระยะเวลาผ่อนผันแล้ว) กรุณาติดต่ออาจารย์ประจำชั้นหรือหัวหน้าแผนกเพื่อขอปลดล็อกกรณีพิเศษ"
        }, { status: 403 });
      }
    } else {
      return NextResponse.json({ success: false, message: "เฉพาะนักเรียนหรืออาจารย์เท่านั้นที่สามารถอัปโหลดได้" }, { status: 403 });
    }

    // แปลงไฟล์เป็น Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // อ่านและสกัดข้อมูลด้วย PDF Parser พร้อมตรวจสอบความปลอดภัย
    const parseResult = await parseGradePdf(buffer, expectedUsername, expectedName);

    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        message: parseResult.error || "ไม่สามารถอ่านข้อมูลผลการเรียนจากไฟล์นี้ได้"
      }, { status: 400 });
    }

    const inputTerm = formData.get("term") as string | null;
    const inputYear = formData.get("academicYear") as string | null;
    const inputGpa = formData.get("gpa") as string | null;
    const inputGpax = formData.get("gpax") as string | null;
    const inputCredits = formData.get("totalCredits") as string | null;

    const academicYear = inputYear || parseResult.academicYear || "2569";
    const term = inputTerm || parseResult.term || "1";
    const finalGpa = inputGpa !== null && inputGpa !== "" ? parseFloat(inputGpa) : (parseResult.gpa ?? null);
    const finalGpax = inputGpax !== null && inputGpax !== "" ? parseFloat(inputGpax) : (parseResult.gpax ?? null);
    const finalCredits = inputCredits !== null && inputCredits !== "" ? parseFloat(inputCredits) : (parseResult.termCredits ?? parseResult.cumulativeCredits ?? null);

    // ตรวจสอบสถานะการส่งเดิม
    const existing = await (prisma as any).gradeSubmission.findUnique({
      where: {
        studentId_academicYear_term: {
          studentId: actualStudentId,
          academicYear,
          term
        }
      }
    });

    if (existing && existing.status === "APPROVED" && userRole === "STUDENT") {
      return NextResponse.json({
        success: false,
        message: `ผลการเรียนภาคเรียนที่ ${term}/${academicYear} ได้รับการอนุมัติรับรองแล้ว ไม่สามารถแก้ไขได้ หากต้องการแก้ไขกรุณาติดต่ออาจารย์ประจำชั้น`
      }, { status: 403 });
    }

    // แปลงไฟล์เป็น Data URL Base64 เพื่อให้หน้าจอ Split-Screen พรีวิวได้ทันทีโดยไม่ต้องพึ่งพาโฟลเดอร์ไฟล์บนเซิร์ฟเวอร์
    const base64Data = `data:application/pdf;base64,${buffer.toString("base64")}`;

    const submission = await (prisma as any).gradeSubmission.upsert({
      where: {
        studentId_academicYear_term: {
          studentId: actualStudentId,
          academicYear,
          term
        }
      },
      update: {
        fileData: base64Data,
        fileName: file.name,
        gpa: finalGpa,
        gpax: finalGpax,
        totalCredits: finalCredits,
        extractedData: JSON.stringify(parseResult.subjects || []),
        status: "SUBMITTED",
        rejectReason: null,
        updatedAt: new Date()
      },
      create: {
        studentId: actualStudentId,
        academicYear,
        term,
        fileData: base64Data,
        fileName: file.name,
        gpa: finalGpa,
        gpax: finalGpax,
        totalCredits: finalCredits,
        extractedData: JSON.stringify(parseResult.subjects || []),
        status: "SUBMITTED",
        rejectReason: null
      }
    });

    return NextResponse.json({
      success: true,
      message: "อัปโหลดและสกัดข้อมูลใบเกรดสำเร็จแล้ว อยู่ระหว่างรออาจารย์ประจำชั้นตรวจสอบและอนุมัติ",
      submission: {
        id: submission.id,
        status: submission.status,
        academicYear: submission.academicYear,
        term: submission.term,
        gpa: submission.gpa,
        gpax: submission.gpax,
        subjectsCount: parseResult.subjects.length
      },
      extracted: parseResult
    });
  } catch (error: any) {
    console.error("Grade upload error:", error);
    return NextResponse.json({ success: false, message: `เกิดข้อผิดพลาดในการประมวลผล: ${error.message || error}` }, { status: 500 });
  }
}
