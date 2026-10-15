// Direct import to bypass pdf-parse root index test file check during Next.js server bundle
const pdf = require("pdf-parse/lib/pdf-parse.js");

export interface ExtractedSubjectGrade {
  code: string;
  name: string;
  creditPattern: string; // e.g. "1-2-2"
  credits: number;       // e.g. 2
  grade: string;         // e.g. "3.5" or "ผ."
  gradeValue: number | null; // e.g. 3.5 or null for activities
}

export interface ParseGradePdfResult {
  success: boolean;
  error?: string;
  collegeName?: string;
  studentId?: string;
  studentName?: string;
  groupCode?: string;
  groupName?: string;
  level?: string;
  studyType?: string;
  term?: string;
  academicYear?: string;
  gpa?: number;
  gpax?: number;
  termCredits?: number;
  cumulativeCredits?: number;
  subjects: ExtractedSubjectGrade[];
  rawText?: string;
}

/**
 * ฟังก์ชันอ่านและสกัดข้อมูลเกรดจากไฟล์ PDF ทางการ (ศธ.02 / RMS)
 * พร้อมระบบตรวจสอบรหัสนักเรียนเพื่อป้องกันการนำใบเกรดของผู้อื่นมาอัปโหลด
 */
export async function parseGradePdf(
  buffer: Buffer,
  expectedStudentUsername?: string,
  expectedStudentName?: string
): Promise<ParseGradePdfResult> {
  try {
    const data = await pdf(buffer);
    const rawText = data.text || "";

    if (!rawText || rawText.trim().length < 50) {
      return {
        success: false,
        error: "ไม่พบข้อความดิจิทัลในเอกสาร (อาจเป็นไฟล์ภาพถ่ายหรือเอกสารสแกน) กรุณาใช้ไฟล์ PDF ดั้งเดิมที่ดาวน์โหลดจากระบบ ศธ.02/RMS โดยตรง",
        subjects: [],
      };
    }

    // 1. ตรวจสอบหัวเอกสารว่าเป็นรายงานผลการศึกษาจริงหรือไม่
    const hasHeader =
      rawText.includes("รายงานผลการศึกษา") ||
      rawText.includes("ใบรายงานผลการเรียน") ||
      rawText.includes("วิทยาลัย") ||
      rawText.includes("ผลการเรียน");

    if (!hasHeader) {
      return {
        success: false,
        error: "รูปแบบเอกสารไม่ถูกต้อง กรุณาอัปโหลดเอกสาร 'รายงานผลการศึกษา' จากระบบทะเบียน ศธ.02/RMS เท่านั้น",
        subjects: [],
        rawText,
      };
    }

    // 2. ดึงข้อมูลนักศึกษา
    const studentIdMatch = rawText.match(/รหัสนักศึกษา\s*[:：]?\s*([0-9A-Za-z]+)/i) ||
                           rawText.match(/รหัสประจำตัว\s*[:：]?\s*([0-9A-Za-z]+)/i);
    const extractedStudentId = studentIdMatch ? studentIdMatch[1].trim() : undefined;

    const studentNameMatch = rawText.match(/ชื่อ\s*[-–—]?\s*สกุล\s*[:：]?\s*([^\n\r]+)/);
    const extractedStudentName = studentNameMatch ? studentNameMatch[1].replace(/\s+/g, ' ').trim() : undefined;

    // 3. ตรวจสอบความถูกต้องของบุคคล (Security Check)
    if (expectedStudentUsername && extractedStudentId) {
      const cleanExpected = expectedStudentUsername.replace(/[^0-9A-Za-z]/g, '').toLowerCase();
      const cleanExtracted = extractedStudentId.replace(/[^0-9A-Za-z]/g, '').toLowerCase();

      if (cleanExpected !== cleanExtracted) {
        return {
          success: false,
          error: `เอกสารนี้ไม่ใช่ของคุณ! รหัสนักศึกษาในเอกสาร (${extractedStudentId}) ไม่ตรงกับรหัสประจำตัวของคุณ (${expectedStudentUsername}) ป้องกันการนำใบเกรดของผู้อื่นมาส่ง`,
          studentId: extractedStudentId,
          studentName: extractedStudentName,
          subjects: [],
          rawText,
        };
      }
    }

    // 4. ดึงภาคเรียนและปีการศึกษา เช่น "ภาคเรียนที่ 1/2569"
    const termMatch = rawText.match(/ภาคเรียนที่\s*([1-3])\s*[/／]\s*(\d{4})/);
    const term = termMatch ? termMatch[1] : undefined;
    const academicYear = termMatch ? termMatch[2] : undefined;

    // 5. ดึงชั้นปี และ กลุ่มเรียน
    const levelMatch = rawText.match(/ชั้นปี\s*[:：]?\s*([^\n\r]+)/);
    const level = levelMatch ? levelMatch[1].trim() : undefined;

    const groupMatch = rawText.match(/กลุ่มเรียน\s*[:：]?\s*([^\n\r]+)/);
    const groupName = groupMatch ? groupMatch[1].trim() : undefined;

    const groupCodeMatch = rawText.match(/รหัสกลุ่มเรียน\s*[:：]?\s*([0-9A-Za-z]+)/);
    const groupCode = groupCodeMatch ? groupCodeMatch[1].trim() : undefined;

    // 6. ดึงเกรดเฉลี่ย GPA และ GPAX
    const gpaMatch = rawText.match(/เกรดเฉลี่ยประจำภาค\s*[:：]?\s*([0-4](?:\.\d+)?)/);
    const gpa = gpaMatch ? parseFloat(gpaMatch[1]) : undefined;

    const gpaxMatch = rawText.match(/เกรดเฉลี่ยสะสม\s*[:：]?\s*([0-4](?:\.\d+)?)/);
    const gpax = gpaxMatch ? parseFloat(gpaxMatch[1]) : undefined;

    const termCreditsMatch = rawText.match(/หน่วยกิตประจำภาค\s*[:：]?\s*(\d+(?:\.\d+)?)/);
    const termCredits = termCreditsMatch ? parseFloat(termCreditsMatch[1]) : undefined;

    const cumulativeCreditsMatch = rawText.match(/หน่วยกิตสะสม\s*[:：]?\s*(\d+(?:\.\d+)?)/);
    const cumulativeCredits = cumulativeCreditsMatch ? parseFloat(cumulativeCreditsMatch[1]) : undefined;

    // 7. ดึงรายวิชาและเกรดทีละบรรทัด
    // ตัวอย่างแถว: "30000-1101 ทักษะภาษาไทยเพื่อการสื่อสารในงานอาชีพ 1-2-2 3.5"
    // "30000-2001 กิจกรรมเสริมสร้างสุจริต จิตอาสา 0-2-0 ผ."
    const subjects: ExtractedSubjectGrade[] = [];
    const lines = rawText.split(/\r?\n/);

    // Regular Expression สำหรับแถวรายวิชาอาชีวศึกษา
    // กลุ่ม 1: รหัสวิชา เช่น 30000-1101 หรือ 20100-1001 หรือ 30109-2007
    // กลุ่ม 2: ชื่อวิชา
    // กลุ่ม 3: รูปแบบหน่วยกิต ท-ป-น เช่น 1-2-2
    // กลุ่ม 4: หน่วยกิตตัวสุดท้าย
    // กลุ่ม 5: เกรด เช่น 4.0, 3.5, 3.0, 2.5, 2.0, 1.5, 1.0, 0, ผ., มผ., ขร., มส.
    const subjectRowRegex = /(\b\d{5}-\d{4}\b)\s+(.+?)\s+(\d+-\d+-(\d+(?:\.\d+)?))\s+([0-4](?:\.[05])?|ผ\.|มผ\.|ขร\.|มส\.|W|I)\b/i;

    for (const line of lines) {
      const trimmed = line.trim();
      const match = trimmed.match(subjectRowRegex);
      if (match) {
        const code = match[1].trim();
        const name = match[2].trim();
        const creditPattern = match[3].trim();
        const credits = parseFloat(match[4]);
        const gradeStr = match[5].trim();
        const numVal = parseFloat(gradeStr);
        const gradeValue = !isNaN(numVal) ? numVal : null;

        // ป้องกันวิชาซ้ำ
        if (!subjects.some(s => s.code === code)) {
          subjects.push({
            code,
            name,
            creditPattern,
            credits,
            grade: gradeStr,
            gradeValue,
          });
        }
      }
    }

    if (subjects.length === 0) {
      // Fallback: หากบรรทัดไม่ติดกัน ให้ลองค้นหาแบบ multi-token
      const fallbackRegex = /(\b\d{5}-\d{4}\b)/g;
      let m;
      while ((m = fallbackRegex.exec(rawText)) !== null) {
        const code = m[1];
        const snippet = rawText.substring(m.index, m.index + 150).replace(/\r?\n/g, ' ');
        const subMatch = snippet.match(/(\b\d{5}-\d{4}\b)\s+(.+?)\s+(\d+-\d+-(\d+(?:\.\d+)?))\s+([0-4](?:\.[05])?|ผ\.|มผ\.|ขร\.|มส\.|W|I)\b/i);
        if (subMatch && !subjects.some(s => s.code === code)) {
          const numVal = parseFloat(subMatch[5]);
          subjects.push({
            code: subMatch[1],
            name: subMatch[2].trim(),
            creditPattern: subMatch[3],
            credits: parseFloat(subMatch[4]),
            grade: subMatch[5],
            gradeValue: !isNaN(numVal) ? numVal : null,
          });
        }
      }
    }

    return {
      success: true,
      collegeName: "วิทยาลัยเทคนิคแพร่",
      studentId: extractedStudentId,
      studentName: extractedStudentName,
      groupCode,
      groupName,
      level,
      term: term || "1",
      academicYear: academicYear || "2569",
      gpa,
      gpax,
      termCredits,
      cumulativeCredits,
      subjects,
      rawText,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `เกิดข้อผิดพลาดในการอ่านไฟล์ PDF: ${err.message || err}`,
      subjects: [],
    };
  }
}
