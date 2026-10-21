import prisma from "./prisma";

/**
 * ตรวจสอบว่าคลาสสอนชดเชยแต่ละคลาสเคยมีการเปิดสแกนเช็คชื่อแล้วหรือไม่
 */
export async function enrichMakeupClassesWithAttendance(makeupClasses: any[]): Promise<any[]> {
  if (!makeupClasses || makeupClasses.length === 0) return [];

  // ดึง schedule เพื่อเช็คว่ามีคาบปกติในวันเดียวกันหรือไม่
  const subjectIds = Array.from(new Set(makeupClasses.map((m: any) => m.subjectId)));
  const schedules = await prisma.schedule.findMany({
    where: { subjectId: { in: subjectIds }, deletedAt: null },
    select: { subjectId: true, dayOfWeek: true, startTime: true, endTime: true }
  });

  const dayMap: Record<string, number> = {
    'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 7
  };

  const results = await Promise.all(
    makeupClasses.map(async (mc: any) => {
      try {
        const mcDate = new Date(mc.date);
        const dateStr = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Bangkok',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(mcDate);

        const thaiDay = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Bangkok',
          weekday: 'short'
        }).format(mcDate);
        const dayOfWeek = dayMap[thaiDay] || 1;

        const hasRegularSchedToday = schedules.some(
          sc => sc.subjectId === mc.subjectId && sc.dayOfWeek === dayOfWeek
        );

        let windowStart: Date;
        let windowEnd: Date;

        if (hasRegularSchedToday && mc.startTime && mc.endTime) {
          const [sH, sM] = mc.startTime.split(':').map(Number);
          const [eH, eM] = mc.endTime.split(':').map(Number);
          const startMin = Math.max(0, (sH || 0) * 60 + (sM || 0) - 30);
          const endMin = (eH || 0) * 60 + (eM || 0) + 30;

          windowStart = new Date(`${dateStr}T${String(Math.floor(startMin / 60)).padStart(2, '0')}:${String(startMin % 60).padStart(2, '0')}:00.000+07:00`);
          windowEnd = new Date(`${dateStr}T${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}:59.999+07:00`);
        } else {
          // ถ้าไม่มีตารางปกติในวันนั้น ให้ตรวจเช็คประวัติทั้งวันในวันที่สอนชดเชย
          windowStart = new Date(`${dateStr}T00:00:00.000+07:00`);
          windowEnd = new Date(`${dateStr}T23:59:59.999+07:00`);
        }

        const count = await prisma.attendance.count({
          where: {
            subjectId: mc.subjectId,
            type: "class",
            timestamp: {
              gte: windowStart,
              lte: windowEnd
            }
          }
        });

        return {
          ...mc,
          hasAttendance: count > 0,
          attendanceCount: count
        };
      } catch (err) {
        return {
          ...mc,
          hasAttendance: false,
          attendanceCount: 0
        };
      }
    })
  );

  return results;
}
