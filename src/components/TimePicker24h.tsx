"use client";

import React, { useState, useRef, useEffect } from "react";
import { Clock, Check, X, Sparkles, ChevronDown } from "lucide-react";

interface TimePicker24hProps {
  value: string; // "HH:mm" e.g. "08:30", "19:30"
  onChange: (val: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  colorTheme?: "amber" | "indigo";
}

export default function TimePicker24h({
  value = "08:00",
  onChange,
  label,
  required = false,
  disabled = false,
  className = "",
  colorTheme = "amber"
}: TimePicker24hProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);

  // แยกค่าชั่วโมงและนาที
  const parts = (value || "08:00").split(":");
  const currentHour = (parts[0] || "08").padStart(2, "0");
  const currentMinute = (parts[1] || "00").padStart(2, "0");

  const [selectedH, setSelectedH] = useState(currentHour);
  const [selectedM, setSelectedM] = useState(currentMinute);

  // ซิงค์ค่าเมื่อ value จากข้างนอกเปลี่ยน
  useEffect(() => {
    if (value && value.includes(":")) {
      const p = value.split(":");
      setSelectedH((p[0] || "08").padStart(2, "0"));
      setSelectedM((p[1] || "00").padStart(2, "0"));
    }
  }, [value]);

  // ปิด popup เมื่อคลิกนอกกล่อง
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // เลื่อน scroll ไปยังตำแหน่งที่เลือกเมื่อเปิด popup
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const hIndex = parseInt(selectedH, 10);
        const mIndex = parseInt(selectedM, 10);
        if (hourListRef.current) {
          hourListRef.current.scrollTop = Math.max(0, hIndex * 34 - 60);
        }
        if (minuteListRef.current) {
          minuteListRef.current.scrollTop = Math.max(0, mIndex * 34 - 60);
        }
      }, 50);
    }
  }, [isOpen, selectedH, selectedM]);

  const handleSelectHour = (h: string) => {
    setSelectedH(h);
    const newTime = `${h}:${selectedM}`;
    onChange(newTime);
  };

  const handleSelectMinute = (m: string) => {
    setSelectedM(m);
    const newTime = `${selectedH}:${m}`;
    onChange(newTime);
  };

  const handleSetQuickTime = (timeStr: string) => {
    const [h, m] = timeStr.split(":");
    setSelectedH(h);
    setSelectedM(m);
    onChange(timeStr);
  };

  const handleSetCurrentTime = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    handleSetQuickTime(`${h}:${m}`);
  };

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
  const quickMinutes = ["00", "15", "30", "45"];
  const quickPresets = ["08:30", "09:00", "11:30", "13:00", "15:00", "17:00", "19:00"];

  const themeClasses = colorTheme === "indigo" ? {
    ring: "focus-within:ring-indigo-500 border-indigo-300 dark:border-indigo-700",
    bgActive: "bg-indigo-600 text-white font-bold shadow-sm",
    btnActive: "bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300",
    header: "text-indigo-600 dark:text-indigo-400",
    submitBtn: "bg-indigo-600 hover:bg-indigo-700 text-white"
  } : {
    ring: "focus-within:ring-amber-500 border-amber-300 dark:border-amber-700",
    bgActive: "bg-amber-600 text-white font-bold shadow-sm",
    btnActive: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300",
    header: "text-amber-600 dark:text-amber-400",
    submitBtn: "bg-amber-600 hover:bg-amber-700 text-white"
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] font-semibold text-gray-400">ระบบ 24 ชม.</span>
        </label>
      )}

      {/* Input Field แสดงผลและคลิกเปิด Popup */}
      <div
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        className={`w-full flex items-center justify-between rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 py-2.5 px-3.5 text-sm cursor-pointer transition-all shadow-sm select-none ${
          isOpen ? `ring-2 ${themeClasses.ring}` : "hover:border-gray-400 dark:hover:border-gray-600"
        } ${disabled ? "opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800" : ""}`}
      >
        <div className="flex items-center gap-2 font-mono text-base font-bold text-gray-900 dark:text-white">
          <Clock className={`w-4 h-4 ${colorTheme === 'indigo' ? 'text-indigo-500' : 'text-amber-500'} shrink-0`} />
          <span>{selectedH}:{selectedM}</span>
          <span className="text-xs font-sans text-gray-400 font-normal">น.</span>
        </div>

        <div className="flex items-center gap-1.5 text-gray-400">
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-sans font-medium">
            24h
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>

      {/* Hidden input for form validation if required */}
      {required && (
        <input
          type="text"
          value={value}
          required={required}
          readOnly
          className="sr-only"
          tabIndex={-1}
        />
      )}

      {/* Popup ตัวเลือกเวลา 24 ชั่วโมง (ผุดขึ้นมา) */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl z-50 p-3.5 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">เลือกเวลา</span>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                {selectedH}:{selectedM} น.
              </span>
            </div>
            <button
              type="button"
              onClick={handleSetCurrentTime}
              className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              เวลาตอนนี้
            </button>
          </div>

          {/* สองคอลัมน์: ชั่วโมง (00-23) และ นาที (00-59) */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {/* คอลัมน์ชั่วโมง */}
            <div>
              <div className="text-[11px] font-bold text-gray-400 dark:text-gray-400 mb-1.5 text-center">
                ชั่วโมง (00 - 23)
              </div>
              <div
                ref={hourListRef}
                className="h-44 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700"
              >
                {hours.map((h) => {
                  const isSelected = h === selectedH;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleSelectHour(h)}
                      className={`w-full py-1.5 px-2 rounded-xl text-center font-mono text-sm transition-all ${
                        isSelected
                          ? themeClasses.bgActive
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium"
                      }`}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* คอลัมน์นาที */}
            <div>
              <div className="text-[11px] font-bold text-gray-400 dark:text-gray-400 mb-1.5 text-center">
                นาที (00 - 59)
              </div>
              <div
                ref={minuteListRef}
                className="h-44 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700"
              >
                {minutes.map((m) => {
                  const isSelected = m === selectedM;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectMinute(m)}
                      className={`w-full py-1.5 px-2 rounded-xl text-center font-mono text-sm transition-all ${
                        isSelected
                          ? themeClasses.bgActive
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium"
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Minute Selection */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700 mb-2.5">
            <div className="text-[10px] font-bold text-gray-400 mb-1.5">นาทีด่วน:</div>
            <div className="flex gap-1.5">
              {quickMinutes.map((qm) => (
                <button
                  key={qm}
                  type="button"
                  onClick={() => handleSelectMinute(qm)}
                  className={`flex-1 py-1 text-xs font-mono rounded-lg border transition ${
                    selectedM === qm
                      ? themeClasses.btnActive
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  :{qm}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Presets */}
          <div className="mb-3">
            <div className="text-[10px] font-bold text-gray-400 mb-1.5">เวลาที่พบบ่อย:</div>
            <div className="flex flex-wrap gap-1">
              {quickPresets.map((pt) => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => handleSetQuickTime(pt)}
                  className="px-2 py-0.5 text-[11px] font-mono rounded-md bg-gray-50 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-amber-100 hover:text-amber-800 dark:hover:bg-amber-900/40 dark:hover:text-amber-300 transition"
                >
                  {pt}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Close Button */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm ${themeClasses.submitBtn}`}
          >
            <Check className="w-3.5 h-3.5" />
            ตกลง ({selectedH}:{selectedM} น.)
          </button>
        </div>
      )}
    </div>
  );
}
