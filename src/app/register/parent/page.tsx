"use client";

import { useState } from "react";
import { UserPlus, Loader2, KeyRound, Eye, EyeOff, ShieldCheck, ArrowLeft } from "lucide-react";
import { showSuccess, showError } from "@/lib/alerts";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ParentRegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
    phone: "",
    address: "",
    email: "",
    parentCode: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.parentCode.trim()) {
      showError("ข้อมูลไม่ครบถ้วน", "กรุณาระบุรหัสผูกผู้ปกครอง (Parent Code)");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/register/parent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          parentCode: formData.parentCode.trim().toUpperCase(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        await showSuccess("สมัครสมาชิกสำเร็จ", data.message || "สมัครบัญชีผู้ปกครองและผูกข้อมูลกับนักเรียนเรียบร้อยแล้ว");
        setFormData({ name: "", username: "", password: "", phone: "", address: "", email: "", parentCode: "" });
        router.push("/login");
      } else {
        showError("สมัครสมาชิกล้มเหลว", data.message || "กรุณาตรวจสอบข้อมูลแล้วลองใหม่อีกครั้ง");
      }
    } catch (error) {
      console.error(error);
      showError("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์หรือส่งข้อมูลได้");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-slate-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-6 bg-white dark:bg-gray-800/90 backdrop-blur-md p-8 sm:p-10 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700">
        
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 mb-3 shadow-inner">
            <UserPlus className="w-7 h-7" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            ลงทะเบียนผู้ปกครอง
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            ระบบติดตามการเข้าเรียนและพฤติกรรมของนักเรียนแบบเรียลไทม์
          </p>
        </div>

        {/* Security Notice Card */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 flex gap-3 items-start shadow-sm">
          <KeyRound className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-bold">ระบบผูกข้อมูลทันทีด้วย Parent Code:</p>
            <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
              ผู้ปกครองสามารถใช้ <b>รหัสผูกผู้ปกครอง</b> ที่ได้รับจากแผนกวิชา / วันประชุมผู้ปกครอง กรอกเพื่อเชื่อมโยงข้อมูลกับบุตรหลานได้ทันทีโดยไม่ต้องรอนักเรียนอนุมัติ
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          {/* Parent Code Input - Hero Input */}
          <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 space-y-2">
            <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">
              รหัสผูกผู้ปกครอง (Parent Code) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-indigo-300 dark:border-indigo-700 placeholder-indigo-300 dark:placeholder-indigo-600 text-indigo-900 dark:text-white font-mono font-bold text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase tracking-widest bg-white dark:bg-gray-800 shadow-sm"
                placeholder="เช่น P-7492-8K2M"
                value={formData.parentCode}
                onChange={(e) => setFormData({ ...formData, parentCode: e.target.value.toUpperCase() })}
              />
            </div>
            <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
              * รับรหัสนี้ได้จากแผนกวิชา อาจารย์ที่ปรึกษา หรือในวันประชุมผู้ปกครอง
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                ชื่อ-นามสกุล ผู้ปกครอง <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className="appearance-none rounded-xl relative block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700"
                placeholder="นาย/นาง/นางสาว สมชาย ใจดี"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                ชื่อผู้ใช้งาน (Username) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className="appearance-none rounded-xl relative block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700"
                placeholder="สำหรับเข้าสู่ระบบ"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                รหัสผ่าน <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="appearance-none rounded-xl relative block w-full px-3 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700"
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  title={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                เบอร์โทรศัพท์ติดต่อ <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                className="appearance-none rounded-xl relative block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700"
                placeholder="08X-XXX-XXXX"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                อีเมล <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                className="appearance-none rounded-xl relative block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700"
                placeholder="example@mail.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                ที่อยู่ปัจจุบัน
              </label>
              <textarea
                rows={2}
                className="appearance-none rounded-xl relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm resize-none dark:bg-gray-700"
                placeholder="บ้านเลขที่ ตำบล อำเภอ จังหวัด (ไม่จำเป็นต้องระบุ)"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-2xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 transition shadow-lg shadow-indigo-500/25 active:scale-[0.99]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-5 w-5" />
                  กำลังลงทะเบียนและตรวจสอบรหัส...
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-5 w-5" />
                  ลงทะเบียนและเชื่อมต่อข้อมูล
                </>
              )}
            </button>
          </div>
        </form>

        <div className="text-center pt-2 border-t border-gray-100 dark:border-gray-700">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 transition"
          >
            <ArrowLeft className="w-4 h-4" /> กลับสู่หน้าเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </div>
  );
}
