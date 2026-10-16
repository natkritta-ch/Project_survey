"use client";

import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { Camera, RefreshCcw, CheckCircle2, StopCircle, UserPlus, FlipHorizontal, Clock, AlertTriangle, CalendarPlus, X, Sparkles, Search, BookOpen, ChevronDown, ShieldCheck, Eye, Sun } from "lucide-react";
import { showSuccess, showError, showWarning, showInfo, showToast, showConfirm } from "@/lib/alerts";
import { checkFaceQuality, getAverageEAR, getHeadPoseYaw } from "@/lib/faceLiveness";

export default function TeacherScannerClient({ 
  students, 
  subjects,
  initialType,
  initialSubjectId
}: { 
  students: any[], 
  subjects: any[],
  initialType?: "class" | "assembly",
  initialSubjectId?: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceMatcher, setFaceMatcher] = useState<faceapi.FaceMatcher | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(initialSubjectId || "");
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [logs, setLogs] = useState<{ logId: string; id: string; name: string; time: string; manual?: boolean; status?: "saved" | "duplicate"; attendanceId?: string }[]>([]);
  const [scanType, setScanType] = useState<"class"|"assembly">(initialType || "class");
  const [manualStudentId, setManualStudentId] = useState("");
  const [isManualStudentDropdownOpen, setIsManualStudentDropdownOpen] = useState(false);
  const [manualStudentSearch, setManualStudentSearch] = useState("");
  const [assemblyLevel, setAssemblyLevel] = useState("");
  const [cameraFacingMode, setCameraFacingMode] = useState<"user" | "environment">("user");
  const [antiSpoofMode, setAntiSpoofMode] = useState<boolean>(true);
  const livenessTrackerRef = useRef<Map<string, any>>(new Map());

  // State สำหรับวิชาและคลาสสอนชดเชย
  const [subjectsList, setSubjectsList] = useState<any[]>(subjects);
  const [isMakeupModalOpen, setIsMakeupModalOpen] = useState(false);
  const [makeupSubjectId, setMakeupSubjectId] = useState(initialSubjectId || "");
  const [isMakeupSubjectDropdownOpen, setIsMakeupSubjectDropdownOpen] = useState(false);
  const [makeupSubjectSearch, setMakeupSubjectSearch] = useState("");
  const [makeupDate, setMakeupDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [makeupStartTime, setMakeupStartTime] = useState("");
  const [makeupEndTime, setMakeupEndTime] = useState("");
  const [makeupRemark, setMakeupRemark] = useState("");
  const [isSubmittingMakeup, setIsSubmittingMakeup] = useState(false);

  const levelsOptions = ["ปวช.1", "ปวช.2", "ปวช.3", "ปวส.1", "ปวส.2", "ปวส.1(ม.6)", "ปวส.2(ม.6)", "ไม่ระบุ"];

  // ฟังก์ชันคำนวณช่วงเวลาการเรียน (รวมก่อน 30 นาที และ หลัง 30 นาที)
  const getSubjectTimeStatus = (subjectId: string) => {
    if (!subjectId) return null;
    const subj = subjectsList.find(s => s.id === subjectId);
    if (!subj) return null;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentDayOfWeek = now.getDay() === 0 ? 7 : now.getDay();

    const parseMinutes = (str: string) => {
      const [h, m] = str.split(":").map(Number);
      return h * 60 + m;
    };

    const todaySchedules = (subj.schedule || []).filter((sc: any) => sc.dayOfWeek === currentDayOfWeek);
    const todayMakeups = (subj.makeupClasses || []);

    const allSessions = [
      ...todaySchedules.map((sc: any) => ({ ...sc, isMakeup: false })),
      ...todayMakeups.map((mc: any) => ({ ...mc, isMakeup: true }))
    ];

    const BUFFER = 30; // 30 นาที
    const lateThreshold = subj.lateThresholdMin ?? 15;

    let activeSession = null;
    for (const session of allSessions) {
      const startMin = parseMinutes(session.startTime);
      const endMin = parseMinutes(session.endTime);
      const windowStart = startMin - BUFFER;
      const windowEnd = endMin + BUFFER;

      if (currentMinutes >= windowStart && currentMinutes <= windowEnd) {
        activeSession = {
          ...session,
          startMin,
          endMin,
          windowStart,
          windowEnd,
          isLate: currentMinutes > (startMin + lateThreshold),
          lateCutoff: startMin + lateThreshold,
          lateThresholdMin: lateThreshold
        };
        break;
      }
    }

    return {
      subj,
      allSessions,
      activeSession,
      isAllowed: !!activeSession,
      hasSchedulesToday: allSessions.length > 0
    };
  };

  // ฟังก์ชันคำนวณช่วงเวลาเข้าแถวหน้าเสาธง (07:40 - 08:00 น. รวมก่อน-หลัง 30 นาที เป็น 07:10 - 08:30 น.)
  const getAssemblyTimeStatus = () => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const ASSEMBLY_START_MIN = 7 * 60 + 40; // 07:40 น. (460 นาที)
    const ASSEMBLY_END_MIN = 8 * 60;        // 08:00 น. (480 นาที)
    const BUFFER = 30;
    const windowStart = ASSEMBLY_START_MIN - BUFFER; // 07:10 น. (430 นาที)
    const windowEnd = ASSEMBLY_END_MIN + BUFFER;     // 08:30 น. (510 นาที)

    const isAllowed = currentMinutes >= windowStart && currentMinutes <= windowEnd;
    return {
      isAllowed,
      currentMinutes,
      startTime: "07:40",
      endTime: "08:00",
      windowStartStr: "07:10",
      windowEndStr: "08:30",
    };
  };

  const openMakeupModal = (subId?: string) => {
    const targetId = subId || selectedSubject || (subjectsList[0]?.id || "");
    setMakeupSubjectId(targetId);
    setMakeupDate(new Date().toISOString().split("T")[0]);
    
    // ตั้งค่าเวลาเริ่มต้น ณ ปัจจุบัน และสิ้นสุดใน 2 ชั่วโมง
    const now = new Date();
    const startH = String(now.getHours()).padStart(2, '0');
    const startM = String(now.getMinutes()).padStart(2, '0');
    setMakeupStartTime(`${startH}:${startM}`);

    const endH = String((now.getHours() + 2) % 24).padStart(2, '0');
    setMakeupEndTime(`${endH}:${startM}`);
    setMakeupRemark("สอนชดเชย");
    setIsMakeupModalOpen(true);
  };

  const handleCreateMakeup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!makeupSubjectId || !makeupDate || !makeupStartTime || !makeupEndTime) {
      return showWarning("กรุณากรอกข้อมูลให้ครบถ้วน", "โปรดระบุวิชา วันที่ และเวลาสอนชดเชย");
    }

    setIsSubmittingMakeup(true);
    try {
      const res = await fetch('/api/makeup-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: makeupSubjectId,
          date: makeupDate,
          startTime: makeupStartTime,
          endTime: makeupEndTime,
          remark: makeupRemark
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess("สร้างคลาสสอนชดเชยเรียบร้อยแล้ว!", "ระบบเปิดให้สแกนเข้าเรียนได้ทันที");
        // อัปเดต state วิชาในหน้านี้
        setSubjectsList(prev => prev.map(s => {
          if (s.id === makeupSubjectId) {
            return {
              ...s,
              makeupClasses: [
                ...(s.makeupClasses || []),
                {
                  id: data.makeupClass.id,
                  startTime: makeupStartTime,
                  endTime: makeupEndTime,
                  remark: makeupRemark,
                  date: makeupDate
                }
              ]
            };
          }
          return s;
        }));
        setSelectedSubject(makeupSubjectId);
        setIsMakeupModalOpen(false);
      } else {
        showError("เกิดข้อผิดพลาด", data.message || "ไม่สามารถสร้างคลาสชดเชยได้");
      }
    } catch (err: any) {
      showError("เกิดข้อผิดพลาดในการเชื่อมต่อ", err.message);
    } finally {
      setIsSubmittingMakeup(false);
    }
  };

  // Refs สำหรับการจัดเก็บข้อมูลที่ไม่เสี่ยงต่อรอบ Re-render 
  const logsRef = useRef<{ id: string; time: number }[]>([]);

  // 1. โหลดโมเดลแค่ครั้งเดียว
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'), // สแกนจริงใช้ Tiny เพื่อความเร็ว
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);
        setModelsLoaded(true);
      } catch (e) {
        console.error("Error loading Face API models:", e);
      }
    };
    loadModels();
    
    return () => stopCamera();
  }, []);

  // 2. อัปเดต FaceMatcher เมื่อเปลี่ยนตัวกรอง (สำคัญมาก: ช่วยลด False Positive)
  useEffect(() => {
    if (!modelsLoaded || students.length === 0) return;

    let filteredStudents = students;
    
    // โหลดเฉพาะหน้านักเรียนในชั้นปีนั้นๆ เข้าไปใน AI
    if (scanType === "class" && selectedSubject) {
      const sObj = subjects.find(s => s.id === selectedSubject);
      if (sObj && sObj.level) {
        filteredStudents = students.filter(s => s.level === sObj.level);
      }
    } else if (scanType === "assembly" && assemblyLevel) {
      filteredStudents = students.filter(s => s.level === assemblyLevel);
    }

    if (filteredStudents.length > 0) {
      const labeledDescriptors = filteredStudents.map((s) => {
        const descArray = JSON.parse(s.faceDescriptor);
        const descriptor = new Float32Array(descArray);
        return new faceapi.LabeledFaceDescriptors(s.id, [descriptor]);
      });
      // ปรับให้เข้มงวดขึ้นเป็น 0.40 (ต้องเหมือน 60% ขึ้นไปถึงจะผ่าน)
      setFaceMatcher(new faceapi.FaceMatcher(labeledDescriptors, 0.40));
    } else {
      setFaceMatcher(null);
    }
  }, [students, modelsLoaded, scanType, selectedSubject, assemblyLevel, subjects]);

  const startCamera = async () => {
    if (scanType === "class") {
      if (!selectedSubject) {
        return showWarning("กรุณาเลือกวิชา", "โปรดเลือกรายวิชาก่อนเริ่มเปิดกล้องเช็คชื่อ");
      }
      const timeStatus = getSubjectTimeStatus(selectedSubject);
      if (timeStatus && !timeStatus.isAllowed) {
        showWarning(
          "⛔ ไม่อยู่ในช่วงเวลาเรียนของวิชานี้!",
          "ระบบอนุญาตให้เปิดกล้องสแกนได้เฉพาะช่วง ก่อนเริ่มคาบ 30 นาที จนถึง หลังหมดคาบ 30 นาทีเท่านั้น\n\nหากคุณกำลังสอนนอกตาราง กรุณากดปุ่ม 'สร้างคลาสสอนชดเชย' เพื่อเปิดสิทธิ์การสแกน"
        );
        return;
      }
    }
    if (scanType === "assembly") {
      if (!assemblyLevel) {
        return showWarning("กรุณาเลือกชั้นปี", "โปรดเลือกระดับชั้นที่ต้องการเช็คแถวหน้าเสาธง");
      }
      const assemblyStatus = getAssemblyTimeStatus();
      if (!assemblyStatus.isAllowed) {
        showWarning(
          "⛔ ไม่อยู่ในช่วงเวลาเข้าแถวหน้าเสาธง!",
          "เวลาเข้าแถวปกติคือ 07:40 - 08:00 น.\nระบบอนุญาตให้เปิดกล้องสแกนได้เฉพาะช่วงเวลา 07:10 - 08:30 น. (ก่อนเริ่ม 30 นาที ถึงหลังเลิก 30 นาที) เท่านั้น"
        );
        return;
      }
    }
    // เคลียร์ประวัติการเช็คชื่อเมื่อเปิดกล้องเริ่มรอบใหม่
    setLogs([]);
    logsRef.current = [];
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showError("ไม่สามารถเปิดกล้องได้", "เบราว์เซอร์บล็อกการเข้าถึง (ต้องใช้ผ่าน HTTPS หรือ localhost เท่านั้น)");
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: cameraFacingMode } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsScanning(true);
      }
    } catch (e: any) {
      console.error("Camera error:", e);
      showError("ไม่สามารถเปิดกล้องได้", "กรุณาตรวจสอบสิทธิ์การเข้าถึงกล้องในเบราว์เซอร์");
    }
  };

  const stopCamera = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  const toggleCamera = async () => {
    const newMode = cameraFacingMode === "user" ? "environment" : "user";
    setCameraFacingMode(newMode);
    
    // ถ้ากำลังสแกนอยู่ ให้สลับกล้องทันที
    if (isScanning) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: newMode } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (e) {
        console.error("Failed to switch camera:", e);
      }
    }
  };

  const handleEndSession = async () => {
    stopCamera();
    
    // หลังจากปิดกล้อง ให้สอบถามและบันทึก "ขาดเรียน" สำหรับคนที่ยังไม่ถูกบันทึก 
    let sessionUnloggedStudents = students.filter(s => !logs.find(l => l.id === s.id));
    if (scanType === "assembly" && assemblyLevel) {
      sessionUnloggedStudents = sessionUnloggedStudents.filter(s => s.level === assemblyLevel);
    } else if (scanType === "class" && selectedSubject) {
      const sObj = subjects.find(s => s.id === selectedSubject);
      // กรองเฉพาะเด็กที่มีระดับชั้นตรงกับวิชาเท่านั้น ป้องกันการข้ามไปเช็คขาดให้เด็กชั้นอื่น
      if (sObj && sObj.level) {
        sessionUnloggedStudents = sessionUnloggedStudents.filter(s => s.level === sObj.level);
      }
    }
    
    if (sessionUnloggedStudents.length > 0) {
      const confirmAbsent = await showConfirm({
        title: "บันทึกขาดเรียน?",
        text: `คุณต้องการบันทึกสถานะ "ขาดเรียน" ให้นักเรียนที่เหลือจำนวน ${sessionUnloggedStudents.length} คน ใช่หรือไม่?`,
        confirmText: "บันทึกขาดเรียน",
        cancelText: "ยกเลิก",
        isDanger: true,
      });
      if (confirmAbsent) {
        try {
          await fetch('/api/attendance/absent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentIds: sessionUnloggedStudents.map(s => s.id),
              subjectId: scanType === "class" ? selectedSubject : null,
              type: scanType
            })
          });
          showSuccess("บันทึกสถานะขาดเรียนเรียบร้อยแล้ว", `เช็คขาดให้นักเรียนจำนวน ${sessionUnloggedStudents.length} คน`);
        } catch (e) {
          console.error("Failed to mark absentees", e);
          showError("เกิดข้อผิดพลาดในการบันทึกสถานะขาดเรียน");
        }
      }
    }
  };

  const handleCancelSession = async () => {
    stopCamera();
    
    if (logs.length === 0) {
      showInfo("ไม่พบข้อมูล", "ไม่มีประวัติการเช็คชื่อในรอบนี้ที่ต้องยกเลิก");
      return;
    }

    const confirmCancel = await showConfirm({
      title: "ยืนยันยกเลิกและลบประวัติ?",
      text: `คุณแน่ใจหรือไม่ว่าต้องการยกเลิกและลบประวัติการเช็คชื่อที่เพิ่งสแกนติดไปทั้งหมด ${logs.length} คนในรอบนี้?`,
      confirmText: "ยกเลิกการเช็คชื่อ",
      cancelText: "ไม่ยกเลิก",
      isDanger: true,
    });
    if (confirmCancel) {
      const attendanceIds = logs.filter(l => l.attendanceId).map(l => l.attendanceId);
      
      if (attendanceIds.length > 0) {
        try {
          await fetch('/api/attendance/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ attendanceIds })
          });
        } catch (e) {
          console.error("Failed to cancel session", e);
          showError("เกิดข้อผิดพลาดในการยกเลิกประวัติบางส่วน");
        }
      }
      
      // Clear logs state
      setLogs([]);
      logsRef.current = [];
      showSuccess("ยกเลิกการเช็คชื่อเรียบร้อยแล้ว", "ลบประวัติการเช็คชื่อในรอบนี้เรียบร้อยแล้ว");
    }
  };

  const handleVideoPlay = () => {
    if (!videoRef.current || !faceMatcher || !canvasRef.current) return;

    // เตรียม Canvas ให้แมตช์ไซส์กับวิดีโอ
    const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
    faceapi.matchDimensions(canvasRef.current, displaySize);

    intervalRef.current = setInterval(async () => {
      if (videoRef.current && videoRef.current.readyState === 4 && canvasRef.current) {
        // ใช้ TinyFaceDetector แต่ตั้งค่า inputSize ขึ้นนิดหน่อยเพื่อให้แม่นกว่าค่า Default เดิม
        const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
          .withFaceLandmarks()
          .withFaceDescriptors();

        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        canvasRef.current.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        const results = detections.map(d => faceMatcher.findBestMatch(d.descriptor));

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const studentId = result.label;
          let boxLabel = "ไม่รู้จัก";
          let boxColor = "red";

          if (result.label !== "unknown") {
            const now = Date.now();
            const student = students.find(s => s.id === studentId);
            const studentName = student?.name || "ไม่ทราบชื่อ";
            
            let allowedToLog = true;
            let rejectReason = "";

            // 1. ตรวจสอบคุณภาพใบหน้า: ขนาด ระยะห่าง แสงสว่าง และคอนทราสต์ (ส่ง video เพื่ออ่านภาพสดจริง พร้อมใช้เกณฑ์สำหรับโหมดสแกนเนอร์)
            const faceBox = resizedDetections[i].detection.box;
            const quality = checkFaceQuality(
              videoRef.current,
              faceBox,
              displaySize.width,
              displaySize.height,
              { isScanner: true }
            );

            if (antiSpoofMode && !quality.passed) {
              allowedToLog = false;
              rejectReason = quality.overallFeedback;
            } else if (scanType === "assembly" && assemblyLevel) {
              if (student?.level !== assemblyLevel) {
                allowedToLog = false;
                rejectReason = "คนละชั้นปี";
              }
            }

            // 2. ตรวจสอบความมีชีวิตจริง (Anti-Spoofing & Liveness Detection) ป้องกันการเปิดรูปภาพในโทรศัพท์
            let isLiveVerified = false;
            if (allowedToLog && antiSpoofMode) {
              const earData = getAverageEAR(detections[i].landmarks);
              const currentYaw = getHeadPoseYaw(detections[i].landmarks);
              
              let tracker = livenessTrackerRef.current.get(studentId);
              if (!tracker) {
                tracker = {
                  studentId,
                  firstSeen: now,
                  blinkCount: 0,
                  lastEAR: earData.avgEAR,
                  eyeState: "OPEN",
                  challengePassed: false,
                  headInitial: currentYaw,
                  headMoved: false,
                };
                livenessTrackerRef.current.set(studentId, tracker);
              }

              // ตรวจจับจังหวะกะพริบตาจริง (Blink State Machine)
              if (tracker.eyeState === "OPEN" && earData.avgEAR < 0.19) {
                tracker.eyeState = "CLOSED";
              } else if (tracker.eyeState === "CLOSED" && earData.avgEAR > 0.23) {
                tracker.eyeState = "OPEN";
                tracker.blinkCount += 1;
              }
              tracker.lastEAR = earData.avgEAR;

              // ตรวจจับการขยับองศาใบหน้าเล็กน้อย
              if (tracker.headInitial === "FRONT" && (currentYaw === "LEFT" || currentYaw === "RIGHT")) {
                tracker.headMoved = true;
              }

              // เกณฑ์ผ่านคนจริง: มีการกะพริบตาอย่างน้อย 1 ครั้ง หรือหันศีรษะ
              if (tracker.blinkCount >= 1 || tracker.headMoved) {
                tracker.challengePassed = true;
                isLiveVerified = true;
              } else {
                allowedToLog = false;
                rejectReason = "👁️ กรุณากะพริบตา 1 ครั้ง";
              }
            } else if (allowedToLog && !antiSpoofMode) {
              isLiveVerified = true; // โหมดสแกนรวดเร็ว
            }

            if (!allowedToLog) {
              if (rejectReason === "👁️ กรุณากะพริบตา 1 ครั้ง") {
                boxLabel = `${studentName} [${rejectReason}]`;
                boxColor = "#0284c7"; // สีฟ้าแจ้งให้กะพริบตา
              } else {
                boxLabel = `${studentName ? studentName + ": " : ""}${rejectReason}`;
                boxColor = "#f59e0b"; // สีส้มแจ้งเตือนแสงหรือระยะห่าง
              }
            } else {
              const similarity = Math.max(0, 100 - (result.distance * 100)); // แปลง Distance ให้เป็น % ความเหมือน
              boxLabel = antiSpoofMode
                ? `✅ ${studentName} (${Math.round(similarity)}%) [คนจริง]`
                : `${studentName} (${Math.round(similarity)}%)`;
              boxColor = "#10b981"; // วาดกรอบสีเขียวมรกตเมื่อผ่านการยืนยันตัวตนจริง
              
              const recent = logsRef.current.find(l => l.id === studentId);
              // เข้าแถว: block ตลอด session (ไม่มี cooldown หมดอายุ) เพราะมา/ขาด มีแค่ 2 สถานะต่อวัน
              // เข้าเรียน: cooldown 5 นาที เผื่อสแกนได้หลายครั้งในคาบเดียวกัน
              const isExpired = scanType === "assembly" ? false : (!recent || now - recent.time > 300000);
              if (!recent || isExpired) {
                if (recent) recent.time = now;
                else logsRef.current.push({ id: studentId, time: now });
                
                // Fix #4: ใช้ logId unique แทน time string เพื่อป้องกัน race condition
                const logId = `${studentId}-${now}`;

                // Optimistically add to log first, then update status after API
                setLogs(prev => [{ logId, id: studentId, name: studentName, time: new Date().toLocaleTimeString('th-TH'), status: "saved" }, ...prev]);

                try {
                  const res = await fetch('/api/attendance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      studentId, 
                      subjectId: scanType === "class" ? selectedSubject : null,
                      type: scanType
                    })
                  });
                  const data = await res.json();
                  if (data.duplicate) {
                    setLogs(prev => prev.map(l => l.logId === logId ? { ...l, status: "duplicate" } : l));
                  } else if (data.attendance?.id) {
                    setLogs(prev => prev.map(l => l.logId === logId ? { ...l, attendanceId: data.attendance.id } : l));
                  }
                } catch (e) {
                  console.error("Failed to API record");
                }
              }
            }
          }

          const box = resizedDetections[i].detection.box;
          
          let finalBox = box;
          if (cameraFacingMode === "user") {
            // พลิกพิกัด x เพื่อให้กรอบตรงกับวิดีโอที่ถูกสะท้อนกระจก โดยที่ตัวหนังสือไม่กลับด้าน (เฉพาะกล้องหน้า)
            finalBox = {
              x: displaySize.width - box.x - box.width,
              y: box.y,
              width: box.width,
              height: box.height
            } as any;
          }

          const drawBox = new faceapi.draw.DrawBox(finalBox, { label: boxLabel, boxColor: boxColor });
          drawBox.draw(canvasRef.current);
        }
      }
    }, 400); // ✨ ลดเวลาอัปเดตจาก 1500 (1.5 วินาที) เหลือแค่ 400 (0.4 วินาที) ทำให้กรอบเลื่อนตามหน้าได้ลื่นและเร็วขึ้นเยอะมาก 
  };

  const handleManualAdd = async () => {
    if (!manualStudentId) return showWarning("กรุณาเลือกนักเรียน", "โปรดเลือกนักเรียนที่ต้องการเช็คชื่อ");
    if (scanType === "class") {
      if (!selectedSubject) return showWarning("กรุณาเลือกวิชา", "โปรดเลือกรายวิชาก่อนเช็คชื่อ");
      const timeStatus = getSubjectTimeStatus(selectedSubject);
      if (timeStatus && !timeStatus.isAllowed) {
        return showWarning("⛔ ไม่อยู่ในช่วงเวลาเรียน", "ระบบอนุญาตให้เช็คชื่อได้เฉพาะช่วงเวลาเรียนของวิชานี้เท่านั้น");
      }
    } else if (scanType === "assembly") {
      const assemblyStatus = getAssemblyTimeStatus();
      if (!assemblyStatus.isAllowed) {
        return showWarning(
          "⛔ ไม่อยู่ในช่วงเวลาเข้าแถวหน้าเสาธง!",
          "เวลาเข้าแถวปกติคือ 07:40 - 08:00 น.\nระบบอนุญาตให้เช็คชื่อได้เฉพาะช่วงเวลา 07:10 - 08:30 น. เท่านั้น"
        );
      }
    }
    
    const student = students.find(s => s.id === manualStudentId);
    if (!student) return;
    
    const now = Date.now();
    logsRef.current.push({ id: manualStudentId, time: now });
    const manualLogId = `${manualStudentId}-${now}`;
    setLogs(prev => [{ logId: manualLogId, id: manualStudentId, name: student.name, time: new Date().toLocaleTimeString('th-TH'), manual: true }, ...prev]);
    
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          studentId: manualStudentId, 
          subjectId: scanType === "class" ? selectedSubject : null,
          type: scanType
        })
      });
      const data = await res.json();
      if (data.attendance?.id) {
        setLogs(prev => prev.map(l => l.logId === manualLogId ? { ...l, attendanceId: data.attendance.id } : l));
        showToast(`เช็คชื่อ ${student.name} สำเร็จ`, "success");
      }
      setManualStudentId("");
    } catch (e) {
      console.error(e);
      showError("เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  // กรองเมนูรายชื่อนักเรียนเฉพาะคนที่ยังไม่ได้เช็คชื่อ (ไม่ว่าจะจากกล้องหรือมือ)
  let unloggedStudents = students.filter(s => !logs.find(l => l.id === s.id));
  if (scanType === "assembly" && assemblyLevel) {
    unloggedStudents = unloggedStudents.filter(s => s.level === assemblyLevel);
  } else if (scanType === "class" && selectedSubject) {
    const sObj = subjects.find(s => s.id === selectedSubject);
    if (sObj && sObj.level) {
      unloggedStudents = unloggedStudents.filter(s => s.level === sObj.level);
    }
  }

  return (
    <>
      <div className="flex flex-col md:flex-row gap-8">
      {/* Left side: Camera & Manual Form */}
      <div className="flex-1 space-y-6">

        {scanType === "class" && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {initialSubjectId ? "กำลังเช็คชื่อวิชา" : "เลือกวิชาที่จะเช็คชื่อ"}
              </label>
              {initialSubjectId ? (
                <div className="block w-full rounded-md border-gray-300 bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 px-3 py-2.5 border sm:text-sm font-medium shadow-sm">
                  {(() => {
                    const s = subjectsList.find(s => s.id === initialSubjectId);
                    return s ? `[${s.code}] ${s.name} (ชั้นปี: ${s.level || "ไม่ระบุ"})` : "ไม่พบข้อมูลวิชา";
                  })()}
                </div>
              ) : (
                <div className="relative">
                  {isSubjectDropdownOpen && (
                    <div className="fixed inset-0 z-40" onClick={() => setIsSubjectDropdownOpen(false)}></div>
                  )}

                  <div className="relative z-40">
                    <div
                      onClick={() => !isScanning && setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
                      className={`flex items-center justify-between w-full rounded-md border shadow-sm sm:text-sm px-3 py-2 cursor-pointer bg-white dark:bg-gray-900 transition-colors ${
                        isScanning ? 'opacity-60 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : ''
                      } ${
                        isSubjectDropdownOpen 
                          ? 'border-indigo-500 ring-1 ring-indigo-500' 
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className={selectedSubject ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-500'}>
                          {selectedSubject
                            ? (() => {
                                const s = subjectsList.find(x => x.id === selectedSubject);
                                return s ? `[${s.code}] ${s.name} (ชั้นปี: ${s.level || "ไม่ระบุ"})` : "-- กรุณาเลือกวิชา --";
                              })()
                            : "-- กรุณาเลือกวิชา --"}
                        </span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${isSubjectDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>

                    {isSubjectDropdownOpen && !isScanning && (
                      <div className="absolute w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-xl max-h-60 overflow-y-auto z-50 animate-in fade-in zoom-in-95">
                        <div className="p-2 sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 z-10 shadow-sm">
                          <div className="relative">
                            <input
                              type="text"
                              value={subjectSearch}
                              onChange={e => setSubjectSearch(e.target.value)}
                              placeholder="พิมพ์ค้นหารหัส หรือชื่อวิชา..."
                              className="w-full pl-8 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                              autoFocus
                            />
                            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2" />
                          </div>
                        </div>

                        <div className="py-1 divide-y divide-gray-50 dark:divide-gray-700/50">
                          {subjectsList
                            .filter(s => {
                              if (!subjectSearch) return true;
                              const q = subjectSearch.toLowerCase();
                              return s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || (s.level && s.level.toLowerCase().includes(q));
                            })
                            .map(s => (
                              <div
                                key={s.id}
                                onClick={() => {
                                  setSelectedSubject(s.id);
                                  setIsSubjectDropdownOpen(false);
                                  setSubjectSearch("");
                                }}
                                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between ${
                                  selectedSubject === s.id 
                                    ? 'bg-indigo-50 text-indigo-900 border-l-2 border-indigo-500 dark:bg-indigo-900/60 dark:text-indigo-200' 
                                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50 border-l-2 border-transparent'
                                }`}
                              >
                                <div>
                                  <span className="font-semibold text-gray-900 dark:text-white mr-2">[{s.code}]</span>
                                  <span>{s.name}</span>
                                </div>
                                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-1.5 py-0.5 rounded shrink-0">
                                  {s.level || "-"}
                                </span>
                              </div>
                            ))
                          }

                          {subjectsList.filter(s => {
                            if (!subjectSearch) return true;
                            const q = subjectSearch.toLowerCase();
                            return s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || (s.level && s.level.toLowerCase().includes(q));
                          }).length === 0 && (
                            <div className="px-4 py-3 text-sm text-gray-400 italic text-center">
                              ไม่พบวิชาที่ค้นหา
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* แสดงสถานะช่วงเวลาการเรียน พร้อมปุ่มสร้างคลาสสอนชดเชย */}
            {selectedSubject && (() => {
              const timeStatus = getSubjectTimeStatus(selectedSubject);
              if (!timeStatus) return null;

              if (timeStatus.isAllowed && timeStatus.activeSession) {
                const s = timeStatus.activeSession;
                const endWindowH = Math.floor(s.windowEnd / 60).toString().padStart(2, '0');
                const endWindowM = (s.windowEnd % 60).toString().padStart(2, '0');

                return (
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/90 dark:border-emerald-800/60 dark:bg-emerald-950/30 flex flex-col gap-2 animate-in fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <span className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                          อยู่ในช่วงเวลาเรียน ({s.startTime} - {s.endTime} น.)
                        </span>
                        {s.isMakeup && (
                          <span className="text-[11px] font-bold bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 px-2 py-0.5 rounded-full">
                            คลาสสอนชดเชย
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-emerald-700 dark:text-emerald-300">
                        สแกนได้ถึง {endWindowH}:{endWindowM} น. (หลังเลิก 30 น.)
                      </span>
                    </div>

                    <div className="text-xs flex items-center gap-2 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/40">
                      {s.isLate ? (
                        <span className="font-semibold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 rounded">
                          ⚠️ สถานะขณะนี้: มาสาย (LATE) — สแกนหลัง {s.lateCutoff ? `${Math.floor(s.lateCutoff / 60).toString().padStart(2, '0')}:${(s.lateCutoff % 60).toString().padStart(2, '0')}` : ""} น. (เกณฑ์ {s.lateThresholdMin} นาที)
                        </span>
                      ) : (
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded">
                          ✓ สถานะขณะนี้: มาเรียนปกติ (PRESENT)
                        </span>
                      )}
                    </div>
                  </div>
                );
              }

              // ไม่อยู่ในช่วงเวลาเรียน
              return (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/90 dark:border-amber-800/60 dark:bg-amber-950/30 flex flex-col gap-3 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200">
                        ไม่อยู่ในช่วงเวลาเรียนของวิชานี้
                      </h4>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
                        ระบบอนุญาตให้เปิดกล้องสแกนได้เฉพาะช่วง <strong>ก่อนเริ่มคาบ 30 นาที</strong> ถึง <strong>หลังหมดคาบ 30 นาที</strong>
                        {timeStatus.hasSchedulesToday ? (
                          <span className="block mt-1">ตารางวันนี้: <strong>{timeStatus.allSessions.map(s => `${s.startTime} - ${s.endTime} น.`).join(', ')}</strong></span>
                        ) : (
                          <span className="block mt-1">วันนี้ไม่มีตารางเรียนปกติตามระบบ</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-amber-200/60 dark:border-amber-800/40">
                    <span className="text-xs text-amber-800 dark:text-amber-300">
                      หากคุณกำลังนัดสอนนอกตาราง กรุณากดสร้างคลาสสอนชดเชย:
                    </span>
                    <button
                      type="button"
                      onClick={() => openMakeupModal(selectedSubject)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-sm transition shrink-0"
                    >
                      <CalendarPlus className="w-4 h-4" />
                      สร้างคลาสสอนชดเชย
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {scanType === "assembly" && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">เลือกชั้นปีที่จะเช็คชื่อเข้าแถว</label>
              <select 
                disabled={isScanning}
                value={assemblyLevel} 
                onChange={e => setAssemblyLevel(e.target.value)} 
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border disabled:bg-gray-100 dark:disabled:bg-gray-800"
              >
                <option value="">-- กรุณาเลือกชั้นปี --</option>
                {levelsOptions.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            {/* แถบแจ้งเตือนสถานะช่วงเวลาเข้าแถวหน้าเสาธง */}
            {(() => {
              const aStatus = getAssemblyTimeStatus();
              if (aStatus.isAllowed) {
                return (
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/90 dark:border-emerald-800/60 dark:bg-emerald-950/30 flex flex-col gap-2 animate-in fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <span className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                          อยู่ในช่วงเวลาเข้าแถวหน้าเสาธง ({aStatus.startTime} - {aStatus.endTime} น.)
                        </span>
                      </div>
                      <span className="text-xs text-emerald-700 dark:text-emerald-300">
                        สแกนได้ถึง {aStatus.windowEndStr} น. (หลังเลิกแถว 30 น.)
                      </span>
                    </div>
                    <div className="text-xs flex items-center gap-2 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/40">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded">
                        ✓ สถานะขณะนี้: มาเข้าแถวปกติ (PRESENT)
                      </span>
                    </div>
                  </div>
                );
              }

              return (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/90 dark:border-amber-800/60 dark:bg-amber-950/30 flex flex-col gap-2 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200">
                        ไม่อยู่ในช่วงเวลาเข้าแถวหน้าเสาธง
                      </h4>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
                        เวลาเข้าแถวปกติคือ <strong>{aStatus.startTime} - {aStatus.endTime} น.</strong><br/>
                        ระบบอนุญาตให้เปิดกล้องสแกนได้เฉพาะช่วง <strong>{aStatus.windowStartStr} - {aStatus.windowEndStr} น.</strong> (ก่อนเริ่ม 30 นาที ถึงหลังเลิก 30 นาที)
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* แถบควบคุมระบบตรวจสอบคนจริง Anti-Spoofing & Liveness Detection */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-gradient-to-r from-gray-50 to-slate-100 dark:from-gray-800 dark:to-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${antiSpoofMode ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  ระบบตรวจสอบคนจริง (Anti-Spoofing Liveness)
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  antiSpoofMode 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700' 
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-300'
                }`}>
                  {antiSpoofMode ? "เปิดใช้งาน: ป้องกันรูปภาพมือถือ" : "โหมดสแกนรวดเร็ว"}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {antiSpoofMode 
                  ? "บังคับตรวจจับการกะพริบตา (Blink), แสง (60-220), และขนาดใบหน้าระยะ 0.5-1.2 ม." 
                  : "สแกนทันทีเมื่อพบหน้า เหมาะสำหรับเข้าแถวที่มีนักเรียนจำนวนมาก"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAntiSpoofMode(!antiSpoofMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              antiSpoofMode
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200'
            }`}
          >
            {antiSpoofMode ? (
              <>
                <ShieldCheck className="w-4 h-4" /> ป้องกันรูปถ่าย (เปิดอยู่)
              </>
            ) : (
              <>
                ⚡ เปลี่ยนเป็นโหมดป้องกันรูปถ่าย
              </>
            )}
          </button>
        </div>

        <div className={`relative rounded-xl overflow-hidden w-full aspect-video bg-black flex justify-center items-center ${isScanning ? 'block' : 'hidden'}`}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            onPlay={handleVideoPlay}
            className={`w-full h-full object-cover ${cameraFacingMode === 'user' ? 'transform scale-x-[-1]' : ''}`}
          />
          <canvas 
            ref={canvasRef} 
            className="absolute top-0 left-0 w-full h-full object-cover"
          />
          <button 
            onClick={toggleCamera}
            className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 backdrop-blur-sm transition-all"
            title="สลับกล้องหน้า/หลัง"
          >
            <FlipHorizontal className="w-5 h-5" />
          </button>
        </div>
        
        {!isScanning && (
          <div className="w-full aspect-video bg-gray-100 dark:bg-gray-700 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
            <Camera className="w-12 h-12 text-gray-400 mb-3" />
            <p className="text-gray-500">กดปุ่มด้านล่างเพื่อเปิดกล้อง</p>
          </div>
        )}

        {isScanning ? (
          <div className="flex gap-2 w-full">
            <button
              onClick={handleEndSession}
              className="flex-1 py-3 px-4 rounded-xl text-white font-medium flex items-center justify-center bg-red-600 hover:bg-red-700 transition"
            >
              <StopCircle className="mr-2 w-5 h-5" />
              ปิดกล้อง / จบการเช็คชื่อ
            </button>
            <button
              onClick={handleCancelSession}
              className="flex-1 py-3 px-4 rounded-xl text-gray-700 font-medium flex items-center justify-center bg-gray-200 hover:bg-gray-300 transition"
            >
              ยกเลิกและลบรอบนี้
            </button>
          </div>
        ) : (
          (() => {
            const classTimeStatus = scanType === "class" && selectedSubject ? getSubjectTimeStatus(selectedSubject) : null;
            const assemblyTimeStatus = scanType === "assembly" ? getAssemblyTimeStatus() : null;
            const isBlockedByTime = scanType === "class"
              ? (classTimeStatus ? !classTimeStatus.isAllowed : false)
              : (assemblyTimeStatus ? !assemblyTimeStatus.isAllowed : false);

            const blockedMessage = scanType === "class"
              ? "⛔ ไม่อยู่ในช่วงเวลาเรียน (สร้างคลาสสอนชดเชยเพื่อเปิดสแกน)"
              : "⛔ ไม่อยู่ในช่วงเวลาเข้าแถวหน้าเสาธง (เปิดสแกน 07:10 - 08:30 น.)";

            return (
              <button
                onClick={startCamera}
                disabled={!modelsLoaded || students.length === 0 || isBlockedByTime}
                className="w-full py-3 px-4 rounded-xl text-white font-medium flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 transition"
              >
                {!modelsLoaded ? <RefreshCcw className="animate-spin mr-2" /> : <Camera className="mr-2" />}
                {students.length === 0 
                  ? "ยังไม่มีฐานข้อมูลหน้านักเรียน" 
                  : isBlockedByTime
                    ? blockedMessage
                    : (!modelsLoaded ? "กำลังโหลดโมเดล AI..." : "เริ่มเช็คชื่อกล้อง AI")
                }
              </button>
            );
          })()
        )}

        {/* --- ส่วนสำหรับเช็คชื่อด้วยมือ (Manual Add) --- */}
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm mt-8">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <UserPlus className="w-5 h-5 mr-2 text-indigo-500" />
            เช็คชื่อด้วยตัวเอง (หากนักเรียนตกหล่น)
          </h3>
          <div className="flex gap-2 items-start">
            {/* Searchable Select Combobox สำหรับนักเรียน */}
            <div className="relative flex-1">
              {isManualStudentDropdownOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsManualStudentDropdownOpen(false)}></div>
              )}

              <div className="relative z-40">
                <div
                  onClick={() => setIsManualStudentDropdownOpen(!isManualStudentDropdownOpen)}
                  className={`flex items-center justify-between w-full rounded-md border shadow-sm sm:text-sm px-3 py-2 cursor-pointer bg-white dark:bg-gray-900 transition-colors ${isManualStudentDropdownOpen ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'}`}
                >
                  <span className={`${manualStudentId ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-500'}`}>
                    {manualStudentId
                      ? (() => {
                          const s = students.find(x => x.id === manualStudentId);
                          return s ? `${s.name} (${s.username}) - ${s.level || "ไม่ระบุ"}` : "-- เลือกนักเรียนที่ยังไม่ได้เช็คชื่อ --";
                        })()
                      : "-- เลือกนักเรียนที่ยังไม่ได้เช็คชื่อ --"}
                  </span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${isManualStudentDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>

                {isManualStudentDropdownOpen && (
                  <div className="absolute w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-xl max-h-60 overflow-y-auto z-50">
                    <div className="p-2 sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 z-10 shadow-sm">
                      <input
                        type="text"
                        value={manualStudentSearch}
                        onChange={e => setManualStudentSearch(e.target.value)}
                        placeholder="พิมพ์ค้นหารหัส หรือชื่อนักเรียน..."
                        className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        autoFocus
                      />
                    </div>
                    <div className="py-1 divide-y divide-gray-50 dark:divide-gray-700/50">
                      <div
                        onClick={() => {
                          setManualStudentId("");
                          setIsManualStudentDropdownOpen(false);
                          setManualStudentSearch("");
                        }}
                        className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer italic"
                      >
                        -- ยกเลิกการเลือก --
                      </div>
                      {unloggedStudents
                        .filter(s => {
                          if (!manualStudentSearch) return true;
                          const q = manualStudentSearch.toLowerCase();
                          return s.name.toLowerCase().includes(q) || s.username.toLowerCase().includes(q) || (s.level && s.level.toLowerCase().includes(q));
                        })
                        .map(s => (
                          <div
                            key={s.id}
                            onClick={() => {
                              setManualStudentId(s.id);
                              setIsManualStudentDropdownOpen(false);
                              setManualStudentSearch("");
                            }}
                            className={`px-4 py-2 text-sm cursor-pointer transition-colors flex items-center justify-between ${manualStudentId === s.id ? 'bg-indigo-50 text-indigo-900 border-l-2 border-indigo-500 dark:bg-indigo-900/60 dark:text-indigo-200' : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50 border-l-2 border-transparent'}`}
                          >
                            <div>
                              <span className="font-semibold">{s.name}</span>
                              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({s.username})</span>
                            </div>
                            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-1.5 py-0.5 rounded">
                              {s.level || "-"}
                            </span>
                          </div>
                        ))
                      }
                      {unloggedStudents.filter(s => {
                        if (!manualStudentSearch) return true;
                        const q = manualStudentSearch.toLowerCase();
                        return s.name.toLowerCase().includes(q) || s.username.toLowerCase().includes(q);
                      }).length === 0 && (
                        <div className="px-4 py-3 text-sm text-gray-400 italic text-center">
                          {unloggedStudents.length === 0 ? "เช็คชื่อครบทุกคนแล้ว 🎉" : "ไม่พบนักเรียนที่ค้นหา"}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {(() => {
              const classTimeStatus = scanType === "class" && selectedSubject ? getSubjectTimeStatus(selectedSubject) : null;
              const assemblyTimeStatus = scanType === "assembly" ? getAssemblyTimeStatus() : null;
              const isManualTimeBlocked = scanType === "class"
                ? (classTimeStatus ? !classTimeStatus.isAllowed : false)
                : (assemblyTimeStatus ? !assemblyTimeStatus.isAllowed : false);

              return (
                <button
                  onClick={handleManualAdd}
                  disabled={!manualStudentId || (scanType === "class" && !selectedSubject) || isManualTimeBlocked}
                  className="px-5 py-2 bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 rounded-md font-medium transition disabled:opacity-50 shadow-sm shrink-0 h-[38px] flex items-center"
                >
                  {scanType === "class" ? "บันทึกเข้าเรียน" : "บันทึกเข้าแถว"}
                </button>
              );
            })()}
          </div>
        </div>

      </div>

      {/* Right side: Log List */}
      <div className="w-full md:w-80 flex flex-col border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 font-bold dark:text-white flex items-center justify-between">
          <span>{scanType === "class" ? "ประวัติการเช็ควิชา" : "ประวัติการเข้าแถว"}</span>
          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">{logs.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "500px" }}>
          {logs.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">กล้องกำลังสแกน...<br/>รอให้นักเรียนหันหน้ามาตรงกล้อง</p>
          ) : (
            logs.map((log, index) => (
              <div key={`${log.id}-${index}`} className="flex items-start p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-green-100 dark:border-green-800 animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 className={`w-5 h-5 mr-3 shrink-0 mt-0.5 ${log.status === "duplicate" ? "text-yellow-400" : "text-green-500"}`} />
                <div className="flex flex-col flex-1">
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                    {log.name} 
                    {log.manual && <span className="ml-2 text-[10px] bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded">เพิ่มมือ</span>}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{log.time}</span>
                    {log.status === "duplicate" ? (
                      <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400 px-1.5 py-0.5 rounded-full">ซ้ำ - ไม่บันทึกซ้ำ</span>
                    ) : (
                      <span className="text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 px-1.5 py-0.5 rounded-full">บันทึกแล้ว</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>

      {/* Modal: สร้างคลาสสอนชดเชย */}
      {isMakeupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsMakeupModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                <CalendarPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">สร้างคลาสสอนชดเชย</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">กำหนดเวลาเพื่อเปิดสิทธิ์สแกนเช็คชื่อนอกตารางเรียนปกติ (ก่อน 30 น. - หลังเลิก 30 น.)</p>
              </div>
            </div>

            <form onSubmit={handleCreateMakeup} className="space-y-4">
              <div className="relative">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">วิชาที่ต้องการสอนชดเชย</label>
                {isMakeupSubjectDropdownOpen && (
                  <div className="fixed inset-0 z-40" onClick={() => setIsMakeupSubjectDropdownOpen(false)}></div>
                )}

                <div className="relative z-40">
                  <div
                    onClick={() => setIsMakeupSubjectDropdownOpen(!isMakeupSubjectDropdownOpen)}
                    className={`flex items-center justify-between w-full rounded-xl border text-sm py-2.5 px-3 cursor-pointer bg-white dark:bg-gray-900 transition-colors ${
                      isMakeupSubjectDropdownOpen 
                        ? 'border-amber-500 ring-2 ring-amber-500/20' 
                        : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <BookOpen className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className={makeupSubjectId ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-400'}>
                        {makeupSubjectId
                          ? (() => {
                              const s = subjectsList.find(x => x.id === makeupSubjectId);
                              return s ? `[${s.code}] ${s.name} (${s.level || "ไม่ระบุ"})` : "-- เลือกวิชา --";
                            })()
                          : "-- เลือกวิชา --"}
                      </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${isMakeupSubjectDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {isMakeupSubjectDropdownOpen && (
                    <div className="absolute w-full mt-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-50 animate-in fade-in zoom-in-95">
                      <div className="p-2 sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 z-10 shadow-sm">
                        <div className="relative">
                          <input
                            type="text"
                            value={makeupSubjectSearch}
                            onChange={e => setMakeupSubjectSearch(e.target.value)}
                            placeholder="พิมพ์ค้นหารหัส หรือชื่อวิชา..."
                            className="w-full pl-8 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:bg-gray-700 dark:text-white"
                            autoFocus
                          />
                          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
                        </div>
                      </div>

                      <div className="py-1 divide-y divide-gray-50 dark:divide-gray-700/50">
                        {subjectsList
                          .filter(s => {
                            if (!makeupSubjectSearch) return true;
                            const q = makeupSubjectSearch.toLowerCase();
                            return s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || (s.level && s.level.toLowerCase().includes(q));
                          })
                          .map(s => (
                            <div
                              key={s.id}
                              onClick={() => {
                                setMakeupSubjectId(s.id);
                                setIsMakeupSubjectDropdownOpen(false);
                                setMakeupSubjectSearch("");
                              }}
                              className={`p-2.5 text-xs cursor-pointer transition-colors flex items-center justify-between hover:bg-amber-50 dark:hover:bg-amber-950/40 ${
                                makeupSubjectId === s.id 
                                  ? 'bg-amber-50 text-amber-900 font-semibold border-l-2 border-amber-500 dark:bg-amber-950/60 dark:text-amber-200' 
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              <div>
                                <span className="font-semibold text-gray-900 dark:text-white mr-1.5">[{s.code}]</span>
                                <span>{s.name}</span>
                              </div>
                              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded shrink-0">
                                {s.level || "-"}
                              </span>
                            </div>
                          ))
                        }

                        {subjectsList.filter(s => {
                          if (!makeupSubjectSearch) return true;
                          const q = makeupSubjectSearch.toLowerCase();
                          return s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || (s.level && s.level.toLowerCase().includes(q));
                        }).length === 0 && (
                          <div className="p-3 text-center text-xs text-gray-400 italic">
                            ไม่พบวิชาที่ค้นหา
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">วันที่สอนชดเชย</label>
                <input
                  type="date"
                  value={makeupDate}
                  onChange={e => setMakeupDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-900 text-sm py-2.5 px-3 focus:ring-2 focus:ring-amber-500 outline-none"
                  required
                />
              </div>

              {/* Quick Fill Button */}
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-3 rounded-xl flex items-center justify-between">
                <div className="text-xs text-amber-800 dark:text-amber-300">
                  <span className="font-bold">เริ่มสอนทันที?</span> ตั้งเวลาเริ่มตอนนี้และสิ้นสุดในอีก 2 ชม.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const startH = String(now.getHours()).padStart(2, '0');
                    const startM = String(now.getMinutes()).padStart(2, '0');
                    setMakeupStartTime(`${startH}:${startM}`);
                    const endH = String((now.getHours() + 2) % 24).padStart(2, '0');
                    setMakeupEndTime(`${endH}:${startM}`);
                    setMakeupDate(new Date().toISOString().split("T")[0]);
                  }}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  ด่วนตอนนี้
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">เวลาเริ่ม (HH:mm)</label>
                  <input
                    type="time"
                    value={makeupStartTime}
                    onChange={e => setMakeupStartTime(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-900 text-sm py-2.5 px-3 focus:ring-2 focus:ring-amber-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">เวลาสิ้นสุด (HH:mm)</label>
                  <input
                    type="time"
                    value={makeupEndTime}
                    onChange={e => setMakeupEndTime(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-900 text-sm py-2.5 px-3 focus:ring-2 focus:ring-amber-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">หมายเหตุ (ถ้ามี)</label>
                <input
                  type="text"
                  value={makeupRemark}
                  onChange={e => setMakeupRemark(e.target.value)}
                  placeholder="เช่น สอนชดเชยวันหยุด, คาบติวพิเศษ"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-900 text-sm py-2.5 px-3 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMakeupModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMakeup}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition disabled:opacity-50"
                >
                  {isSubmittingMakeup ? "กำลังบันทึก..." : "ยืนยันสร้างคลาสชดเชย"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
