"use client";

import { useState, useRef, useEffect } from "react";
import * as faceapi from "face-api.js";
import { Camera, UserPlus, FileJson, Loader2, MapPin, Phone, Droplets, User, ChevronRight, Check, Database } from "lucide-react";
import { useRouter } from "next/navigation";

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
  });

  // Load face models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
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
        const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions());
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (detection) {
            const resizedDetection = faceapi.resizeResults(detection, displaySize);
            const box = resizedDetection.box;
            
            // Draw a green bounding box using primary color
            ctx.strokeStyle = "hsl(var(--primary))";
            ctx.lineWidth = 3;
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
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (detection) {
        setFaceDescriptor(JSON.stringify(Array.from(detection.descriptor)));
        // Capture a snapshot of the face
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.scale(-1, 1); // Flip horizontally because video is mirrored
          ctx.drawImage(videoRef.current, -canvas.width, 0, canvas.width, canvas.height);
          const base64Image = canvas.toDataURL("image/jpeg", 0.6);
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className={labelClass}>ชื่อ-นามสกุล <span className="text-destructive">*</span></label>
                  <input
                    type="text" required className={inputClass}
                    placeholder="เช่น สมชาย ใจดี"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
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

                <div>
                  <label className={labelClass}>รหัสนักเรียน / Username <span className="text-destructive">*</span></label>
                  <input
                    type="text" required className={inputClass}
                    placeholder="รหัสนักเรียน"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
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
