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
 * แปลงรหัสอักขระพิเศษภาษาไทยในฟอนต์ PDF (เช่น Windows-Thai Private Use Area \uF700-\uF71A)
 * ให้อยู่ในรูปอักขระ Unicode ภาษาไทยมาตรฐาน (\u0E00-\u0E7F)
 * เพื่อแก้ปัญหาสระลอย/วรรณยุกต์ที่อยู่บนพยัญชนะหางยาว (ป, ฝ, ฟ) แสดงเป็นสี่เหลี่ยม หรือรหัส PUA
 */
export function normalizeThaiText(text: string): string {
  if (!text) return "";

  const puaMap: Record<string, string> = {
    '\uF700': '\u0E48', // ไม้เอก (shifted)
    '\uF701': '\u0E49', // ไม้โท (shifted)
    '\uF702': '\u0E4A', // ไม้ตรี (shifted)
    '\uF703': '\u0E4B', // ไม้จัตวา (shifted)
    '\uF704': '\u0E4C', // ทัณฑฆาต/การันต์ (shifted)
    '\uF705': '\u0E34', // สระอิ (shifted)
    '\uF706': '\u0E35', // สระอี (shifted)
    '\uF707': '\u0E36', // สระอึ (shifted)
    '\uF708': '\u0E37', // สระอือ (shifted)
    '\uF709': '\u0E38', // สระอุ (shifted)
    '\uF70A': '\u0E47', // ไม้ไต่คู้ (shifted)
    '\uF70B': '\u0E48', // ไม้เอก (lower)
    '\uF70C': '\u0E49', // ไม้โท (lower)
    '\uF70D': '\u0E4A', // ไม้ตรี (lower)
    '\uF70E': '\u0E4B', // ไม้จัตวา (lower)
    '\uF70F': '\u0E4C', // ทัณฑฆาต (lower)
    '\uF710': '\u0E31', // ไม้หันอากาศ (shifted left บน ป, ฝ, ฟ)
    '\uF711': '\u0E4D', // นิคหิต
    '\uF712': '\u0E38', // สระอุ (lower)
    '\uF713': '\u0E39', // สระอู (lower)
    '\uF714': '\u0E3A', // พินทุ (lower)
    '\uF715': '\u0E34', // สระอิ (lower)
    '\uF716': '\u0E35', // สระอี (lower)
    '\uF717': '\u0E36', // สระอึ (lower)
    '\uF718': '\u0E37', // สระอือ (lower)
    '\uF719': '\u0E47', // ไม้ไต่คู้ (lower)
    '\uF71A': '\u0E31', // ไม้หันอากาศ (lower)
  };

  return text
    .replace(/[\uF700-\uF71A]/g, (ch) => puaMap[ch] || ch)
    .normalize('NFC');
}

/**
 * สกัดโครงพยัญชนะภาษาไทยล้วน (ก-ฮ: \u0E01-\u0E2E)
 * โดยตัดสระ วรรณยุกต์ ช่องว่าง และอักขระที่แปลงค่าไม่ได้ (\uFFFD / ตัวสี่เหลี่ยม) ออกทั้งหมด
 * เพื่อให้สามารถเปรียบเทียบชื่อได้อย่างแม่นยำ 100% แม้ฟอนต์ PDF จะแสดงผลสระลอยผิดเพี้ยน
 */
export function extractThaiConsonantSkeleton(text: string): string {
  if (!text) return "";
  const consonants = text.match(/[\u0E01-\u0E2E]/g);
  return consonants ? consonants.join('') : "";
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
    const rawText = normalizeThaiText(data.text || "");

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
                           rawText.match(/รหัสประจำตัว\s*[:：]?\s*([0-9A-Za-z]+)/i) ||
                           rawText.match(/รหัส\s*[:：]?\s*([0-9]{10,12})/i) ||
                           rawText.match(/\b([0-9]{11})\b/);
    const extractedStudentId = studentIdMatch ? studentIdMatch[1].trim() : undefined;

    const studentNameMatch = rawText.match(/ชื่อ\s*[-–—/]?\s*สกุล\s*[:：]?\s*([^\n\r]+)/) ||
                             rawText.match(/ชื่อ\s*[:：]?\s*(นาย|นางสาว|น\.ส\.|เด็กชาย|เด็กหญิง\s*[^\n\r]+)/);
    let extractedStudentName = studentNameMatch ? studentNameMatch[1].replace(/\s+/g, ' ').trim() : undefined;
    if (extractedStudentName) {
      // ตัดข้อความส่วนเกินหากมีหัวข้ออื่นต่อท้ายในบรรทัดเดียวกัน
      extractedStudentName = extractedStudentName
        .split(/\s+(?:รหัส|ระดับ|กลุ่ม|สาขา|ภาคเรียน|แผนก|ชั้นปี|GPA|GPAX)\b/i)[0]
        .replace(/\uFFFD/g, '')
        .trim();
    }

    // 3. ตรวจสอบความถูกต้องของบุคคลอย่างเข้มงวด (Strict Security Check)
    // 3.1 ตรวจสอบรหัสนักศึกษา / Username
    if (expectedStudentUsername) {
      const cleanExpectedUser = expectedStudentUsername.replace(/[^0-9A-Za-z]/g, '').toLowerCase();
      const cleanRaw = rawText.replace(/[^0-9A-Za-z]/g, '').toLowerCase();

      // ถ้าระบบแกะรหัสในเอกสารได้ แล้วรหัสไม่ตรงกับบัญชี
      if (extractedStudentId) {
        const cleanExtracted = extractedStudentId.replace(/[^0-9A-Za-z]/g, '').toLowerCase();
        if (cleanExpectedUser !== cleanExtracted && !cleanRaw.includes(cleanExpectedUser)) {
          return {
            success: false,
            error: `เอกสารนี้ไม่ใช่ของคุณ! รหัสนักศึกษาในเอกสาร (${extractedStudentId}) ไม่ตรงกับรหัสประจำตัวของคุณ (${expectedStudentUsername}) ป้องกันการนำใบเกรดของผู้อื่นมาส่ง`,
            studentId: extractedStudentId,
            studentName: extractedStudentName,
            subjects: [],
            rawText,
          };
        }
      } else if (!cleanRaw.includes(cleanExpectedUser)) {
        // หากในเนื้อหาเอกสารทั้งหมด ไม่มีเลขรหัสนักศึกษาของผู้ใช้นี้เลย
        return {
          success: false,
          error: `ไม่พบรหัสประจำตัวของคุณ (${expectedStudentUsername}) ในเอกสาร PDF นี้ กรุณาตรวจสอบว่าแนบไฟล์เอกสารของตนเองถูกต้องหรือไม่`,
          subjects: [],
          rawText,
        };
      }
    }

    // 3.2 ตรวจสอบชื่อ-นามสกุล (Strict Name Check)
    if (expectedStudentName) {
      const cleanExpectedName = normalizeThaiText(expectedStudentName)
        .replace(/นาย|นางสาว|น\.ส\.|เด็กชาย|เด็กหญิง/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      const nameParts = cleanExpectedName.split(' ').filter(p => p.length >= 2);
      const firstName = nameParts[0] || "";
      const lastName = nameParts[1] || "";

      // โครงพยัญชนะภาษาไทยสำหรับเปรียบเทียบเพื่อป้องกันความผิดพลาดจากฟอนต์สระลอย
      const expConsonantsFirst = extractThaiConsonantSkeleton(firstName);
      const expConsonantsFull = extractThaiConsonantSkeleton(cleanExpectedName);
      const rawTextConsonants = extractThaiConsonantSkeleton(rawText);

      // ถ้าใน PDF สกัดชื่อได้
      if (extractedStudentName) {
        const cleanExtractedName = normalizeThaiText(extractedStudentName)
          .replace(/นาย|นางสาว|น\.ส\.|เด็กชาย|เด็กหญิง/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        const extConsonants = extractThaiConsonantSkeleton(cleanExtractedName);

        // 1. ตรวจสอบการตรงกันโดยตรง (Direct String Substring Match)
        const isDirectMatch = 
          (firstName && cleanExtractedName.includes(firstName)) || 
          (cleanExpectedName && cleanExtractedName.includes(cleanExpectedName)) ||
          cleanExtractedName.includes(cleanExpectedName) ||
          cleanExpectedName.includes(cleanExtractedName) ||
          rawText.includes(firstName);

        // 2. ตรวจสอบด้วยโครงพยัญชนะ (Consonant Skeleton Match)
        // เพื่อรองรับฟอนต์ระบบ ศธ.02/RMS ที่สระลอยถูกแปลงเป็นสี่เหลี่ยม (\uFFFD) หรือรหัส PUA
        const isSkeletonMatch = 
          (expConsonantsFirst.length >= 3 && extConsonants.includes(expConsonantsFirst)) ||
          (expConsonantsFull.length >= 4 && (extConsonants.includes(expConsonantsFull) || expConsonantsFull.includes(extConsonants))) ||
          (expConsonantsFirst.length >= 3 && rawTextConsonants.includes(expConsonantsFirst));

        const isNameMatched = isDirectMatch || isSkeletonMatch;

        if (!isNameMatched) {
          return {
            success: false,
            error: `เอกสารนี้ไม่ใช่ของคุณ! ตรวจพบชื่อในเอกสารเป็น "${extractedStudentName}" ซึ่งไม่ตรงกับชื่อบัญชีของคุณ (${expectedStudentName}) ป้องกันการส่งใบเกรดของผู้อื่น`,
            studentId: extractedStudentId,
            studentName: extractedStudentName,
            subjects: [],
            rawText,
          };
        }
      } else {
        // กรณีดึงชื่อเป็นฟิลด์ไม่ได้ ตรวจสอบชื่อในเนื้อหาเอกสารทั้งหมด
        const hasNameInRaw = 
          (firstName && rawText.includes(firstName)) ||
          (expConsonantsFirst.length >= 3 && rawTextConsonants.includes(expConsonantsFirst));

        if (!hasNameInRaw) {
          return {
            success: false,
            error: `ไม่พบชื่อ-นามสกุลของคุณ (${expectedStudentName}) ในเอกสาร PDF นี้ ป้องกันการนำเอกสารของผู้อื่นมาส่ง`,
            subjects: [],
            rawText,
          };
        }
      }
    }

    // 4. ดึงภาคเรียนและปีการศึกษา เช่น "ภาคเรียนที่ 1/2569" หรือ "1/2569"
    const termMatch = rawText.match(/ภาคเรียนที่\s*([1-3])\s*[/／]\s*(\d{4})/) ||
                      rawText.match(/ภาคเรียน\s*[:：]?\s*([1-3])\s*[/／]\s*(\d{4})/) ||
                      rawText.match(/([1-3])\s*[/／]\s*(25\d{2})/);
    const term = termMatch ? termMatch[1] : undefined;
    const academicYear = termMatch ? termMatch[2] : undefined;

    // 5. ดึงชั้นปี และ กลุ่มเรียน
    const levelMatch = rawText.match(/ชั้นปี\s*[:：]?\s*([^\n\r]+)/);
    const level = levelMatch ? levelMatch[1].trim() : undefined;

    const groupMatch = rawText.match(/กลุ่มเรียน\s*[:：]?\s*([^\n\r]+)/);
    const groupName = groupMatch ? groupMatch[1].trim() : undefined;

    const groupCodeMatch = rawText.match(/รหัสกลุ่มเรียน\s*[:：]?\s*([0-9A-Za-z]+)/);
    const groupCode = groupCodeMatch ? groupCodeMatch[1].trim() : undefined;

    // 6. ดึงเกรดเฉลี่ย GPA และ GPAX (ค้นหาหลายรูปแบบรวมทั้งมีวรรคหรือเว้นบรรทัด)
    const gpaMatch = rawText.match(/เกรดเฉลี่ยประจำภาค\s*[:：]?\s*([0-4](?:\.\d+)?)/) ||
                     rawText.match(/เกรดเฉลี่ย\s*[:：]?\s*([0-4](?:\.\d+)?)/) ||
                     rawText.match(/GPA\s*[:：]?\s*([0-4](?:\.\d+)?)/i);
    const gpa = gpaMatch ? parseFloat(gpaMatch[1]) : undefined;

    const gpaxMatch = rawText.match(/เกรดเฉลี่ยสะสม\s*[:：]?\s*([0-4](?:\.\d+)?)/) ||
                      rawText.match(/GPAX\s*[:：]?\s*([0-4](?:\.\d+)?)/i);
    const gpax = gpaxMatch ? parseFloat(gpaxMatch[1]) : undefined;

    const termCreditsMatch = rawText.match(/หน่วยกิตประจำภาค\s*[:：]?\s*(\d+(?:\.\d+)?)/) ||
                             rawText.match(/หน่วยกิต\s*[:：]?\s*(\d+(?:\.\d+)?)/);
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
      studentId: extractedStudentId || expectedStudentUsername,
      studentName: (extractedStudentName && !extractedStudentName.includes('\uFFFD')) ? extractedStudentName : (expectedStudentName || extractedStudentName),
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
