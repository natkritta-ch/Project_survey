"use client";

import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { Camera, RefreshCcw, CheckCircle2, StopCircle, UserPlus, FlipHorizontal, Clock, AlertTriangle, CalendarPlus, X, Sparkles } from "lucide-react";

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
  const [logs, setLogs] = useState<{ logId: string; id: string; name: string; time: string; manual?: boolean; status?: "saved" | "duplicate"; attendanceId?: string }[]>([]);
  const [scanType, setScanType] = useState<"class"|"assembly">(initialType || "class");
  const [manualStudentId, setManualStudentId] = useState("");
  const [isManualStudentDropdownOpen, setIsManualStudentDropdownOpen] = useState(false);
  const [manualStudentSearch, setManualStudentSearch] = useState("");
  const [assemblyLevel, setAssemblyLevel] = useState("");
  const [cameraFacingMode, setCameraFacingMode] = useState<"user" | "environment">("user");

  // State สำหรับวิชาและคลาสสอนชดเชย
  const [subjectsList, setSubjectsList] = useState<any[]>(subjects);
  const [isMakeupModalOpen, setIsMakeupModalOpen] = useState(false);
  const [makeupSubjectId, setMakeupSubjectId] = useState(initialSubjectId || "");
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
      return alert("กรุณากรอกข้อมูลให้ครบถ้วน");
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
        alert("สร้างคลาสสอนชดเชยเรียบร้อยแล้ว! ระบบเปิดให้สแกนได้ทันที");
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
        alert("เกิดข้อผิดพลาด: " + (data.message || "ไม่สามารถสร้างคลาสชดเชยได้"));
      }
    } catch (err: any) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ: " + err.message);
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
        return alert("กรุณาเลือกวิชาก่อนเริ่มเช็คชื่อ");
      }
      const timeStatus = getSubjectTimeStatus(selectedSubject);
      if (timeStatus && !timeStatus.isAllowed) {
        alert(
          "⛔ ไม่อยู่ในช่วงเวลาเรียนของวิชานี้!\n\n" +
          "ระบบอนุญาตให้เปิดกล้องสแกนได้เฉพาะช่วง ก่อนเริ่มคาบ 30 นาที จนถึง หลังหมดคาบ 30 นาทีเท่านั้น\n\n" +
          "หากคุณกำลังสอนนอกตาราง กรุณากดปุ่ม 'สร้างคลาสสอนชดเชย' เพื่อเปิดสิทธิ์การสแกน"
        );
        return;
      }
    }
    if (scanType === "assembly" && !assemblyLevel) {
      return alert("กรุณาเลือกชั้นปีที่ต้องการเช็คแถว");
    }
    // เคลียร์ประวัติการเช็คชื่อเมื่อเปิดกล้องเริ่มรอบใหม่
    setLogs([]);
    logsRef.current = [];
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("ไม่สามารถเปิดกล้องได้: เบราว์เซอร์บล็อกการเข้าถึง (ต้องใช้ผ่าน HTTPS หรือ localhost เท่านั้น)");
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
      alert("ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบสิทธิ์การเข้าถึงกล้อง");
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
      const confirmAbsent = window.confirm(`คุณต้องการบันทึกสถานะ "ขาดเรียน" ให้นักเรียนที่เหลือจำนวน ${sessionUnloggedStudents.length} คน ใช่หรือไม่?`);
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
          alert("บันทึกสถานะขาดเรียนเรียบร้อยแล้ว");
        } catch (e) {
          console.error("Failed to mark absentees", e);
          alert("เกิดข้อผิดพลาดในการบันทึกสถานะขาดเรียน");
        }
      }
    }
  };

  const handleCancelSession = async () => {
    stopCamera();
    
    if (logs.length === 0) {
      alert("ไม่มีประวัติการเช็คชื่อในรอบนี้ที่ต้องยกเลิก");
      return;
    }

    const confirmCancel = window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการยกเลิกและลบประวัติการเช็คชื่อที่เพิ่งสแกนติดไปทั้งหมด ${logs.length} คนในรอบนี้?`);
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
          alert("เกิดข้อผิดพลาดในการยกเลิกประวัติบางส่วน");
        }
      }
      
      // Clear logs state
      setLogs([]);
      logsRef.current = [];
      alert("ยกเลิกการเช็คชื่อรอบนี้และลบประวัติเรียบร้อยแล้ว");
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

            // ป้องกันการแสกนหน้าคนที่อยู่ไกลหรือเป็นฉากหลัง (หน้าเล็กเกินไปความแม่นยำจะต่ำ)
            const minFaceSize = 90; // พิกเซล
            const faceBox = resizedDetections[i].detection.box;

            if (faceBox.width < minFaceSize || faceBox.height < minFaceSize) {
              allowedToLog = false;
              rejectReason = "ขยับหน้าเข้ามาใกล้ๆ";
            } else if (scanType === "assembly" && assemblyLevel) {
              if (student?.level !== assemblyLevel) {
                allowedToLog = false;
                rejectReason = "คนละชั้นปี";
              }
            }

            if (!allowedToLog) {
              boxLabel = rejectReason === "ขยับหน้าเข้ามาใกล้ๆ" ? rejectReason : `${studentName} (${rejectReason})`;
              boxColor = rejectReason === "ขยับหน้าเข้ามาใกล้ๆ" ? "gray" : "orange";
            } else {
              const similarity = Math.max(0, 100 - (result.distance * 100)); // แปลง Distance ให้เป็น % ความเหมือน
              boxLabel = `${studentName} (${Math.round(similarity)}%)`;
              boxColor = "green"; // วาดกรอบสีเขียวถ้าจับคู่ผ่าน
              
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
                    // Fix #4: match ด้วย logId แทน time string ป้องกัน race condition อีกรอบ
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
    if (!manualStudentId) return alert("กรุณาเลือกนักเรียน");
    if (scanType === "class" && !selectedSubject) return alert("กรุณาเลือกวิชา");
    
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
      }
      setManualStudentId("");
    } catch (e) {
      console.error(e);
      alert("เกิดข้อผิดพลาดในการบันทึก");
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
                <select 
                  disabled={isScanning}
                  value={selectedSubject} 
                  onChange={e => setSelectedSubject(e.target.value)} 
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border disabled:bg-gray-100 dark:disabled:bg-gray-800"
                >
                  <option value="">-- กรุณาเลือกวิชา --</option>
                  {subjectsList.map(s => <option key={s.id} value={s.id}>[{s.code}] {s.name} (ชั้นปี: ${s.level || "ไม่ระบุ"})</option>)}
                </select>
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
        )}

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
            const timeStatus = scanType === "class" && selectedSubject ? getSubjectTimeStatus(selectedSubject) : null;
            const isBlockedByTime = scanType === "class" && timeStatus ? !timeStatus.isAllowed : false;

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
                    ? "⛔ ไม่อยู่ในช่วงเวลาเรียน (สร้างคลาสสอนชดเชยเพื่อเปิดสแกน)"
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

            <button
              onClick={handleManualAdd}
              disabled={!manualStudentId || (scanType === "class" && !selectedSubject)}
              className="px-5 py-2 bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 rounded-md font-medium transition disabled:opacity-50 shadow-sm shrink-0 h-[38px] flex items-center"
            >
              บันทึกเข้าเรียน
            </button>
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
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">วิชาที่ต้องการสอนชดเชย</label>
                <select
                  value={makeupSubjectId}
                  onChange={e => setMakeupSubjectId(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-900 text-sm py-2.5 px-3 focus:ring-2 focus:ring-amber-500 outline-none"
                  required
                >
                  <option value="">-- เลือกวิชา --</option>
                  {subjectsList.map(s => (
                    <option key={s.id} value={s.id}>[{s.code}] {s.name} ({s.level || "ไม่ระบุ"})</option>
                  ))}
                </select>
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
