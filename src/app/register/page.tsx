"use client";

import { useState, useRef, useEffect } from "react";
import * as faceapi from "face-api.js";
import { Camera, UserPlus, FileJson, Loader2, MapPin, Phone, Droplets, User, ChevronRight, Check, Database, Search, Sparkles, CheckCircle2, AlertCircle, ShieldCheck, Eye, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { checkFaceQuality, getAverageEAR } from "@/lib/faceLiveness";

const BLOOD_TYPES = ["A", "B", "AB", "O", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function RegisterPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const [faceDescriptor, setFaceDescriptor] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [step, setStep] = useState(1); // 1=ข้อมูลส่วนตัว, 2=ที่อยู่, 3=สแกนหน้า
  const [scanError, setScanError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  // Student Live Search Suggestions
  const [studentSuggestions, setStudentSuggestions] = useState<any[]>([]);
  const [isSearchingStudent, setIsSearchingStudent] = useState(false);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [suggestTarget, setSuggestTarget] = useState<"name" | "username" | null>(null);
  const [linkedStudentNotice, setLinkedStudentNotice] = useState<string | null>(null);
  const searchTimeoutRef = useRef<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    nickname: "",
    username: "",
    password: "",
    level: "ปวช.1",
    phone: "",
    email: "",
    address: "",
    gender: "ไม่ระบุ",
    bloodType: "A",
    profilePicture: "",
    nationalId: "",
    isTwin: false,
    twinNote: "",
  });

  // State สำหรับ Anti-Spoofing & Liveness Checklist
  const [livenessStatus, setLivenessStatus] = useState({
    sizePassed: false,
    lightPassed: false,
    blinkPassed: false,
    feedback: "เปิดกล้องและจัดใบหน้าให้อยู่ในกรอบ",
  });
  const blinkStateRef = useRef<{ eyeState: "OPEN" | "CLOSED"; blinkCount: number }>({
    eyeState: "OPEN",
    blinkCount: 0,
  });

  // Debounced search for existing student in database
  const searchStudents = (query: string, target: "name" | "username") => {
    setSuggestTarget(target);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!query || query.trim().length < 1) {
      setStudentSuggestions([]);
      setIsSuggestOpen(false);
      return;
    }

    setIsSuggestOpen(true);
    setIsSearchingStudent(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/register/search-student?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (data.success) {
          setStudentSuggestions(data.students || []);
        }
      } catch (err) {
        console.error("Failed to search students:", err);
      } finally {
        setIsSearchingStudent(false);
      }
    }, 250);
  };

  const handleSelectStudent = (st: any) => {
    setFormData(prev => ({
      ...prev,
      name: st.name || prev.name,
      username: st.username || prev.username,
      level: st.level || prev.level,
      nickname: st.nickname || prev.nickname,
      phone: st.phone || prev.phone,
      email: st.email || prev.email,
      address: st.address || prev.address,
      gender: st.gender || prev.gender,
      bloodType: st.bloodType || prev.bloodType,
      ...(st.nationalId ? { nationalId: st.nationalId } : {})
    }));
    setIsSuggestOpen(false);
    setStudentSuggestions([]);
    if (st.hasFace) {
      setLinkedStudentNotice(`⚠️ รหัสนักเรียน ${st.username} (${st.name}) ได้เคยลงทะเบียนใบหน้าแล้ว หากทำต่อจะเป็นการส่งข้อมูลเพื่อตรวจสอบ`);
    } else {
      setLinkedStudentNotice(`✨ ดึงข้อมูลของ "${st.name}" (${st.username}) ชั้น ${st.level || "ไม่ระบุ"} สำเร็จ กรุณากำหนดรหัสผ่านและดำเนินการสแกนใบหน้า`);
    }
  };

  // Load face models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);
        setModelsLoaded(true);
      } catch (e) {
        console.error("Error loading models:", e);
      }
    };
    loadModels();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActive(true);
      }
    } catch {
      setScanError("❌ ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบสิทธิ์การเข้าถึงกล้อง");
    }
  };

  const handleVideoPlay = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.videoWidth === 0) {
      setTimeout(handleVideoPlay, 100);
      return;
    }

    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
      if (video.paused || video.ended || !modelsLoaded) return;
      try {
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.45 }))
          .withFaceLandmarks();

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (detection) {
            const resizedDetection = faceapi.resizeResults(detection, displaySize);
            const box = resizedDetection.detection.box;
            
            // 1. ตรวจสอบคุณภาพใบหน้า: ขนาด ระยะห่าง แสงสว่าง และคอนทราสต์ (ส่ง video element เพื่อวิเคราะห์พิกเซลจริงจากกล้อง)
            const quality = checkFaceQuality(video, box, displaySize.width, displaySize.height);

            // 2. ตรวจจับการกะพริบตา (Blink Detection) ป้องกันการนำรูปถ่าย/จอมือถือมาสแกน
            const earData = getAverageEAR(detection.landmarks);
            if (blinkStateRef.current.eyeState === "OPEN" && earData.avgEAR < 0.19) {
              blinkStateRef.current.eyeState = "CLOSED";
            } else if (blinkStateRef.current.eyeState === "CLOSED" && earData.avgEAR > 0.23) {
              blinkStateRef.current.eyeState = "OPEN";
              blinkStateRef.current.blinkCount += 1;
            }

            const sizeOk = quality.sizeStatus === "optimal";
            const lightOk = quality.luminanceStatus === "optimal" && quality.contrastStatus === "optimal";
            const blinkOk = blinkStateRef.current.blinkCount >= 1;

            setLivenessStatus({
              sizePassed: sizeOk,
              lightPassed: lightOk,
              blinkPassed: blinkOk,
              feedback: !sizeOk 
                ? quality.distanceFeedback 
                : !lightOk 
                ? quality.lightingFeedback 
                : !blinkOk 
                ? "👁️ กรุณากะพริบตา 1 ครั้งเพื่อยืนยันบุคคลจริง" 
                : "✅ ยืนยันบุคคลจริงเรียบร้อย พร้อมบันทึกภาพ",
            });

            if (sizeOk && lightOk && blinkOk) {
              ctx.strokeStyle = "#10b981"; // emerald-500
              ctx.lineWidth = 4;
            } else if (sizeOk && lightOk && !blinkOk) {
              ctx.strokeStyle = "#38bdf8"; // sky-400 (รอจังหวะกะพริบตา)
              ctx.lineWidth = 3;
            } else {
              ctx.strokeStyle = "#f59e0b"; // amber-500 (แจ้งเตือนขนาด/แสง)
              ctx.lineWidth = 2;
            }
            ctx.strokeRect(box.x, box.y, box.width, box.height);
          }
        }
      } catch (e) {
        // Ignore tracking errors
      }
    }, 150);
  };

  const captureAndScanFace = async () => {
    if (!videoRef.current || !modelsLoaded) return;
    setIsScanning(true);
    setScanError("");
    try {
      // ตรวจสอบเงื่อนไข Anti-Spoofing & คุณภาพก่อนบันทึก
      if (!livenessStatus.sizePassed) {
        setScanError("❌ กรุณาจัดระยะห่างใบหน้าให้อยู่ในกรอบที่เหมาะสม (ระยะ 0.5 - 1.2 เมตร)");
        setIsScanning(false);
        return;
      }
      if (!livenessStatus.lightPassed) {
        setScanError("❌ แสงสว่างไม่เพียงพอหรือมีแสงสะท้อนจ้าเกินไป กรุณาจัดแสงให้พอดี");
        setIsScanning(false);
        return;
      }
      if (!livenessStatus.blinkPassed) {
        setScanError("❌ กรุณากะพริบตา 1 ครั้งที่หน้ากล้อง เพื่อยืนยันว่าเป็นบุคคลจริง (ไม่ใช่ภาพถ่ายหรือจอมือถือ)");
        setIsScanning(false);
        return;
      }

      // 1. Freeze the frame INSTANTLY on click so the user doesn't have to hold still
      const freezeCanvas = document.createElement("canvas");
      freezeCanvas.width = videoRef.current.videoWidth;
      freezeCanvas.height = videoRef.current.videoHeight;
      const freezeCtx = freezeCanvas.getContext("2d");
      if (freezeCtx) {
        freezeCtx.drawImage(videoRef.current, 0, 0, freezeCanvas.width, freezeCanvas.height);
      }

      // 2. Run heavy AI detection on the frozen frame
      const detection = await faceapi
        .detectSingleFace(freezeCanvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.60 }))
        .withFaceLandmarks()
        .withFaceDescriptor();
        
      if (detection) {
        setFaceDescriptor(JSON.stringify(Array.from(detection.descriptor)));
        
        // 3. Save the exact frozen frame that was processed
        const finalCanvas = document.createElement("canvas");
        finalCanvas.width = freezeCanvas.width;
        finalCanvas.height = freezeCanvas.height;
        const finalCtx = finalCanvas.getContext("2d");
        if (finalCtx) {
          finalCtx.scale(-1, 1); // Flip horizontally because video is mirrored
          finalCtx.drawImage(freezeCanvas, -finalCanvas.width, 0, finalCanvas.width, finalCanvas.height);
          const base64Image = finalCanvas.toDataURL("image/jpeg", 0.6);
          setFormData(prev => ({ ...prev, profilePicture: base64Image }));
        }
      } else {
        setScanError("❌ ไม่พบใบหน้า กรุณาให้ใบหน้าอยู่ในกรอบชัดเจนแล้วลองอีกครั้ง");
      }
    } catch {
      setScanError("❌ เกิดข้อผิดพลาดในการสแกนใบหน้า");
    } finally {
      setIsScanning(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");

    if (!formData.name || !formData.username || !formData.password || !formData.email) {
      setSubmitError("⚠️ กรุณากรอกข้อมูลส่วนตัวในขั้นตอนที่ 1 ให้ครบถ้วน (ชื่อ, อีเมล, รหัสนักเรียน, รหัสผ่าน)");
      setStep(1);
      return;
    }

    if (!faceDescriptor) {
      setSubmitError("⚠️ กรุณาสแกนใบหน้าก่อนทำการลงทะเบียน");
      return;
    }
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, faceDescriptor }),
      });
      const data = await response.json();
      if (data.success) {
        setSubmitSuccess("✅ ลงทะเบียนสำเร็จ! ระบบกำลังนำคุณไปยังหน้าเข้าสู่ระบบ...");
        setTimeout(() => router.push('/login'), 2000);
      } else {
        setSubmitError("❌ ลงทะเบียนล้มเหลว: " + data.message);
      }
    } catch {
      setSubmitError("❌ เกิดข้อผิดพลาดระหว่างส่งข้อมูลลงทะเบียน");
    }
  };

  const inputClass = "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors";
  const labelClass = "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground mb-2 block";

  const steps = ["ข้อมูลส่วนตัว", "ที่อยู่", "สแกนใบหน้า"];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-3xl space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
            <UserPlus className="w-8 h-8" />
          </div>
          <h1 className="text-[var(--text-3xl)] font-bold text-foreground tracking-tight">ลงทะเบียนนักเรียนใหม่</h1>
          <p className="text-[var(--text-sm)] text-muted-foreground">ระบบเช็คชื่อผ่านการสแกนใบหน้า แผนกเทคนิควิศวกรรมสำรวจ</p>
        </div>

        {/* Step Indicator */}
        <nav aria-label="Progress" className="hidden sm:block">
          <ol role="list" className="flex items-center justify-center">
            {steps.map((label, i) => {
              const currentStep = i + 1;
              const isActive = step === currentStep;
              const isCompleted = step > currentStep;

              return (
                <li key={label} className={`relative ${i !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (currentStep > 1 && (!formData.name || !formData.username || !formData.password || !formData.email)) {
                          return; // ป้องกันการกดข้ามหน้าถ้ากรอกหน้า 1 ไม่ครบ
                        }
                        setStep(currentStep);
                      }}
                      className={`relative flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                        isActive 
                          ? 'bg-primary border-2 border-primary' 
                          : isCompleted 
                            ? 'bg-primary border-2 border-primary' 
                            : 'bg-background border-2 border-muted-foreground'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4 text-primary-foreground" />
                      ) : (
                        <span className={`text-sm font-medium ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                          {currentStep}
                        </span>
                      )}
                    </button>
                    {i !== steps.length - 1 && (
                      <div className={`absolute left-8 top-1/2 -mt-px w-full h-0.5 ${isCompleted ? 'bg-primary' : 'bg-border'}`} />
                    )}
                  </div>
                  <span className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium ${isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground'} whitespace-nowrap`}>
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>
        
        {/* Mobile Step Indicator */}
        <div className="sm:hidden flex items-center justify-between px-2 pb-4 border-b border-border">
          <span className="text-sm font-medium text-foreground">ขั้นตอนที่ {step} จาก 3</span>
          <span className="text-sm text-primary font-medium">{steps[step-1]}</span>
        </div>

        {/* Form Card */}
        <div className="bg-card border border-border shadow-sm rounded-xl overflow-hidden">
          <form onSubmit={onSubmit} className="p-6 sm:p-8" noValidate>
            
            {/* ── Step 1: ข้อมูลส่วนตัว ── */}
            <div className={step === 1 ? 'block animate-in fade-in slide-in-from-right-4' : 'hidden'}>
              <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
                <User className="w-5 h-5 text-primary" /> 
                <h2 className="text-lg font-semibold text-foreground">ข้อมูลส่วนตัวเบื้องต้น</h2>
              </div>

              {/* แจ้งเตือนเมื่อมีการดึงข้อมูลนักเรียนจากระบบมาเติมให้อัตโนมัติ */}
              {linkedStudentNotice && (
                <div className="mb-6 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-sm text-indigo-900 dark:text-indigo-200 flex items-start gap-3 animate-in fade-in">
                  <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">{linkedStudentNotice}</p>
                    <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">ข้อมูลส่วนตัวเดิมถูกเติมลงในฟอร์มแล้ว คุณสามารถแก้ไขเพิ่มเติมหรือตรวจสอบก่อนไปขั้นตอนถัดไป</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLinkedStudentNotice(null)}
                    className="text-xs text-indigo-500 hover:text-indigo-700 font-bold ml-2"
                  >
                    ปิด
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ช่องชื่อ-นามสกุล พร้อม Searchable Suggestion Dropdown */}
                <div className="md:col-span-2 relative">
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelClass}>
                      ชื่อ-นามสกุล <span className="text-destructive">*</span>
                    </label>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Search className="w-3 h-3 text-primary" /> พิมพ์ค้นหาชื่อที่มีในระบบได้
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text" required className={inputClass}
                      placeholder="เช่น สมชาย ใจดี (หรือเริ่มพิมพ์เพื่อค้นหา)"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        searchStudents(e.target.value, "name");
                      }}
                      onFocus={() => {
                        if (formData.name) searchStudents(formData.name, "name");
                      }}
                    />
                    {isSearchingStudent && suggestTarget === "name" && (
                      <div className="absolute right-3 top-3">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    )}
                  </div>

                  {/* Suggestion Dropdown ใต้ช่องชื่อ */}
                  {isSuggestOpen && suggestTarget === "name" && studentSuggestions.length > 0 && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsSuggestOpen(false)}></div>
                      <div className="absolute left-0 top-full mt-1.5 w-full bg-card border border-primary/30 rounded-xl shadow-2xl max-h-64 overflow-y-auto z-50 animate-in fade-in zoom-in-95">
                        <div className="p-2.5 bg-primary/5 border-b border-border flex items-center justify-between">
                          <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" /> พบข้อมูลนักเรียนในระบบ (คลิกเพื่อดึงข้อมูล)
                          </span>
                          <span className="text-[10px] font-semibold text-muted-foreground bg-background px-2 py-0.5 rounded-full border border-border">
                            พบ {studentSuggestions.length} คน
                          </span>
                        </div>
                        <div className="divide-y divide-border">
                          {studentSuggestions.map(st => (
                            <div
                              key={st.id}
                              onClick={() => handleSelectStudent(st)}
                              className="p-3 cursor-pointer transition-colors hover:bg-primary/10 flex items-center justify-between gap-3"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-foreground">{st.name}</span>
                                  <span className="text-xs text-muted-foreground font-mono">({st.username})</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                                  <span>ชั้น {st.level || "ไม่ระบุ"}</span>
                                  {st.nickname && <span>• ชื่อเล่น: {st.nickname}</span>}
                                </div>
                              </div>
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${st.hasFace ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'}`}>
                                {st.hasFace ? "สแกนหน้าแล้ว" : "🟢 พร้อมบันทึกหน้า"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:col-span-2">
                  <div className="col-span-2 md:col-span-1">
                    <label className={labelClass}>ชื่อเล่น</label>
                    <input
                      type="text" className={inputClass}
                      placeholder="เช่น ต้น"
                      value={formData.nickname}
                      onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>เพศ</label>
                    <select
                      className={inputClass}
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    >
                      <option value="ไม่ระบุ">ไม่ระบุ</option>
                      <option value="ชาย">ชาย</option>
                      <option value="หญิง">หญิง</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>
                      กรุ๊ปเลือด <Droplets className="inline w-3 h-3 text-destructive" />
                    </label>
                    <select
                      className={inputClass}
                      value={formData.bloodType}
                      onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
                    >
                      {BLOOD_TYPES.map((bt) => (
                        <option key={bt} value={bt}>{bt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>เลขบัตรประชาชน <span className="text-destructive">*</span></label>
                  <input
                    type="text" required className={inputClass}
                    placeholder="เลขบัตรประชาชน 13 หลัก"
                    maxLength={13}
                    pattern="\d{13}"
                    value={(formData as any).nationalId || ""}
                    onChange={(e) => setFormData({ ...formData, nationalId: e.target.value } as any)}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    <Phone className="inline w-3 h-3 mr-1" />เบอร์โทรศัพท์
                  </label>
                  <input
                    type="tel" className={inputClass}
                    placeholder="เช่น 081-234-5678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label className={labelClass}>อีเมล <span className="text-destructive">*</span></label>
                  <input
                    type="email" required className={inputClass}
                    placeholder="เช่น student@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                {/* ช่องรหัสนักเรียน / Username พร้อม Searchable Suggestion Dropdown */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelClass}>
                      รหัสนักเรียน / Username <span className="text-destructive">*</span>
                    </label>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Search className="w-3 h-3 text-primary" /> ค้นหารหัสเดิม
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text" required className={inputClass}
                      placeholder="รหัสนักเรียน (e.g. 66001)"
                      value={formData.username}
                      onChange={(e) => {
                        setFormData({ ...formData, username: e.target.value });
                        searchStudents(e.target.value, "username");
                      }}
                      onFocus={() => {
                        if (formData.username) searchStudents(formData.username, "username");
                      }}
                    />
                    {isSearchingStudent && suggestTarget === "username" && (
                      <div className="absolute right-3 top-3">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    )}
                  </div>

                  {/* Suggestion Dropdown ใต้ช่องรหัสนักเรียน */}
                  {isSuggestOpen && suggestTarget === "username" && studentSuggestions.length > 0 && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsSuggestOpen(false)}></div>
                      <div className="absolute left-0 top-full mt-1.5 w-full bg-card border border-primary/30 rounded-xl shadow-2xl max-h-64 overflow-y-auto z-50 animate-in fade-in zoom-in-95">
                        <div className="p-2.5 bg-primary/5 border-b border-border flex items-center justify-between">
                          <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" /> รหัสนักเรียนเดิมในระบบ (คลิกเพื่อเลือก)
                          </span>
                          <span className="text-[10px] font-semibold text-muted-foreground bg-background px-2 py-0.5 rounded-full border border-border">
                            พบ {studentSuggestions.length} คน
                          </span>
                        </div>
                        <div className="divide-y divide-border">
                          {studentSuggestions.map(st => (
                            <div
                              key={st.id}
                              onClick={() => handleSelectStudent(st)}
                              className="p-3 cursor-pointer transition-colors hover:bg-primary/10 flex items-center justify-between gap-3"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-foreground font-mono">{st.username}</span>
                                  <span className="text-xs text-foreground font-semibold">- {st.name}</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  ชั้น {st.level || "ไม่ระบุ"}
                                </div>
                              </div>
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${st.hasFace ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'}`}>
                                {st.hasFace ? "สแกนหน้าแล้ว" : "🟢 พร้อมบันทึกหน้า"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className={labelClass}>รหัสผ่าน <span className="text-destructive">*</span></label>
                  <input
                    type="password" required className={inputClass}
                    placeholder="รหัสผ่าน"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>ชั้นปี <span className="text-destructive">*</span></label>
                  <select
                    required className={inputClass}
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  >
                    {["ปวช.1","ปวช.2","ปวช.3","ปวส.1","ปวส.2","ปวส.1(ม.6)","ปวส.2(ม.6)"].map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                {/* ข้อมูลพี่น้องฝาแฝด (ป้องกัน AI แจ้งเตือนหน้าซ้ำ) */}
                <div className="md:col-span-2 p-4 rounded-xl border border-primary/20 bg-primary/5">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.isTwin)}
                      onChange={(e) => setFormData({ ...formData, isTwin: e.target.checked })}
                      className="mt-1 w-4 h-4 rounded text-primary focus:ring-primary border-border"
                    />
                    <div>
                      <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <User className="w-4 h-4 text-primary" /> ฉันมีพี่น้องฝาแฝดที่ศึกษาในแผนกวิชานี้ (แฝดแท้ หรือ แฝดเทียม)
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        ทำเครื่องหมายนี้เพื่อป้องกันระบบ AI ตรวจพบใบหน้าหรือประวัติใกล้เคียงกัน โดยระบบจะใช้เลขบัตรประชาชน 13 หลักในการแยกแยะบุคคล และส่งข้อมูลให้อาจารย์ช่วยรับรอง
                      </p>
                    </div>
                  </label>

                  {formData.isTwin && (
                    <div className="mt-3 pt-3 border-t border-border/60 animate-in fade-in space-y-2">
                      <label className={labelClass}>ชื่อ หรือ รหัสนักศึกษาของคู่แฝด (ถ้ามี)</label>
                      <input
                        type="text"
                        className={inputClass}
                        placeholder="เช่น นายปัญญาวุธ (รหัส 69301090016)"
                        value={formData.twinNote}
                        onChange={(e) => setFormData({ ...formData, twinNote: e.target.value })}
                      />
                      <p className="text-[11px] text-amber-600 dark:text-amber-400">
                        * โปรดระบุเลขประจำตัวประชาชน 13 หลักด้านบนให้ถูกต้องเพื่อใช้ในการแยกแยะบุคคล
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!formData.name || !formData.username || !formData.password || !formData.email}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-8"
                >
                  ถัดไป <ChevronRight className="ml-2 h-4 w-4" />
                </button>
              </div>
            </div>

            {/* ── Step 2: ที่อยู่ ── */}
            <div className={step === 2 ? 'block animate-in fade-in slide-in-from-right-4' : 'hidden'}>
              <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
                <MapPin className="w-5 h-5 text-primary" /> 
                <h2 className="text-lg font-semibold text-foreground">ข้อมูลที่อยู่ติดต่อ</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={labelClass}>ที่อยู่ปัจจุบัน</label>
                  <textarea
                    rows={5}
                    className={`${inputClass} h-auto py-3 resize-none`}
                    placeholder="กรอกรายละเอียดที่อยู่ (บ้านเลขที่ หมู่ ซอย ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์)"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-6"
                >
                  ย้อนกลับ
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-8"
                >
                  ถัดไป <ChevronRight className="ml-2 h-4 w-4" />
                </button>
              </div>
            </div>

            {/* ── Step 3: สแกนใบหน้า ── */}
            <div className={step === 3 ? 'block animate-in fade-in slide-in-from-right-4' : 'hidden'}>
              <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
                <Camera className="w-5 h-5 text-primary" /> 
                <h2 className="text-lg font-semibold text-foreground">บันทึกโครงสร้างใบหน้า</h2>
              </div>

              <div className="space-y-6">
                <div className="bg-muted/30 border border-border rounded-xl p-4 sm:p-6 flex flex-col items-center gap-6">
                  {/* Video Preview */}
                  <div className={`relative rounded-lg overflow-hidden w-full max-w-md aspect-video bg-black shadow-inner border border-border/50 ${streamActive ? "block" : "hidden"}`}>
                    <video
                      ref={videoRef}
                      autoPlay muted playsInline
                      onPlay={handleVideoPlay}
                      className={`w-full h-full object-cover transform scale-x-[-1] ${formData.profilePicture ? 'hidden' : 'block'}`}
                    />
                    
                    <canvas 
                      ref={canvasRef} 
                      className={`absolute top-0 left-0 w-full h-full object-cover transform scale-x-[-1] pointer-events-none ${formData.profilePicture ? 'hidden' : 'block'}`} 
                    />
                    
                    {/* UI Guide overlay */}
                    <div className={`absolute inset-0 pointer-events-none flex flex-col items-center justify-center ${formData.profilePicture ? 'hidden' : 'flex'}`}>
                       <div className="w-3/5 sm:w-48 aspect-[3/4] border-2 border-white/40 border-dashed rounded-[60px] sm:rounded-[100px]"></div>
                       <div className="absolute bottom-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full text-white text-xs text-center border border-white/10">
                         ให้ใบหน้าอยู่ในกรอบจนขึ้น <span className="text-primary font-semibold">กรอบสีเขียว</span>
                       </div>
                    </div>

                    {formData.profilePicture && (
                      <img src={formData.profilePicture} alt="Captured" className="w-full h-full object-cover transform scale-x-[-1]" />
                    )}

                    {isScanning && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-20">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="w-8 h-8 text-primary animate-spin" />
                          <span className="text-sm font-medium text-foreground">กำลังประมวลผล...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Real-time Quality & Liveness Detection Checklist */}
                  {streamActive && !formData.profilePicture && (
                    <div className="w-full max-w-md bg-card border border-border rounded-xl p-3.5 space-y-2.5 text-xs shadow-sm animate-in fade-in">
                      <div className="flex items-center justify-between font-semibold border-b border-border pb-2">
                        <span className="flex items-center gap-1.5 text-foreground font-bold">
                          <ShieldCheck className="w-4 h-4 text-emerald-500" /> ตรวจสอบคนจริง (Liveness & Anti-Spoofing)
                        </span>
                        <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                          {livenessStatus.feedback}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className={`p-2 rounded-lg border flex flex-col items-center gap-0.5 transition-colors ${
                          livenessStatus.sizePassed 
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" 
                            : "bg-muted border-border text-muted-foreground"
                        }`}>
                          <span className="font-bold">📏 ระยะห่าง</span>
                          <span className="text-[10px]">{livenessStatus.sizePassed ? "✓ พอดี (0.5-1.2ม.)" : "รอปรับระยะ"}</span>
                        </div>

                        <div className={`p-2 rounded-lg border flex flex-col items-center gap-0.5 transition-colors ${
                          livenessStatus.lightPassed 
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" 
                            : "bg-muted border-border text-muted-foreground"
                        }`}>
                          <span className="font-bold">💡 แสงสว่าง</span>
                          <span className="text-[10px]">{livenessStatus.lightPassed ? "✓ แสงพอดี" : "รอปรับแสง"}</span>
                        </div>

                        <div className={`p-2 rounded-lg border flex flex-col items-center gap-0.5 transition-colors ${
                          livenessStatus.blinkPassed 
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" 
                            : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                        }`}>
                          <span className="font-bold flex items-center gap-1">
                            <Eye className="w-3 h-3" /> กะพริบตา
                          </span>
                          <span className="text-[10px] font-semibold">
                            {livenessStatus.blinkPassed ? "✓ ตรวจพบคนจริง" : "กรุณากะพริบตา"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {scanError && (
                    <div className="w-full max-w-md px-4 py-3 bg-destructive/10 border-l-4 border-destructive rounded-md text-sm text-destructive font-medium shadow-sm animate-in fade-in slide-in-from-top-2">
                      {scanError}
                    </div>
                  )}

                  {!streamActive && (
                    <div className="w-full max-w-md aspect-video bg-muted border border-border border-dashed rounded-lg flex flex-col items-center justify-center gap-3">
                      <div className="p-3 bg-background rounded-full shadow-sm">
                        <Camera className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground font-medium">กล้องยังไม่ถูกเปิดใช้งาน</p>
                    </div>
                  )}

                  <div className="w-full max-w-md">
                    {!streamActive ? (
                      <button
                        type="button"
                        onClick={startCamera}
                        disabled={!modelsLoaded}
                        className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-11"
                      >
                        {!modelsLoaded ? (
                          <><Loader2 className="animate-spin mr-2 w-4 h-4" /> กำลังโหลดโมเดล AI...</>
                        ) : (
                          <><Camera className="mr-2 w-4 h-4" /> เปิดใช้งานกล้อง</>
                        )}
                      </button>
                    ) : formData.profilePicture ? (
                      <button
                        type="button"
                        onClick={() => {
                          setFaceDescriptor(null);
                          setFormData(prev => ({ ...prev, profilePicture: "" }));
                        }}
                        className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-11"
                      >
                        <Camera className="mr-2 w-4 h-4" /> ถ่ายใหม่อีกครั้ง
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={captureAndScanFace}
                        disabled={isScanning}
                        className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 shadow-sm"
                      >
                        <Camera className="mr-2 w-4 h-4" />
                        {isScanning ? "กำลังวิเคราะห์ใบหน้า..." : "บันทึกใบหน้า"}
                      </button>
                    )}
                  </div>

                  {faceDescriptor && (
                    <div className="flex items-center justify-center gap-2 text-sm text-primary font-medium animate-in fade-in zoom-in-95 bg-primary/10 px-4 py-2 rounded-full w-full max-w-md">
                      <FileJson className="w-4 h-4" />
                      โครงสร้างใบหน้าถูกบันทึกเรียบร้อย
                    </div>
                  )}
                </div>
                
                {submitError && (
                  <div className="w-full px-4 py-3 bg-destructive/10 border-l-4 border-destructive rounded-md text-sm text-destructive font-medium shadow-sm animate-in fade-in slide-in-from-top-2">
                    {submitError}
                  </div>
                )}
                {submitSuccess && (
                  <div className="w-full px-4 py-3 bg-emerald-50 dark:bg-emerald-500/10 border-l-4 border-emerald-500 rounded-md text-sm text-emerald-600 dark:text-emerald-400 font-medium shadow-sm animate-in fade-in slide-in-from-top-2">
                    {submitSuccess}
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-between border-t border-border pt-6">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-11 px-6"
                >
                  ย้อนกลับ
                </button>
                <button
                  type="submit"
                  disabled={!faceDescriptor}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 shadow-sm"
                >
                  <UserPlus className="mr-2 w-5 h-5" />
                  เสร็จสิ้นและลงทะเบียน
                </button>
              </div>
            </div>

          </form>
        </div>

        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            มีบัญชีอยู่แล้ว?{" "}
            <a href="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
              กลับไปหน้าเข้าสู่ระบบ
            </a>
          </p>
          <div className="pt-4 border-t border-border">
            <a href="/test-db" className="inline-flex items-center justify-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <Database className="w-4 h-4 mr-2" />
              ทดสอบการเชื่อมต่อฐานข้อมูล
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
