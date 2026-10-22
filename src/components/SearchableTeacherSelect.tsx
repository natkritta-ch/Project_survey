"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, X, User } from "lucide-react";

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
  const inputRef = useRef<HTMLInputElement>(null);

  // หาอาจารย์ที่ถูกเลือกปัจจุบัน
  const selectedTeacher = teachers.find(t => t.id === value);

  // อัปเดต searchTerm เมื่อไม่ได้เปิด dropdown เพื่อให้แสดงชื่อครูที่เลือกอยู่
  useEffect(() => {
    if (!isOpen) {
      if (selectedTeacher) {
        setSearchTerm(selectedTeacher.name + (selectedTeacher.nickname ? ` (${selectedTeacher.nickname})` : ""));
      } else {
        setSearchTerm("");
      }
    }
  }, [value, selectedTeacher, isOpen]);

  // ปิดเมนูเมื่อคลิกด้านนอก
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (selectedTeacher) {
          setSearchTerm(selectedTeacher.name + (selectedTeacher.nickname ? ` (${selectedTeacher.nickname})` : ""));
        } else {
          setSearchTerm("");
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedTeacher]);

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
    if (!teacherId) {
      setSearchTerm("");
    } else {
      const chosen = teachers.find(t => t.id === teacherId);
      if (chosen) {
        setSearchTerm(chosen.name + (chosen.nickname ? ` (${chosen.nickname})` : ""));
      }
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* ช่องพิมพ์ค้นหาโดยตรง (Direct Searchable Input) */}
      <div className="relative flex items-center">
        <div className="absolute left-3 pointer-events-none text-gray-400">
          <User className="w-3.5 h-3.5" />
        </div>
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            if (!e.target.value && allowClear) {
              onChange(null);
            }
          }}
          onFocus={(e) => {
            setIsOpen(true);
            e.target.select();
          }}
          placeholder={placeholder}
          className={`w-full text-xs pl-8 pr-14 py-2 rounded-xl border transition-all ${
            disabled 
              ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700" 
              : isOpen 
                ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" 
                : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-200"
          }`}
        />

        <div className="absolute right-2 flex items-center gap-0.5">
          {allowClear && (value || searchTerm) && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(null);
                inputRef.current?.focus();
              }}
              className="p-1 text-gray-400 hover:text-rose-500 rounded-md transition"
              title="ล้างตัวเลือก"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (isOpen) {
                setIsOpen(false);
              } else {
                setIsOpen(true);
                inputRef.current?.focus();
                inputRef.current?.select();
              }
            }}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
            title={isOpen ? "ปิดตัวเลือก" : "เปิดตัวเลือก"}
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isOpen ? "rotate-180 text-indigo-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* รายการตัวเลือกแสดงใต้ช่องทันที (ไม่มีช่องค้นหาซ้อน) */}
      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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
