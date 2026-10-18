import fs from "fs/promises";
import path from "path";

const REMARKS_FILE = path.join(process.cwd(), "src", "data", "attendance_remarks.json");

export interface AttendanceRemarkItem {
  remark: string;
  updatedAt: string;
  updatedBy?: string;
}

export async function getAttendanceRemarks(): Promise<Record<string, AttendanceRemarkItem>> {
  try {
    const data = await fs.readFile(REMARKS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
}

export async function saveAttendanceRemark(attendanceId: string, remark?: string, updatedBy?: string): Promise<void> {
  try {
    const remarks = await getAttendanceRemarks();
    const cleanRemark = remark?.trim();
    if (cleanRemark) {
      remarks[attendanceId] = {
        remark: cleanRemark,
        updatedAt: new Date().toISOString(),
        updatedBy
      };
    } else {
      delete remarks[attendanceId];
    }
    await fs.mkdir(path.dirname(REMARKS_FILE), { recursive: true });
    await fs.writeFile(REMARKS_FILE, JSON.stringify(remarks, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save attendance remark:", e);
  }
}

export async function deleteAttendanceRemark(attendanceId: string): Promise<void> {
  try {
    const remarks = await getAttendanceRemarks();
    if (remarks[attendanceId]) {
      delete remarks[attendanceId];
      await fs.writeFile(REMARKS_FILE, JSON.stringify(remarks, null, 2), "utf-8");
    }
  } catch (e) {
    console.error("Failed to delete attendance remark:", e);
  }
}
