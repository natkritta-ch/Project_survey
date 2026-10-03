export type AttendanceStatus = 'present' | 'late' | 'absent' | 'leave';
export type AttendanceType = 'class' | 'assembly';

export interface MockStudent {
  id: string;
  name: string;
  studentId: string;
}

export interface MockSubject {
  id: string;
  code: string;
  name: string;
}

export interface MockAttendance {
  id: string;
  studentId: string;
  subjectId: string | null;
  type: AttendanceType;
  status: string;
  timestamp: string; // ISO string Date
}

// 1. จำลองข้อมูลนักเรียน
export const mockStudents: MockStudent[] = [
  { id: 'st_001', name: 'นายสมชาย เรียนดี', studentId: '66001' },
  { id: 'st_002', name: 'นางสาวสมหญิง ตั้งใจ', studentId: '66002' },
  { id: 'st_003', name: 'นายชูใจ ใฝ่รู้', studentId: '66003' },
  { id: 'st_004', name: 'นางสาวมานี มีนา', studentId: '66004' },
  { id: 'st_005', name: 'นายปิติ ขี่ม้า', studentId: '66005' },
];

// 2. จำลองข้อมูลวิชาเรียน
export const mockSubjects: MockSubject[] = [
  { id: 'sub_001', code: 'MATH101', name: 'คณิตศาสตร์พื้นฐาน' },
  { id: 'sub_002', code: 'SCI101', name: 'วิทยาศาสตร์พื้นฐาน' },
  { id: 'sub_003', code: 'ENG101', name: 'ภาษาอังกฤษเพื่อการสื่อสาร' },
];

// 3. ฟังก์ชันสุ่มสถานะการเข้าเรียน (เน้นมาเรียนปกติเยอะสุด)
const getRandomStatus = (): AttendanceStatus => {
  const rand = Math.random();
  if (rand < 0.80) return 'present'; // 80% มาเรียน
  if (rand < 0.90) return 'late';    // 10% มาสาย
  if (rand < 0.95) return 'leave';   // 5% ลา
  return 'absent';                   // 5% ขาด
};

// 4. ฟังก์ชันสร้างข้อมูลจำลอง 1 เทอม (ประมาณ 16 สัปดาห์)
export const generateMockAttendance = (): MockAttendance[] => {
  const data: MockAttendance[] = [];
  
  // สมมติเปิดเทอม 15 พฤษภาคม 2026
  const startDate = new Date('2026-05-15T08:00:00+07:00');
  const totalDays = 16 * 7; // 16 สัปดาห์
  let attendanceIdCounter = 1;

  for (let day = 0; day < totalDays; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + day);

    // ข้ามวันเสาร์ (6) และอาทิตย์ (0)
    if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      continue;
    }

    // A. เช็คชื่อเข้าแถวหน้าเสาธงตอนเช้า (Assembly)
    mockStudents.forEach(student => {
      const assemblyTime = new Date(currentDate);
      assemblyTime.setHours(8, 0, 0, 0); // 08:00 น.

      data.push({
        id: `mock_att_${attendanceIdCounter++}`,
        studentId: student.id,
        subjectId: null, // เข้าแถวไม่มีรหัสวิชา
        type: 'assembly',
        status: getRandomStatus(),
        timestamp: assemblyTime.toISOString(),
      });
    });

    // B. เช็คชื่อเข้าเรียนรายวิชา (Class)
    // สมมติว่าวันจันทร์-พุธ-ศุกร์ เรียน MATH กับ SCI, อังคาร-พฤหัส เรียน SCI กับ ENG
    const isMWF = currentDate.getDay() === 1 || currentDate.getDay() === 3 || currentDate.getDay() === 5;
    const dailySubjects = isMWF 
      ? [mockSubjects[0], mockSubjects[1]] 
      : [mockSubjects[1], mockSubjects[2]];
    
    dailySubjects.forEach((subject, index) => {
      mockStudents.forEach(student => {
        const classTime = new Date(currentDate);
        // คาบแรก 09:00, คาบสอง 13:00
        const hour = index === 0 ? 9 : 13;
        classTime.setHours(hour, 0, 0, 0);

        data.push({
          id: `mock_att_${attendanceIdCounter++}`,
          studentId: student.id,
          subjectId: subject.id,
          type: 'class',
          status: getRandomStatus(),
          timestamp: classTime.toISOString(),
        });
      });
    });
  }

  return data;
};

// 5. ตัวแปรเก็บข้อมูลจำลองพร้อมใช้งาน
export const mockTermAttendanceData = generateMockAttendance();
