/**
 * Helper: แปลงเวลาสตริง "HH:MM" เป็นจำนวนนาทีจากเที่ยงคืน
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Alias for compatibility
export const parseTimeToMinutes = timeToMinutes;

/**
 * Helper: ตรวจสอบว่าช่วงเวลา 2 ช่วงซ้อนทับกันหรือไม่
 */
export function isOverlapping(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  const aS = timeToMinutes(aStart);
  const aE = timeToMinutes(aEnd);
  const bS = timeToMinutes(bStart);
  const bE = timeToMinutes(bEnd);
  return aS < bE && aE > bS;
}
