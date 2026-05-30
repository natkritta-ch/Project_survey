"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LogIn, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ username: "", password: "", totpCode: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const executeLogin = async (totpCodeToUse: string = formData.totpCode) => {
    setIsLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        redirect: false,
        username: formData.username.trim(),
        password: formData.password,
        totpCode: totpCodeToUse,
      });

      if (res?.error) {
        if (res.error === "2FA_REQUIRED") {
          setNeeds2FA(true);
          setError(""); 
        } else if (res.error === "INVALID_2FA_CODE") {
          setError("รหัส 2FA (Authenticator) ไม่ถูกต้อง");
        } else {
          setError("ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง");
        }
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeLogin();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Left side: Branding / Image */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 relative overflow-hidden flex-col justify-center items-center p-12 text-primary-foreground">
        {/* Background Image */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-10000 hover:scale-105"
          style={{ backgroundImage: 'url("/Imagesurvey1.png")' }}
        ></div>
        
        {/* Color Overlay */}
        <div className="absolute inset-0 bg-primary/80 mix-blend-multiply z-0"></div>
        <div className="absolute inset-0 bg-black/40 z-0"></div>
        
        {/* Subtle decorative background pattern */}
        <div className="absolute inset-0 opacity-20 z-0" style={{ backgroundSize: '20px 20px', backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)' }}></div>
        
        <div className="z-10 text-center max-w-lg relative backdrop-blur-md bg-black/20 p-10 rounded-3xl border border-white/10 shadow-2xl">
          <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-white/20 p-1 bg-white shadow-2xl mb-8 transform transition-transform hover:scale-105">
            <img 
              src="/Logosurvey.jpg" 
              alt="โลโก้แผนกเทคนิควิศวกรรมสำรวจ" 
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <h1 className="text-[var(--text-4xl)] font-bold mb-4 tracking-tight leading-tight text-white drop-shadow-md">ระบบเช็คชื่อ ผ่านการสแกนใบหน้า</h1>
          <p className="text-[var(--text-lg)] text-white/90 mt-4 font-medium drop-shadow">
            แผนกวิชาเทคนิควิศวกรรมสำรวจ วิทยาลัยเทคนิคแพร่<br/>
            ตรงเวลา สามัคคี มีวินัย ตั้งใจศึกษา รับผิดชอบต่อหน้าที่ <br/> เป็นศักดิ์ศรีช่างสำรวจ
          </p>
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 md:p-16 lg:p-24 bg-card relative">
        <div className="w-full max-w-md mx-auto space-y-8 relative z-10">
          
          <div className="text-center md:text-left">
            <div className="md:hidden w-20 h-20 mx-auto rounded-full overflow-hidden border-2 border-border p-1 bg-white shadow-sm mb-6">
              <img 
                src="/Logosurvey.jpg" 
                alt="โลโก้แผนกเทคนิควิศวกรรมสำรวจ" 
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <h2 className="text-[var(--text-3xl)] font-bold text-foreground tracking-tight">
              ยินดีต้อนรับ
            </h2>
            <p className="mt-2 text-[var(--text-sm)] text-muted-foreground">
              เข้าสู่ระบบเพื่อจัดการข้อมูลการเข้าเรียน
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-destructive/10 border-l-4 border-destructive text-destructive p-4 rounded-md text-sm animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}
            
            {needs2FA ? (
              <div className="bg-muted/50 p-6 rounded-xl border border-border space-y-4 animate-in fade-in zoom-in-95">
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-3 text-primary">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">ยืนยันตัวตนแบบสองชั้น</h3>
                  <p className="text-sm text-muted-foreground mt-1">กรุณากรอกรหัส 6 หลักจาก Authenticator</p>
                </div>
                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    maxLength={6}
                    className="tracking-[0.5em] text-center font-mono text-2xl flex h-14 w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                    placeholder="------"
                    value={formData.totpCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setFormData({...formData, totpCode: val});
                      if (val.length === 6 && !isLoading) {
                        executeLogin(val);
                      }
                    }}
                  />
                </div>
                <div className="text-center pt-2">
                  <button type="button" onClick={() => setNeeds2FA(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    ยกเลิก / กลับไปหน้าเข้าสู่ระบบ
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">ชื่อผู้ใช้งาน</label>
                    <input
                      type="text"
                      required
                      className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                      placeholder="Username"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">รหัสผ่าน</label>
                      <a href="/forgot-password" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                        ลืมรหัสผ่าน?
                      </a>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="remember"
                    className="h-4 w-4 shrink-0 rounded-sm border border-input text-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <label htmlFor="remember" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground cursor-pointer">
                    จดจำฉันไว้ในระบบ
                  </label>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-12 w-full shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  เข้าสู่ระบบ
                </>
              )}
            </button>

            {!needs2FA && (
              <div className="pt-6 border-t border-border mt-6">
                <div className="flex flex-col space-y-4 text-center text-sm text-muted-foreground">
                  <div>
                    ยังไม่มีบัญชีนักเรียนใช่หรือไม่?{" "}
                    <a href="/register" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                      ลงทะเบียนนักเรียนใหม่
                    </a>
                  </div>
                  <div>
                    สำหรับผู้ปกครอง?{" "}
                    <a href="/register/parent" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                      ลงทะเบียนผู้ปกครอง
                    </a>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
