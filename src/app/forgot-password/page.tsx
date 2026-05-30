"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldCheck, Loader2, ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import { sendOtp, verifyOtp, updatePassword } from "./actions";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Step 1 Data
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");

  // Step 3 Data
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await sendOtp(username.trim(), email.trim());
      if (res.success && res.displayEmail) {
        setMaskedEmail(res.displayEmail);
        setStep(2);
        if (res.mockOtp) {
          setTimeout(() => alert(`[ระบบทดสอบ - ไม่ได้ส่งอีเมลจริง]\nรหัส OTP 6 หลักของคุณคือ: ${res.mockOtp}\n(มีอายุการใช้งาน 5 นาที)`), 500);
        }
      } else {
        setError(res.error || "ไม่สามารถส่ง OTP ได้");
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await verifyOtp(username.trim(), otpCode.trim());
      if (res.success) {
        setStep(3);
      } else {
        setError(res.error || "รหัส OTP ไม่ถูกต้อง");
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return setError("รหัสผ่านใหม่ไม่ตรงกัน กรุณาพิมพ์ให้เหมือนกันทั้ง 2 ช่อง");
    }
    
    setIsLoading(true);
    setError("");

    try {
      // Pass username instead of verifiedUserId
      const res = await updatePassword(username.trim(), newPassword);
      if (res.success) {
        setSuccessMsg("เปลี่ยนรหัสผ่านสำเร็จแล้ว! กรุณากลับไปเข้าสู่ระบบ");
        setStep(3); // Show Success UI
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        setError(res.error || "เกิดข้อผิดพลาด ไม่สามารถเปลี่ยนรหัสผ่านได้");
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
        
        {step === 1 && (
          <>
            <div>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/50">
                <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="mt-4 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                ตั้งรหัสผ่านใหม่
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                ยืนยันตัวตนด้วยรหัสนักเรียน/อาจารย์ และ อีเมลที่ลงทะเบียนไว้
              </p>
            </div>
            
            <form className="mt-8 space-y-6" onSubmit={handleSendOtp}>
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md text-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">รหัสประจำตัว (Username)</label>
                  <input
                    type="text"
                    required
                    className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 bg-white placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                    placeholder="เช่น 66020000"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">อีเมลที่ลงทะเบียนไว้</label>
                  <input
                    type="email"
                    required
                    className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 bg-white placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                    placeholder="example@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading || !username || !email}
                  className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition"
                >
                  {isLoading ? <><Loader2 className="animate-spin mr-2 h-5 w-5" /> ตรวจสอบข้อมูล...</> : <><Send className="mr-2 h-5 w-5" /> ขอรับรหัส OTP</>}
                </button>
              </div>
              
              <div className="text-center">
                 <button type="button" onClick={() => router.push('/login')} className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                    <ArrowLeft className="w-4 h-4 mr-1" /> กลับไปหน้าเข้าสู่ระบบ
                 </button>
              </div>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/50">
                <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="mt-4 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                ยืนยันรหัส OTP
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                กรุณากรอกรหัส 6 หลักที่ถูกส่งไปยังอีเมล<br/>
                <span className="font-bold text-blue-600 dark:text-blue-400">{maskedEmail}</span>
              </p>
            </div>
            
            <form className="mt-8 space-y-6" onSubmit={handleVerifyOtp}>
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md text-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    className="tracking-[0.5em] text-center font-mono text-2xl appearance-none rounded-lg relative block w-full px-3 py-4 border border-gray-300 bg-white placeholder-gray-300 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="------"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading || otpCode.length < 6}
                  className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition"
                >
                  {isLoading ? <><Loader2 className="animate-spin mr-2 h-5 w-5" /> ตรวจสอบ...</> : <><CheckCircle2 className="mr-2 h-5 w-5" /> ยืนยัน OTP</>}
                </button>
              </div>

              <div className="text-center">
                 <button type="button" onClick={() => setStep(1)} className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                    เปลี่ยนอีเมล
                 </button>
              </div>
            </form>
          </>
        )}

        {step === 3 && (
          <>
            <div>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                <KeyRound className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="mt-4 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                ยืนยันตัวตนสำเร็จ
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                คุณสามารถตั้งรหัสผ่านใหม่สำหรับ Username: <span className="font-bold">{username}</span> ได้เลย
              </p>
            </div>
            
            <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md text-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">รหัสผ่านใหม่</label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 bg-white placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="รหัสผ่านใหม่อย่างน้อย 4 ตัวอักษร"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ยืนยันรหัสผ่านใหม่อีกครั้ง</label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 bg-white placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="พิมพ์รหัสผ่านใหม่ให้ตรงกับด้านบน"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading || !newPassword || !confirmPassword}
                  className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition"
                >
                  {isLoading ? <><Loader2 className="animate-spin mr-2 h-5 w-5" /> กำลังบันทึก...</> : "บันทึกรหัสผ่านใหม่"}
                </button>
              </div>
            </form>
          </>
        )}

        {step === 4 && (
           <div className="text-center py-8">
             <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/50 mb-6">
                <ShieldCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
             <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">เรียบร้อย!</h3>
             <p className="text-emerald-600 dark:text-emerald-400 font-medium">{successMsg}</p>
             <p className="text-sm text-gray-500 mt-6 flex items-center justify-center"><Loader2 className="animate-spin w-4 h-4 mr-2" /> กำลังพากลับไปหน้าล็อคอิน...</p>
           </div>
        )}
      </div>
    </div>
  );
}
