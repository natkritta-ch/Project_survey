"use client";

import React from "react";
import LogoutButton from "@/components/LogoutButton";
import { Users, Clock, AlertTriangle, Phone, RefreshCw, ShieldAlert, GraduationCap } from "lucide-react";

interface TwinPendingProps {
  student: {
    name: string;
    username: string;
    level?: string | null;
    twinNote?: string | null;
  };
  advisorInfo?: {
    primaryAdvisor?: { name: string; phone?: string | null } | null;
    coAdvisor?: { name: string; phone?: string | null } | null;
  } | null;
}

export default function TwinPendingApproval({ student, advisorInfo }: TwinPendingProps) {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Animated Badge Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
              <Users className="w-10 h-10 animate-pulse" />
            </div>
            <span className="absolute -bottom-1 -right-1 p-2 bg-amber-500 text-white rounded-full shadow-md">
              <Clock className="w-4 h-4" />
            </span>
          </div>
        </div>

        {/* Title & Description */}
        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-2">
            อยู่ระหว่างรอการยืนยันตัวตนคู่แฝด
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            เนื่องจากท่านระบุว่ามีพี่น้องฝาแฝดในระบบ เพื่อความปลอดภัยและการป้องกันการใช้ใบหน้าทับซ้อน <strong>อาจารย์ที่ปรึกษาจำเป็นต้องอนุมัติยืนยันตัวตน</strong> ก่อน จึงจะสามารถเริ่มสแกนใบหน้าเข้าเรียนและใช้งานระบบได้
          </p>
        </div>

        {/* ข้อมูลนักเรียน */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 mb-5 space-y-2 text-xs">
          <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-800">
            <span className="text-gray-400">ชื่อ - นามสกุล:</span>
            <span className="font-bold text-gray-800 dark:text-white">{student.name}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-800">
            <span className="text-gray-400">รหัสนักเรียน:</span>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{student.username}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-800">
            <span className="text-gray-400">ระดับชั้น:</span>
            <span className="font-semibold text-gray-700 dark:text-gray-300">{student.level || "ไม่ระบุ"}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-gray-400">คู่แฝดที่ระบุ:</span>
            <span className="font-semibold text-purple-600 dark:text-purple-400">{student.twinNote || "-"}</span>
          </div>
        </div>

        {/* ข้อมูลอาจารย์ที่ปรึกษาเพื่อติดต่อ */}
        <div className="bg-indigo-50/70 dark:bg-indigo-950/30 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 mb-6">
          <div className="flex items-center gap-2 mb-2 text-indigo-900 dark:text-indigo-200 font-bold text-xs">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            <span>ช่องทางติดต่ออาจารย์ที่ปรึกษาประจำชั้น</span>
          </div>

          {advisorInfo?.primaryAdvisor ? (
            <div className="space-y-1.5 text-xs text-indigo-800 dark:text-indigo-300">
              <p className="font-bold text-sm">
                อาจารย์ {advisorInfo.primaryAdvisor.name}
                {advisorInfo.coAdvisor && ` (และ อ. ${advisorInfo.coAdvisor.name})`}
              </p>
              {advisorInfo.primaryAdvisor.phone ? (
                <a
                  href={`tel:${advisorInfo.primaryAdvisor.phone}`}
                  className="inline-flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-semibold hover:underline mt-1"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-500" />
                  โทร: {advisorInfo.primaryAdvisor.phone}
                </a>
              ) : (
                <p className="text-[11px] text-gray-500">กรุณาติดต่อที่ห้องพักครูแผนกวิชา</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              กรุณาติดต่อหัวหน้าแผนกวิชา หรือห้องพักครูแผนกวิชาเพื่อดำเนินการอนุมัติบัญชี
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition active:scale-95 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            ตรวจสอบสถานะการอนุมัติอีกครั้ง
          </button>
          
          <div className="pt-2 text-center">
            <LogoutButton />
          </div>
        </div>

      </div>
    </div>
  );
}
