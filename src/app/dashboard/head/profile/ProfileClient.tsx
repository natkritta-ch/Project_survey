"use client";

import { useState } from "react";
import { ArrowLeft, Save, Loader2, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateUser } from "../actions";

export default function ProfileClient({ user }: { user: any }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || "",
    username: user.username || "",
    password: "",
    phone: user.phone || "",
    email: user.email || "",
    address: user.address || "",
    nickname: user.nickname || "",
  });

  const [message, setMessage] = useState({ type: "", text: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const dataToSave = { ...formData };
      if (!dataToSave.password) {
        delete (dataToSave as any).password;
      }
      if (!dataToSave.email) {
        (dataToSave as any).email = null;
      }
      
      await updateUser(user.id, dataToSave);
      setMessage({ type: "success", text: "บันทึกข้อมูลสำเร็จ" });
      setFormData(prev => ({ ...prev, password: "" })); // Clear password field after save
    } catch (err: any) {
      setMessage({ type: "error", text: "เกิดข้อผิดพลาด หรือ Username นี้มีผู้ใช้งานแล้ว" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push("/dashboard/head")}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <UserIcon className="w-6 h-6 text-indigo-500" />
              แก้ไขข้อมูลส่วนตัว
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">อัปเดตข้อมูลบัญชีหัวหน้าแผนก</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {message.text && (
          <div className={`p-4 mb-6 rounded-lg border flex items-center justify-between ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300' : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300'}`}>
            <span>{message.text}</span>
            <button onClick={() => setMessage({ type: "", text: "" })} className="text-sm underline hover:opacity-70">ปิด</button>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
              <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 py-2 border dark:bg-slate-900 dark:border-slate-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ชื่อเล่น</label>
              <input type="text" name="nickname" value={formData.nickname} onChange={handleChange} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 py-2 border dark:bg-slate-900 dark:border-slate-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Username <span className="text-red-500">*</span></label>
              <input required type="text" name="username" value={formData.username} onChange={handleChange} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 py-2 border dark:bg-slate-900 dark:border-slate-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">รหัสผ่านใหม่ (เว้นว่างไว้หากไม่เปลี่ยน)</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" className="w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 py-2 border dark:bg-slate-900 dark:border-slate-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">เบอร์โทรศัพท์</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 py-2 border dark:bg-slate-900 dark:border-slate-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">อีเมล</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 py-2 border dark:bg-slate-900 dark:border-slate-600 dark:text-white" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ที่อยู่ติดต่อ</label>
              <textarea name="address" value={formData.address} onChange={handleChange} rows={3} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 py-2 border dark:bg-slate-900 dark:border-slate-600 dark:text-white"></textarea>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              type="submit" 
              disabled={isLoading}
              className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {isLoading ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
