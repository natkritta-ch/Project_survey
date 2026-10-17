import fs from "fs";
import path from "path";
import prisma from "./prisma";

export interface GradePeriodConfig {
  id: string;
  level: string; // "ALL" หรือระดับชั้น เช่น "ปวช.1", "ปวส.1"
  academicYear: string; // เช่น "2569"
  term: string; // เช่น "1"
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  graceDays: number; // ระยะผ่อนผัน เช่น 7 วัน
  isBlocking: boolean; // ระงับสิทธิ์เช็คชื่อเมื่อเลยระยะผ่อนผัน
  updatedAt: string;
}

const CONFIG_FILE = path.join(process.cwd(), "src", "data", "gradePeriodConfig.json");

function ensureDirectoryExists(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ค่าเริ่มต้นมาตรฐานหากยังไม่มีการกำหนด
const DEFAULT_CONFIGS: GradePeriodConfig[] = [
  {
    id: "default-all-2569-1",
    level: "ALL",
    academicYear: "2569",
    term: "1",
    startDate: "2026-05-15",
    endDate: "2026-10-31",
    graceDays: 7,
    isBlocking: true,
    updatedAt: new Date().toISOString()
  }
];

export function getGradePeriodConfigs(): GradePeriodConfig[] {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Error reading gradePeriodConfig.json:", err);
  }
  return DEFAULT_CONFIGS;
}

export function saveGradePeriodConfigs(configs: GradePeriodConfig[]): boolean {
  try {
    ensureDirectoryExists(CONFIG_FILE);
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(configs, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error saving gradePeriodConfig.json:", err);
    return false;
  }
}

export function upsertGradePeriodConfig(item: Omit<GradePeriodConfig, "id" | "updatedAt"> & { id?: string }): GradePeriodConfig {
  const configs = getGradePeriodConfigs();
  const id = item.id || `cfg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const existingIdx = configs.findIndex(c => 
    c.id === id || 
    (c.level === item.level && c.academicYear === item.academicYear && c.term === item.term)
  );

  const updatedItem: GradePeriodConfig = {
    id: existingIdx >= 0 ? configs[existingIdx].id : id,
    level: item.level,
    academicYear: item.academicYear,
    term: item.term,
    startDate: item.startDate,
    endDate: item.endDate,
    graceDays: Number(item.graceDays) >= 0 ? Number(item.graceDays) : 7,
    isBlocking: item.isBlocking !== false,
    updatedAt: now
  };

  if (existingIdx >= 0) {
    configs[existingIdx] = updatedItem;
  } else {
    configs.push(updatedItem);
  }

  saveGradePeriodConfigs(configs);
  return updatedItem;
}

export function deleteGradePeriodConfig(id: string): boolean {
  const configs = getGradePeriodConfigs();
  const filtered = configs.filter(c => c.id !== id);
  if (filtered.length !== configs.length) {
    saveGradePeriodConfigs(filtered);
    return true;
  }
  return false;
}

/**
 * ค้นหาช่วงเวลาส่งเกรดที่ตรงกับชั้นปี เทอม และปีการศึกษาที่สุด
 * (จับคู่ level ตรงก่อน ถ้าไม่พบจะ fallback ไปใช้ "ALL")
 */
export function findApplicableGradePeriod(
  level: string | null | undefined,
  academicYear: string,
  term: string
): GradePeriodConfig | null {
  const configs = getGradePeriodConfigs();
  
  // 1. หาตรงกับ level
  if (level) {
    const directMatch = configs.find(
      c => c.level === level && c.academicYear === academicYear && c.term === term
    );
    if (directMatch) return directMatch;
  }

  // 2. Fallback: หาที่ระบุว่า "ALL"
  const allMatch = configs.find(
    c => (c.level === "ALL" || !c.level) && c.academicYear === academicYear && c.term === term
  );
  if (allMatch) return allMatch;

  // 3. Fallback ทั่วไป
  return configs.find(c => c.level === "ALL") || configs[0] || null;
}

export interface StudentGradeCheckResult {
  hasSubmitted: boolean;
  isApproved: boolean;
  status: "OK" | "WARNING" | "SUSPENDED" | "EXEMPT";
  isSuspended: boolean;
  reason?: string;
  config: GradePeriodConfig | null;
  daysOverdue: number;
  graceDaysRemaining: number;
}

/**
 * ตรวจสอบสถานะการส่งใบเกรดของนักเรียน
 * เพื่อประเมินว่าอยู่ในช่วงส่ง / เลยกำหนด / อยู่ในช่วงผ่อนผัน / หรือถูกระงับสิทธิ์เช็คชื่อ
 */
export async function checkStudentGradeSubmissionStatus(
  studentId: string,
  academicYear: string = "2569",
  term: string = "1"
): Promise<StudentGradeCheckResult> {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, level: true, canSubmitGrades: true }
  });

  if (!student) {
    return {
      hasSubmitted: false,
      isApproved: false,
      status: "OK",
      isSuspended: false,
      config: null,
      daysOverdue: 0,
      graceDaysRemaining: 0
    };
  }

  // หากอาจารย์/หัวหน้าแผนกปลดล็อกเป็นรายบุคคล (canSubmitGrades หรือพิเศษ)
  const isExempt = student.canSubmitGrades === true;

  // ตรวจสอบใบเกรดในฐานข้อมูล
  const submission = await (prisma as any).gradeSubmission.findUnique({
    where: {
      studentId_academicYear_term: {
        studentId,
        academicYear,
        term
      }
    }
  });

  const isApproved = submission?.status === "APPROVED";
  const hasSubmitted = submission?.status === "SUBMITTED" || isApproved;

  // หากอนุมัติแล้ว หรือส่งแล้วรอตรวจ -> ถือว่าผ่านเกณฑ์ ไม่ระงับสิทธิ์
  if (hasSubmitted) {
    return {
      hasSubmitted: true,
      isApproved,
      status: "OK",
      isSuspended: false,
      config: null,
      daysOverdue: 0,
      graceDaysRemaining: 0
    };
  }

  // หาช่วงเวลาที่กำหนดสำหรับชั้นปีนี้
  const config = findApplicableGradePeriod(student.level, academicYear, term);
  if (!config) {
    return {
      hasSubmitted: false,
      isApproved: false,
      status: isExempt ? "EXEMPT" : "OK",
      isSuspended: false,
      config: null,
      daysOverdue: 0,
      graceDaysRemaining: 0
    };
  }

  const now = new Date();
  const endDate = new Date(config.endDate + "T23:59:59");
  const graceDays = config.graceDays || 7;
  const suspensionDate = new Date(endDate.getTime() + graceDays * 24 * 60 * 60 * 1000);

  // คำนวณวัน
  const isOverdue = now > endDate;
  const isPastGracePeriod = now > suspensionDate;

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysOverdue = isOverdue ? Math.floor((now.getTime() - endDate.getTime()) / msPerDay) : 0;
  const graceDaysRemaining = isPastGracePeriod ? 0 : Math.max(0, Math.ceil((suspensionDate.getTime() - now.getTime()) / msPerDay));

  if (isExempt) {
    return {
      hasSubmitted: false,
      isApproved: false,
      status: "EXEMPT",
      isSuspended: false,
      reason: "อาจารย์ประจำชั้นหรือหัวหน้าแผนกได้ปลดล็อกผ่อนผันให้เป็นกรณีพิเศษ",
      config,
      daysOverdue,
      graceDaysRemaining
    };
  }

  if (isPastGracePeriod && config.isBlocking) {
    return {
      hasSubmitted: false,
      isApproved: false,
      status: "SUSPENDED",
      isSuspended: true,
      reason: `ระงับสิทธิ์เช็คชื่อเข้าเรียนชั่วคราว: เลยกำหนดส่งใบรายงานผลการศึกษา (สิ้นสุดเมื่อ ${config.endDate} และพ้นระยะผ่อนผัน ${graceDays} วันแล้ว) กรุณาอัปโหลดใบเกรดเพื่อดำเนินการต่อ`,
      config,
      daysOverdue,
      graceDaysRemaining: 0
    };
  }

  if (isOverdue) {
    return {
      hasSubmitted: false,
      isApproved: false,
      status: "WARNING",
      isSuspended: false,
      reason: `เลยกำหนดส่งใบเกรดแล้ว (${config.endDate}) ขณะนี้อยู่ในระยะผ่อนผัน คงเหลืออีก ${graceDaysRemaining} วัน ก่อนระบบจะระงับสิทธิ์เช็คชื่อ`,
      config,
      daysOverdue,
      graceDaysRemaining
    };
  }

  return {
    hasSubmitted: false,
    isApproved: false,
    status: "OK",
    isSuspended: false,
    config,
    daysOverdue: 0,
    graceDaysRemaining
  };
}
