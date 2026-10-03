export type AttendanceStatus = 'present' | 'late' | 'absent' | 'leave';
export type AttendanceType = 'class' | 'assembly';

export interface MockStudent {
  id: string;
  name: string;
  studentId: string;
  level: string; // เพิ่มระดับชั้นเพื่อแยกกลุ่มนักเรียน
}

export interface MockSubject {
  id: string;
  code: string;
  name: string;
  level: string;
  teacherName: string; // อาจารย์ผู้สอน
}

export interface MockAttendance {
  id: string;
  studentId: string;
  subjectId: string | null;
  type: AttendanceType;
  status: string;
  timestamp: string; // ISO string Date
}

// 1. จำลองข้อมูลวิชาเรียน ตามรูปภาพของ อ.ทวี
export const mockSubjects: MockSubject[] = [
  // ระดับชั้น: ปวช.1
  { id: 'sub_20100_1010', code: '20100-1010', name: 'การสำรวจเบื้องต้น', level: 'ปวช.1', teacherName: 'อ.ทวี' },
  { id: 'sub_20100_1009', code: '20100-1009', name: 'เขียนแบบเบื้องต้น', level: 'ปวช.1', teacherName: 'อ.ทวี' },
  // ระดับชั้น: ปวช.2
  { id: 'sub_20001_1004', code: '20001-1004', name: 'กฎหมายแรงงาน', level: 'ปวช.2', teacherName: 'อ.ทวี' },
  { id: 'sub_20109_2004', code: '20109-2004', name: 'วงรอบระดับและงานดิน', level: 'ปวช.2', teacherName: 'อ.ทวี' },
  { id: 'sub_20109_2002', code: '20109-2002', name: 'วงรอบสำรวจ', level: 'ปวช.2', teacherName: 'อ.ทวี' },
  // ระดับชั้น: ปวส.1
  { id: 'sub_30109_2014', code: '30109-2014', name: 'การประเมินราคาสังหาริมทรัพย์', level: 'ปวส.1', teacherName: 'อ.ทวี' },
  { id: 'sub_30000_2001', code: '30000-2001', name: 'กิจกรรมเสริมสร้างสุจริต จิตอาสา', level: 'ปวส.1', teacherName: 'อ.ทวี' },
];

// 2. จำลองข้อมูลนักเรียน ระดับชั้นละ 25 คน
const firstNames = ['สมชาย', 'สมหญิง', 'ชูใจ', 'มานี', 'ปิติ', 'วีระ', 'เพชร', 'กล้า', 'เอก', 'ดนัย', 'วิชัย', 'สุชาติ', 'นพพล', 'ธิดา', 'รัตนา', 'วิไล', 'สุนีย์', 'กมล', 'อารีย์', 'นารี', 'สมร', 'สุดา', 'วิภา', 'อรทัย', 'มารุต'];
const lastNames = ['เรียนดี', 'ตั้งใจ', 'ใฝ่รู้', 'มีนา', 'ขี่ม้า', 'รักเรียน', 'ขยันยิ่ง', 'อดทน', 'มั่นคง', 'ใจดี', 'มีสุข', 'รุ่งเรือง', 'สว่างวงษ์', 'เจริญทรัพย์', 'กล้าหาญ'];

const generateStudents = (level: string, startId: number): MockStudent[] => {
  const students: MockStudent[] = [];
  for (let i = 0; i < 25; i++) {
    const fName = firstNames[i % firstNames.length]; // สลับชื่อ
    const lName = lastNames[i % lastNames.length];   // สลับนามสกุล
    const runNo = (startId + i).toString().padStart(3, '0');
    students.push({
      id: `st_${level}_${runNo}`,
      name: `${fName} ${lName}`,
      studentId: `66${startId.toString().substring(0, 1)}${runNo}`,
      level: level
    });
  }
  return students;
};

export const mockStudents: MockStudent[] = [
  ...generateStudents('ปวช.1', 100), // สร้าง 25 คนสำหรับ ปวช.1
  ...generateStudents('ปวช.2', 200), // สร้าง 25 คนสำหรับ ปวช.2
  ...generateStudents('ปวส.1', 300), // สร้าง 25 คนสำหรับ ปวส.1
];

// 3. ฟังก์ชันสุ่มสถานะการเข้าเรียน
const getRandomStatus = (): AttendanceStatus => {
  const rand = Math.random();
  if (rand < 0.85) return 'present'; // 85% มาเรียน
  if (rand < 0.92) return 'late';    // 7% มาสาย
  if (rand < 0.96) return 'leave';   // 4% ลา
  return 'absent';                   // 4% ขาด
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

    // A. เช็คชื่อเข้าแถวหน้าเสาธงตอนเช้า (Assembly) ของทุกคน
    mockStudents.forEach(student => {
      const assemblyTime = new Date(currentDate);
      assemblyTime.setHours(8, 0, 0, 0); // 08:00 น.

      data.push({
        id: `mock_att_${attendanceIdCounter++}`,
        studentId: student.id,
        subjectId: null,
        type: 'assembly',
        status: getRandomStatus(),
        timestamp: assemblyTime.toISOString(),
      });
    });

    // B. เช็คชื่อเข้าเรียนรายวิชา (Class) แยกตามระดับชั้น
    const levels = ['ปวช.1', 'ปวช.2', 'ปวส.1'];
    
    levels.forEach(level => {
      const levelSubjects = mockSubjects.filter(s => s.level === level);
      const levelStudents = mockStudents.filter(s => s.level === level);
      
      // จำลองให้แต่ละระดับชั้นเรียน 1 วิชาในแต่ละวัน (หมุนเวียนวิชาตามวัน)
      if (levelSubjects.length > 0) {
        const subjectToday = levelSubjects[currentDate.getDay() % levelSubjects.length];
        
        levelStudents.forEach(student => {
          const classTime = new Date(currentDate);
          classTime.setHours(9, 0, 0, 0); // สมมติเริ่มเรียน 09:00 น.

          data.push({
            id: `mock_att_${attendanceIdCounter++}`,
            studentId: student.id,
            subjectId: subjectToday.id,
            type: 'class',
            status: getRandomStatus(),
            timestamp: classTime.toISOString(),
          });
        });
      }
    });
  }

  return data;
};

// 5. ตัวแปรเก็บข้อมูลจำลองพร้อมใช้งาน
export const mockTermAttendanceData = generateMockAttendance();
