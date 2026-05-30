"use client";

import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { Camera, RefreshCcw, CheckCircle2, StopCircle, UserPlus, FlipHorizontal } from "lucide-react";

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
  const [logs, setLogs] = useState<{ id: string; name: string; time: string; manual?: boolean; status?: "saved" | "duplicate" }[]>([]);
  const [scanType, setScanType] = useState<"class"|"assembly">(initialType || "class");
  const [manualStudentId, setManualStudentId] = useState("");
  const [assemblyLevel, setAssemblyLevel] = useState("ทั้งหมด");
  const [cameraFacingMode, setCameraFacingMode] = useState<"user" | "environment">("user");

  const levelsOptions = ["ปวช.1", "ปวช.2", "ปวช.3", "ปวส.1", "ปวส.2", "ปวส.1(ม.6)", "ปวส.2(ม.6)", "ไม่ระบุ"];

  // Refs สำหรับการจัดเก็บข้อมูลที่ไม่เสี่ยงต่อรอบ Re-render 
  const logsRef = useRef<{ id: string; time: number }[]>([]);

  useEffect(() => {
    const loadModelsAndData = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'), // เปลี่ยนกลับไปใช้ Tiny เพื่อความเร็ว
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);

        if (students.length > 0) {
          const labeledDescriptors = students.map((s) => {
            const descArray = JSON.parse(s.faceDescriptor);
            const descriptor = new Float32Array(descArray);
            return new faceapi.LabeledFaceDescriptors(s.id, [descriptor]);
          });
          setFaceMatcher(new faceapi.FaceMatcher(labeledDescriptors, 0.55));
        }

        setModelsLoaded(true);
      } catch (e) {
        console.error("Error loading Face API models:", e);
      }
    };
    loadModelsAndData();
    
    // Cleanup on unmount
    return () => stopCamera();
  }, [students]);

  const startCamera = async () => {
    if (scanType === "class" && !selectedSubject) {
      return alert("กรุณาเลือกวิชาก่อนเริ่มเช็คชื่อ หรือเลือกโหมดเข้าแถว");
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
    let unloggedStudents = students.filter(s => !logs.find(l => l.id === s.id));
    if (scanType === "assembly" && assemblyLevel !== "ทั้งหมด") {
      unloggedStudents = unloggedStudents.filter(s => s.level === assemblyLevel);
    }
    
    if (unloggedStudents.length > 0) {
      const confirmAbsent = window.confirm(`คุณต้องการบันทึกสถานะ "ขาดเรียน" ให้นักเรียนที่เหลือจำนวน ${unloggedStudents.length} คน ใช่หรือไม่?`);
      if (confirmAbsent) {
        try {
          await fetch('/api/attendance/absent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentIds: unloggedStudents.map(s => s.id),
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

        results.forEach(async (result, i) => {
          const studentId = result.label;
          let boxLabel = "ไม่รู้จัก";
          let boxColor = "red";

          if (result.label !== "unknown") {
            const now = Date.now();
            const student = students.find(s => s.id === studentId);
            const studentName = student?.name || "ไม่ทราบชื่อ";
            
            let allowedToLog = true;
            if (scanType === "assembly" && assemblyLevel !== "ทั้งหมด") {
              if (student?.level !== assemblyLevel) {
                allowedToLog = false;
              }
            }

            if (!allowedToLog) {
              boxLabel = `${studentName} (คนละชั้นปี)`;
              boxColor = "orange";
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
                
                // Optimistically add to log first, then update status after API
                setLogs(prev => [{ id: studentId, name: studentName, time: new Date().toLocaleTimeString('th-TH'), status: "saved" }, ...prev]);

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
                    // Update the log entry status to "duplicate"
                    setLogs(prev => prev.map(l => l.id === studentId && l.time === new Date().toLocaleTimeString('th-TH') ? { ...l, status: "duplicate" } : l));
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
        });
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
    setLogs(prev => [{ id: manualStudentId, name: student.name, time: new Date().toLocaleTimeString('th-TH'), manual: true }, ...prev]);
    
    try {
      await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          studentId: manualStudentId, 
          subjectId: scanType === "class" ? selectedSubject : null,
          type: scanType
        })
      });
      setManualStudentId("");
    } catch (e) {
      console.error(e);
      alert("เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  // กรองเมนูรายชื่อนักเรียนเฉพาะคนที่ยังไม่ได้เช็คชื่อ (ไม่ว่าจะจากกล้องหรือมือ)
  let unloggedStudents = students.filter(s => !logs.find(l => l.id === s.id));
  if (scanType === "assembly" && assemblyLevel !== "ทั้งหมด") {
    unloggedStudents = unloggedStudents.filter(s => s.level === assemblyLevel);
  }

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Left side: Camera & Manual Form */}
      <div className="flex-1 space-y-6">

        {scanType === "class" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {initialSubjectId ? "กำลังเช็คชื่อวิชา" : "เลือกวิชาที่จะเช็คชื่อ"}
            </label>
            {initialSubjectId ? (
              <div className="block w-full rounded-md border-gray-300 bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 px-3 py-2.5 border sm:text-sm font-medium shadow-sm">
                {(() => {
                  const s = subjects.find(s => s.id === initialSubjectId);
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
                {subjects.map(s => <option key={s.id} value={s.id}>[{s.code}] {s.name} (ชั้นปี: {s.level || "ไม่ระบุ"})</option>)}
              </select>
            )}
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
              <option value="ทั้งหมด">-- ทั้งหมด --</option>
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
          <button
            onClick={handleEndSession}
            className="w-full py-3 px-4 rounded-xl text-white font-medium flex items-center justify-center bg-red-600 hover:bg-red-700 transition"
          >
            <StopCircle className="mr-2" />
            ปิดกล้อง / จบการเช็คชื่อรอบนี้
          </button>
        ) : (
          <button
            onClick={startCamera}
            disabled={!modelsLoaded || students.length === 0}
            className="w-full py-3 px-4 rounded-xl text-white font-medium flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 transition"
          >
            {!modelsLoaded ? <RefreshCcw className="animate-spin mr-2" /> : <Camera className="mr-2" />}
            {students.length === 0 ? "ยังไม่มีฐานข้อมูลหน้านักเรียน" : (modelsLoaded ? "เริ่มเช็คชื่อกล้อง AI" : "กำลังโหลดโมเดล AI...")}
          </button>
        )}

        {/* --- ส่วนสำหรับเช็คชื่อด้วยมือ (Manual Add) --- */}
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm mt-8">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <UserPlus className="w-5 h-5 mr-2 text-indigo-500" />
            เช็คชื่อด้วยตัวเอง (หากนักเรียนตกหล่น)
          </h3>
          <div className="flex gap-2">
            <select
              value={manualStudentId}
              onChange={e => setManualStudentId(e.target.value)}
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:bg-gray-900"
            >
              <option value="">-- เลือกนักเรียนที่ยังไม่ได้เช็คชื่อ --</option>
              {unloggedStudents.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.username})</option>
              ))}
            </select>
            <button
              onClick={handleManualAdd}
              disabled={!manualStudentId || (scanType === "class" && !selectedSubject)}
              className="px-4 py-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 rounded-md font-medium transition disabled:opacity-50"
            >
              ตกลง
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
  );
}
