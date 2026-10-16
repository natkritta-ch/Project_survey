import prisma from "./prisma";

/**
 * ดึงข้อมูลภาคเรียนปัจจุบันจาก termConfig โดยอิงตามวันที่ปัจจุบัน
 * ถ้าไม่พบช่วงวันที่ตรงกับปัจจุบัน จะ fallback ไปหาเทอมที่ถูกตั้งค่า isCurrent = true
 */
export async function getCurrentTermConfig(targetDate: Date = new Date()) {
  try {
    const term = await prisma.termConfig.findFirst({
      where: {
        startDate: { lte: targetDate },
        endDate: { gte: targetDate }
      }
    });

    if (term) return term;

    // Fallback: หากวันที่ไม่อยู่ในช่วง แต่มีการกำหนด isCurrent = true ไว้
    return await prisma.termConfig.findFirst({
      where: { isCurrent: true }
    });
  } catch (error) {
    console.error("Failed to get current term config:", error);
    return null;
  }
}
