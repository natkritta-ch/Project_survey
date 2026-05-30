"use client";

import { useState, useRef, useEffect } from "react";
import * as faceapi from "face-api.js";
import { Camera, Loader2, Save, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function StudentEditProfile({ canEdit }: { canEdit: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newFaceDescriptor, setNewFaceDescriptor] = useState<string | null>(null);
  const [newProfilePicture, setNewProfilePicture] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!canEdit) return;
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);
        setModelsLoaded(true);
      } catch (e) {
        console.error(e);
      }
    };
    loadModels();
  }, [canEdit]);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("ไม่สามารถเปิดกล้องได้: เบราว์เซอร์บล็อกการเข้าถึง (ต้องใช้ผ่าน HTTPS หรือ localhost เท่านั้น)");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActive(true);
      }
    } catch (e: any) {
      console.error("Camera access error:", e);
      alert("ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบสิทธิ์การเข้าถึงกล้องในเบราว์เซอร์");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  };

  const captureAndScanFace = async () => {
    if (!videoRef.current || !modelsLoaded) return;
    setIsScanning(true);
    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (detection) {
        setNewFaceDescriptor(JSON.stringify(Array.from(detection.descriptor)));
        // Capture snapshot
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.scale(-1, 1); // Flip horizontally
          ctx.drawImage(videoRef.current, -canvas.width, 0, canvas.width, canvas.height);
          setNewProfilePicture(canvas.toDataURL("image/jpeg", 0.6));
        }

        setMessage("อัปเดตใบหน้าใหม่สำเร็จ!");
        stopCamera();
      } else {
        setMessage("ไม่พบใบหน้า กรุณาลองอีกครั้ง");
      }
    } catch {
      setMessage("เกิดข้อผิดพลาดในการสแกน");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage("");
    try {
      const body: any = {};
      if (newFaceDescriptor) body.faceDescriptor = newFaceDescriptor;
      if (newProfilePicture) body.profilePicture = newProfilePicture;

      const res = await fetch('/api/student-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        setMessage("บันทึกข้อมูลสำเร็จ! กรุณารีเฟรชหน้าเพื่อดูผลลัพธ์");
        setNewFaceDescriptor(null);
        setNewProfilePicture(null);
      } else {
        setMessage("เกิดข้อผิดพลาด: " + data.message);
      }
    } catch {
      setMessage("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSaving(false);
    }
  };

  if (!canEdit) {
    return (
      <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 text-center shadow-inner">
        <ShieldCheck className="w-10 h-10 text-slate-400 mx-auto mb-3 opacity-80" />
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          การแก้ไขข้อมูลส่วนตัวถูกล็อกอยู่<br/>
          <span className="text-xs mt-1 block">กรุณาติดต่อหัวหน้าแผนกเพื่อเปิดสิทธิ์การแก้ไข</span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-emerald-50/50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
        <ShieldCheck className="w-5 h-5 text-emerald-500" />
        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">หัวหน้าแผนกได้เปิดสิทธิ์แก้ไขให้คุณแล้ว</span>
      </div>



      <div className="mt-2">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">แสกนใบหน้าใหม่เพื่ออัปเดตข้อมูล <span className="text-slate-400 font-normal text-xs ml-1">(ถ่ายรูปใหม่)</span></p>
        
        <div className={`relative rounded-lg overflow-hidden w-full aspect-video bg-black mb-3 ${streamActive ? 'block' : 'hidden'}`}>
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
        </div>

        {!streamActive && !newFaceDescriptor && (
          <div className="w-full aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-3">
            <Camera className="w-10 h-10 text-gray-400" />
          </div>
        )}

        <div className="flex gap-3">
          {!streamActive ? (
            <button
              type="button"
              onClick={startCamera}
              disabled={!modelsLoaded}
              className="flex items-center px-4 py-2 text-sm font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              {!modelsLoaded ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Camera className="w-4 h-4 mr-2" />}
              {modelsLoaded ? 'เปิดกล้องเพื่ออัปเดตใบหน้า' : 'กำลังโหลดระบบ AI...'}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={captureAndScanFace}
                disabled={isScanning}
                className="flex items-center px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:-translate-y-0.5 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:hover:translate-y-0"
              >
                {isScanning ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Camera className="w-4 h-4 mr-2" />}
                ถ่ายอัปเดต
              </button>
              <button type="button" onClick={stopCamera} className="px-4 py-2 text-sm font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors active:scale-95">
                ปิดกล้อง
              </button>
            </>
          )}
        </div>

        {newFaceDescriptor && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium rounded-lg border border-emerald-100 dark:border-emerald-800/30 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> อัปเดตโครงสร้างใบหน้าใหม่แล้ว (กดบันทึกเพื่อยืนยัน)
          </div>
        )}
      </div>

      {/* ปุ่มบันทึก */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full flex items-center justify-center py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl shadow-md shadow-indigo-500/20 hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:hover:translate-y-0 mt-6"
      >
        {isSaving ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />}
        บันทึกการแก้ไข
      </button>

      {message && (
        <div className={`p-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 mt-4
          ${message.includes("สำเร็จ") 
            ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800/30 dark:text-emerald-400" 
            : "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800/30 dark:text-rose-400"
          }`}
        >
          {message.includes("สำเร็จ") ? <CheckCircle2 className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
          {message}
        </div>
      )}
    </div>
  );
}
