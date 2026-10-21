import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { parseTimeToMinutes } from "../../../lib/timeUtils";

export async function POST(request: Request) {
  try {
    // Bug #2 fix: ตรวจสอบ Auth ก่อนเสมอ
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const userRole = (session.user as any)?.role;
    const userId = (session.user as any)?.id;
    if (userRole !== "TEACHER" && userRole !== "HEAD") {
      return NextResponse.json({ success: false, message: "เฉพาะอาจารย์หรือหัวหน้าแผนกเท่านั้น" }, { status: 403 });
    }

    const { studentId, subjectId, type, status } = await request.json();

    if (!studentId) {
      return NextResponse.json({ success: false, message: "กรุณาระบุ studentId" }, { status: 400 });
    }

    // ดึงข้อมูลนักเรียนและวิชาเพื่อตรวจสอบระดับชั้น (ยกเว้นเข้าแถวที่เช็คได้ทุกคน)
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { level: true, name: true }
    });

    if (!student) {
      return NextResponse.json({ success: false, message: "ไม่พบข้อมูลนักเรียน" }, { status: 404 });
    }

    if (subjectId && type !== "assembly") {
      const subject = await prisma.subject.findUnique({
        where: { id: subjectId },
        select: { teacherId: true, level: true, name: true }
      });

      if (!subject) {
        return NextResponse.json({ success: false, message: "ไม่พบข้อมูลรายวิชา" }, { status: 404 });
      }

      // ตรวจสอบสิทธิ์อาจารย์
      if (userRole === "TEACHER" && subject.teacherId !== userId) {
        return NextResponse.json({ success: false, message: "คุณไม่มีสิทธิ์เช็คชื่อในรายวิชานี้" }, { status: 403 });
      }

      // ตรวจสอบระดับชั้น (ข้ามการตรวจสอบหากนักเรียนหรือวิชาไม่ได้ระบุระดับชั้น)
      if (student.level && subject.level && student.level !== subject.level) {
        return NextResponse.json({ 
          success: false, 
          message: `นักเรียนชั้น ${student.level} ไม่สามารถเช็คชื่อในวิชาของชั้น ${subject.level} ได้` 
        }, { status: 400 });
      }
    }

    // กำหนดช่วงเวลาตรวจซ้ำตามประเภท
    const isAssembly = !subjectId || type === "assembly";
    let computedStatus = status || "PRESENT";

    // 💡 ระบบตรวจสอบช่วงเวลาเข้าแถว (Assembly with 30-min buffer: 07:10 - 08:30 น.)
    if (isAssembly) {
      const now = new Date();
      const thaiTimeStr = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Bangkok',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(now); // "HH:mm"
      const currentMinutes = parseTimeToMinutes(thaiTimeStr);

      const ASSEMBLY_START_MIN = 7 * 60 + 40; // 07:40 น. (460 นาที)
      const ASSEMBLY_END_MIN = 8 * 60;        // 08:00 น. (480 นาที)
      const BUFFER_MINUTES = 30;
      const windowStart = ASSEMBLY_START_MIN - BUFFER_MINUTES; // 07:10 น. (430 นาที)
      const windowEnd = ASSEMBLY_END_MIN + BUFFER_MINUTES;     // 08:30 น. (510 นาที)

      if (currentMinutes < windowStart || currentMinutes > windowEnd) {
        return NextResponse.json({
          success: false,
          message: "ไม่อยู่ในช่วงเวลาเข้าแถวหน้าเสาธง (เวลาเข้าแถวปกติ 07:40 - 08:00 น. โดยอนุญาตให้สแกนได้ก่อนเริ่ม 30 นาที ถึงหลังเลิก 30 นาที คือช่วงเวลา 07:10 - 08:30 น.)"
        }, { status: 400 });
      }

      // เข้าแถวมีสถานะเดียวคือมา (PRESENT) ไม่มีสถานะมาสาย
      computedStatus = "PRESENT";
    } else if (subjectId) {
      const now = new Date();
      const thaiDateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(now); // "YYYY-MM-DD"

      const thaiTimeStr = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Bangkok',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(now); // "HH:mm"
      
      const currentMinutes = parseTimeToMinutes(thaiTimeStr);

      const thaiDayStr = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Bangkok',
        weekday: 'short'
      }).format(now);
      const dayMap: Record<string, number> = {
        'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 7
      };
      const currentDayOfWeek = dayMap[thaiDayStr] || 1;

      // 1. ดึงตารางเรียนปกติของวิชานี้ในวันนี้
      const regularSchedules = await prisma.schedule.findMany({
        where: { subjectId, dayOfWeek: currentDayOfWeek, deletedAt: null }
      });

      // 2. ดึงคลาสสอนชดเชยของวิชานี้ในวันนี้
      let makeupClassesToday: any[] = [];
      try {
        const todayStart = new Date(`${thaiDateStr}T00:00:00.000Z`);
        const todayEnd = new Date(`${thaiDateStr}T23:59:59.999Z`);
        makeupClassesToday = await (prisma as any).makeupClass.findMany({
          where: {
            subjectId,
            date: { gte: todayStart, lte: todayEnd },
            deletedAt: null
          }
        });
      } catch (err) {
        try {
          const todayStart = new Date(`${thaiDateStr}T00:00:00.000Z`);
          const todayEnd = new Date(`${thaiDateStr}T23:59:59.999Z`);
          makeupClassesToday = await (prisma as any).makeupClass.findMany({
            where: {
              subjectId,
              date: { gte: todayStart, lte: todayEnd }
            }
          });
        } catch {
          makeupClassesToday = [];
        }
      }

      // รวม session ทั้งหมดที่จัดขึ้นวันนี้
      const allSessionsToday = [
        ...regularSchedules.map(sc => ({
          type: 'regular',
          startTime: sc.startTime,
          endTime: sc.endTime
        })),
        ...makeupClassesToday.map(mc => ({
          type: 'makeup',
          startTime: mc.startTime,
          endTime: mc.endTime
        }))
      ];

      // ดึงเกณฑ์เวลาสาย (lateThresholdMin)
      const subjInfo = await prisma.subject.findUnique({
        where: { id: subjectId },
        select: { lateThresholdMin: true }
      });
      const lateThreshold = subjInfo?.lateThresholdMin ?? 15;

      // ตรวจสอบว่าเวลาปัจจุบันอยู่ในช่วง [startTime - 30 นาที, endTime + 30 นาที] หรือไม่
      const BUFFER_MINUTES = 30;
      let matchedSession: { startTime: string; endTime: string; type: string } | null = null;

      for (const session of allSessionsToday) {
        const startMin = parseTimeToMinutes(session.startTime);
        const endMin = parseTimeToMinutes(session.endTime);
        const windowStart = startMin - BUFFER_MINUTES;
        const windowEnd = endMin + BUFFER_MINUTES;

        if (currentMinutes >= windowStart && currentMinutes <= windowEnd) {
          matchedSession = session;
          break;
        }
      }

      // ถ้านอกช่วงเวลาที่อนุญาต ให้ปฏิเสธการสแกนทันที
      if (!matchedSession) {
        if (allSessionsToday.length === 0) {
          return NextResponse.json({
            success: false,
            message: `วันนี้ไม่มีตารางเรียนหรือคลาสชดเชยสำหรับวิชานี้ หากมีการสอนนอกตาราง กรุณากดสร้าง "คลาสสอนชดเชย" ก่อนเปิดสแกน`
          }, { status: 400 });
        } else {
          const sessionsText = allSessionsToday.map(s => `${s.startTime} - ${s.endTime} น.`).join(', ');
          return NextResponse.json({
            success: false,
            message: `ไม่อยู่ในช่วงเวลาเรียนของวิชานี้ (ตารางวันนี้: ${sessionsText} โดยอนุญาตให้สแกนได้ก่อนเริ่ม 30 นาที ถึงหลังเลิก 30 นาที) หากสอนนอกเวลา กรุณากดสร้าง "คลาสสอนชดเชย"`
          }, { status: 400 });
        }
      }

      // ถ้าอยู่ในช่วงเวลาเรียน ให้คำนวณว่า PRESENT หรือ LATE
      const sessionStartMin = parseTimeToMinutes(matchedSession.startTime);
      const lateCutoffMin = sessionStartMin + lateThreshold;

      if (currentMinutes > lateCutoffMin) {
        computedStatus = "LATE";
      } else {
        computedStatus = "PRESENT";
      }
    }

    // ตรวจสอบประวัติเข้าเรียน/เข้าแถวในวันนี้ (รองรับเวลาไทย UTC+7)
    const now = new Date();
    const thaiFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' });
    const parts = thaiFormatter.formatToParts(now);
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    const year = parts.find(p => p.type === 'year')?.value;
    
    const todayStart = new Date(`${year}-${month}-${day}T00:00:00.000+07:00`);
    const todayEnd = new Date(`${year}-${month}-${day}T23:59:59.999+07:00`);

    const duplicateWhere: any = { studentId, timestamp: { gte: todayStart, lte: todayEnd } };

    if (isAssembly) {
      duplicateWhere.subjectId = null;
      duplicateWhere.type = "assembly";
    } else {
      duplicateWhere.subjectId = subjectId;
    }

    const recent = await prisma.attendance.findFirst({
      where: duplicateWhere,
      orderBy: { timestamp: 'desc' }
    });

    if (recent) {
      if (recent.status === "ABSENT") {
        // หากครูเคยเช็คขาดไปแล้ว ให้สแกนหน้าทับเป็นมาเรียน/มาสายได้เลย
        const updated = await prisma.attendance.update({
          where: { id: recent.id },
          data: { status: computedStatus, timestamp: new Date() }
        });
        return NextResponse.json({ success: true, attendance: updated, updatedFromAbsent: true });
      }
      return NextResponse.json({ success: true, message: "Checked in recently", duplicate: true });
    }

    const attendance = await prisma.attendance.create({
      data: {
        studentId,
        subjectId: subjectId || null,
        type: type || "class",
        status: computedStatus
      }
    });

    return NextResponse.json({ success: true, attendance });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
