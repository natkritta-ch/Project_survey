"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check, X, User } from "lucide-react";

export interface TeacherOption {
  id: string;
  name: string;
  username: string;
  nickname?: string | null;
  phone?: string | null;
  role?: string;
}

interface SearchableTeacherSelectProps {
  teachers: TeacherOption[];
  value?: string | null;
  onChange: (teacherId: string | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  clearLabel?: string;
  disabled?: boolean;
  className?: string;
}

export default function SearchableTeacherSelect({
  teachers,
  value,
  onChange,
  placeholder = "เลือกอาจารย์...",
  allowClear = true,
  clearLabel = "-- ไม่ระบุ / ไม่มี --",
  disabled = false,
  className = ""
}: SearchableTeacherSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // หาอาจารย์ที่ถูกเลือกปัจจุบัน
  const selectedTeacher = teachers.find(t => t.id === value);

  // ปิดเมนูเมื่อคลิกด้านนอก
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // โฟกัสช่องค้นหาอัตโนมัติเมื่อเปิด
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // กรองรายชื่ออาจารย์ตามคำค้นหา
  const filteredTeachers = teachers.filter(t => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = (t.name || "").toLowerCase().includes(term);
    const userMatch = (t.username || "").toLowerCase().includes(term);
    const nickMatch = (t.nickname || "").toLowerCase().includes(term);
    return nameMatch || userMatch || nickMatch;
  });

  const handleSelect = (teacherId: string | null) => {
    onChange(teacherId);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* ปุ่มกดเปิด Dropdown */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between text-left text-xs px-3 py-2 rounded-xl border transition-all ${
          disabled 
            ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700" 
            : isOpen 
              ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" 
              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-200"
        }`}
      >
        <div className="flex items-center gap-2 truncate pr-2">
          <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          {selectedTeacher ? (
            <span className="font-medium text-gray-900 dark:text-white truncate">
              {selectedTeacher.name}
              {selectedTeacher.nickname && (
                <span className="text-gray-400 dark:text-gray-400 text-[11px] ml-1">
                  ({selectedTeacher.nickname})
                </span>
              )}
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {allowClear && selectedTeacher && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(null);
              }}
              className="p-1 text-gray-400 hover:text-rose-500 rounded-md transition"
              title="ล้างตัวเลือก"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? "rotate-180 text-indigo-500" : ""}`} />
        </div>
      </button>

      {/* Popover Dropdown พร้อมช่องค้นหา */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* ช่องพิมพ์ค้นหา (Search Input) */}
          <div className="p-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/40">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="พิมพ์ค้นหาชื่ออาจารย์, รหัส, ชื่อเล่น..."
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* รายการตัวเลือก (Options List) */}
          <div className="max-h-56 overflow-y-auto py-1 divide-y divide-gray-50 dark:divide-gray-700/30">
            {allowClear && (
              <div
                onClick={() => handleSelect(null)}
                className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${
                  !value ? "text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50/50 dark:bg-indigo-950/20" : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <span>{clearLabel}</span>
                {!value && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
              </div>
            )}

            {filteredTeachers.length > 0 ? (
              filteredTeachers.map((t) => {
                const isSelected = t.id === value;
                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelect(t.id)}
                    className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition ${
                      isSelected ? "bg-indigo-50 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-200 font-bold" : "text-gray-800 dark:text-gray-200"
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate">{t.name}</span>
                        {t.nickname && (
                          <span className="text-[11px] text-gray-400 font-normal shrink-0">
                            ({t.nickname})
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 truncate">
                        รหัส: {t.username} {t.phone ? `• โทร ${t.phone}` : ""}
                      </span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 ml-2" />}
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-gray-400">
                ไม่พบรายชื่ออาจารย์ที่ค้นหา
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
