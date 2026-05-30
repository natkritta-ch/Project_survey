"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { get2FAStatus, generate2FASecret, verifyAndEnable2FA, disable2FA } from "./actions";
import { ShieldCheck, ShieldAlert, Loader2, QrCode, ArrowLeft, Copy, Check, LogOut } from "lucide-react";
import LogoutButton from "../../../components/LogoutButton";

export default function Security2FAPage() {
  const router = useRouter();
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Setup State
  const [setupMode, setSetupMode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);
  const [isForced, setIsForced] = useState(false);

  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).get('forced') === 'true';
    setIsForced(forced);
    get2FAStatus().then(res => {
      if (res.success) {
        setIsEnabled(res.isEnabled);
        if (!res.isEnabled && forced) {
          handleStartSetup();
          return; // handleStartSetup handles loading state
        }
      }
      setLoading(false);
    });
  }, []);

  const handleStartSetup = async () => {
    setLoading(true);
    setError("");
    const res = await generate2FASecret();
    if (res.success && res.qrCodeDataUrl) {
      setQrCodeUrl(res.qrCodeDataUrl);
      setSecret(res.secret || "");
      setSetupMode(true);
    } else {
      setError("ไม่สามารถสร้าง QR Code ได้");
    }
    setLoading(false);
  };

  const submitToken = async (token: string) => {
    setLoading(true);
    setError("");
    
    const res = await verifyAndEnable2FA(secret, token);
    if (res.success) {
      setSuccess("เปิดใช้งาน 2FA สำเร็จเรียบร้อยแล้ว!");
      setIsEnabled(true);
      setSetupMode(false);
      setVerifyToken("");
    } else {
      setError(res.error || "รหัส 2FA ไม่ถูกต้อง");
    }
    setLoading(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyToken.length === 6 && !loading) {
      submitToken(verifyToken);
    }
  };

  const handleDisable = async () => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการปิดการใช้งาน 2FA? ความปลอดภัยของบัญชีจะลดลง")) return;
    
    setLoading(true);
    const res = await disable2FA();
    if (res.success) {
      setIsEnabled(false);
      setSuccess("ปิดการใช้งาน 2FA แล้ว");
    }
    setLoading(false);
  };

  if (loading && !setupMode && !isEnabled) {
    return <div className="flex justify-center mt-20"><Loader2 className="animate-spin w-8 h-8 text-blue-500" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
      {!isForced ? (
        <button onClick={() => router.back()} className="mb-6 inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          <ArrowLeft className="w-4 h-4 mr-1" /> ย้อนกลับ
        </button>
      ) : (
        <div className="mb-6 flex justify-between items-center bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800">
          <span className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center">
            <ShieldAlert className="w-5 h-5 mr-2" />
            บังคับตั้งค่า: คุณต้องตั้งค่า 2FA ก่อนเข้าใช้งานระบบ
          </span>
          <LogoutButton />
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">ตั้งค่าความปลอดภัย 2 ชั้น (2FA)</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            ปกป้องบัญชีของคุณด้วยการยืนยันตัวตนแบบสองชั้นผ่าน Google Authenticator
          </p>

          {success && (
            <div className="bg-green-50 text-green-700 p-4 rounded-xl mb-6 shadow-sm border border-green-200">
              {success}
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 shadow-sm border border-red-200">
              {error}
            </div>
          )}

          {!setupMode && (
            <div className={`p-6 rounded-xl flex items-start gap-4 ${isEnabled ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800' : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800'}`}>
              <div className={`p-3 rounded-full ${isEnabled ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-800 dark:text-emerald-300' : 'bg-orange-100 text-orange-600 dark:bg-orange-800 dark:text-orange-300'}`}>
                {isEnabled ? <ShieldCheck className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  สถานะ: {isEnabled ? "เปิดใช้งานแล้ว" : "ยังไม่ได้เปิดใช้งาน"}
                </h3>
                <p className="text-sm mt-1 text-gray-600 dark:text-gray-400">
                  {isEnabled 
                    ? "บัญชีของคุณได้รับการปกป้องด้วย 2FA ทุกครั้งที่ลงชื่อเข้าใช้ระบบจะถามหารหัสผ่าน 6 หลักจากแอป Authenticator"
                    : "หากเปิดใช้งาน คุณจะต้องใช้รหัสจากแอป Google Authenticator ร่วมกับรหัสผ่านปกติในการเข้าสู่ระบบ"}
                </p>
                <div className="mt-4">
                  {isEnabled ? (
                    <div className="flex flex-wrap gap-3 items-center">
                      {isForced && (
                        <button onClick={() => window.location.href = '/'} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm shadow-sm transition">
                          เข้าสู่ระบบแดชบอร์ด →
                        </button>
                      )}
                      <button onClick={handleDisable} disabled={loading} className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium text-sm transition disabled:opacity-50">
                        ยกเลิก 2FA (ปิดการใช้งาน)
                      </button>
                    </div>
                  ) : (
                    <button onClick={handleStartSetup} disabled={loading} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm shadow-sm transition disabled:opacity-50">
                      {loading ? "กำลังโหลด..." : "ติดตั้งและเปิดใช้งาน 2FA"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {setupMode && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row gap-8 items-center bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                <div className="bg-white p-4 rounded-xl shadow-sm">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center bg-gray-100"><Loader2 className="animate-spin text-gray-400" /></div>
                  )}
                </div>
                <div className="flex-1 space-y-4">
                  <h3 className="font-bold text-gray-900 dark:text-white">ขั้นตอนที่ 1: สแกน QR Code</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    เปิดแอป Google Authenticator หรือแอป 2FA อื่นๆ บนมือถือของคุณ จากนั้นเลือกเมนูเพิ่มบัญชีด้วยการสแกนบาร์โค้ด
                  </p>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-between gap-2 mt-2">
                    <div className="text-xs font-mono break-all text-gray-500 text-left">
                      คีย์สำรอง:<br/>
                      <span className="font-bold text-gray-900 dark:text-gray-200 tracking-wider text-sm">{secret}</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(secret);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition shrink-0 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
                      title="คัดลอกคีย์"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800">
                <form onSubmit={handleVerify}>
                  <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-2">ขั้นตอนที่ 2: ยืนยันรหัส</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
                    พิมพ์รหัส 6 หลักที่ปรากฏในแอป Authenticator เพื่อยืนยันว่าคุณสแกนสำเร็จ
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mt-4">
                    <div className="relative w-full max-w-[160px]">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={verifyToken}
                        onChange={e => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setVerifyToken(val);
                          if (val.length === 6 && !loading) {
                            submitToken(val);
                          }
                        }}
                        className="w-full appearance-none tracking-[0.3em] font-mono text-2xl py-3 px-2 rounded-xl border-2 border-blue-200 dark:border-blue-700 dark:bg-gray-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-center transition-all"
                        placeholder="000000"
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={loading || verifyToken.length < 6}
                      className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-bold transition-all flex items-center justify-center shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "ยืนยันรหัส"}
                    </button>
                  </div>
                </form>
              </div>

              {!isForced && (
                <div className="text-center">
                  <button onClick={() => setSetupMode(false)} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 underline">
                    ยกเลิกการติดตั้ง
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
