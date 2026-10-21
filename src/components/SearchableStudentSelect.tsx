"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, X, Users } from "lucide-react";

export interface StudentOption {
  id: string;
  name: string;
  username: string;
  level?: string;
  nickname?: string | null;
  phone?: string | null;
  profilePicture?: string | null;
  parents?: Array<{ id: string; name: string; phone?: string | null }>;
  assemblySummary?: {
    isAtRisk?: boolean;
    percent?: number;
  };
  hasSubjectRisk?: boolean;
}

interface SearchableStudentSelectProps {
  students: StudentOption[];
  selectedStudentId?: string | null;
  searchQuery?: string;
  onSelectStudent: (student: StudentOption | null) => void;
  onSearchQueryChange: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchableStudentSelect({
  students,
  selectedStudentId,
  searchQuery = "",
  onSelectStudent,
  onSearchQueryChange,
  placeholder = "พิมพ์ค้นหา หรือเลือกนักเรียนในห้อง...",
  className = ""
}: SearchableStudentSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // หานักเรียนที่ถูกเลือก (ถ้ามี)
  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return students.find(s => s.id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  // ค่าข้อความในช่องพิมพ์หลัก
  const [inputValue, setInputValue] = useState(searchQuery);

  // ซิงค์ค่าใน input เมื่อภายนอกเปลี่ยน
  useEffect(() => {
    if (selectedStudent) {
      setInputValue(`${selectedStudent.name}${selectedStudent.nickname ? ` (${selectedStudent.nickname})` : ""}`);
    } else {
      setInputValue(searchQuery);
    }
  }, [selectedStudent, searchQuery]);

  // ปิด dropdown เมื่อคลิกด้านนอก
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // กรองรายชื่อนักเรียนตามข้อความที่พิมพ์
  const filteredStudents = useMemo(() => {
    // ถ้านักเรียนถูกเลือกอยู่ และค่าใน input ตรงกับชื่อเขา ให้แสดงนักเรียนทุกคนในห้อง เพื่อให้กดเลือกคนอื่นได้
    if (selectedStudent && inputValue.includes(selectedStudent.name)) {
      return students;
    }
    if (!inputValue.trim()) return students;
    const q = inputValue.toLowerCase();
    return students.filter(s => {
      const matchName = (s.name || "").toLowerCase().includes(q);
      const matchUser = (s.username || "").toLowerCase().includes(q);
      const matchNick = (s.nickname || "").toLowerCase().includes(q);
      const matchPhone = (s.phone || "").toLowerCase().includes(q);
      const matchParent = (s.parents || []).some(
        p => (p.name || "").toLowerCase().includes(q) || (p.phone || "").includes(q)
      );
      return matchName || matchUser || matchNick || matchPhone || matchParent;
    });
  }, [students, inputValue, selectedStudent]);

  // เมื่อผู้ใช้พิมพ์ลงในช่องค้นหาบนสุดโดยตรง
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setIsOpen(true);
    // เมื่อพิมพ์ค้นหาเอง ให้ยกเลิกการเลือกเจาะจงคนเดิม เพื่อให้ค้นหาตามข้อความ
    if (selectedStudentId) {
      onSelectStudent(null);
    }
    onSearchQueryChange(val);
  };

  // เมื่อคลิกเลือกนักเรียนจาก Dropdown
  const handleSelectStudent = (st: StudentOption | null) => {
    if (st) {
      onSelectStudent(st);
      onSearchQueryChange("");
      setInputValue(`${st.name}${st.nickname ? ` (${st.nickname})` : ""}`);
    } else {
      onSelectStudent(null);
      onSearchQueryChange("");
      setInputValue("");
    }
    setIsOpen(false);
  };

  // ล้างการเลือก
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectStudent(null);
    onSearchQueryChange("");
    setInputValue("");
    inputRef.current?.focus();
  };

  const hasValue = Boolean(selectedStudent || inputValue.trim());

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* ช่องพิมพ์ค้นหาบนสุดตัวเดียว พิมพ์ได้โดยตรงทันที ไม่ซ้อนกัน */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={`${placeholder} (${students.length} คน)`}
          className={`w-full text-xs pl-10 pr-16 py-2.5 rounded-xl border transition-all outline-none ${
            isOpen
              ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
              : hasValue
                ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50/40 dark:bg-indigo-950/20 text-gray-900 dark:text-white font-medium"
                : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600 text-gray-900 dark:text-white"
          }`}
        />

        <div className="absolute right-2.5 top-2.5 flex items-center gap-1">
          {hasValue && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-rose-500 rounded-md transition"
              title="ล้างค่า / แสดงทุกคน"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setIsOpen(!isOpen);
              if (!isOpen) inputRef.current?.focus();
            }}
            className="p-1 text-gray-400 hover:text-indigo-600 transition"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isOpen ? "rotate-180 text-indigo-500" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Dropdown แสดงตัวเลือกนักเรียนใต้ช่องพิมพ์ทันที (ไม่มีช่องพิมพ์ซ้อนอีกต่อไป) */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-80 flex flex-col min-w-[320px] sm:min-w-[360px]">
          <div className="overflow-y-auto flex-1 p-1.5 space-y-1">
            {/* ตัวเลือกแสดงทุกคน */}
            <button
              type="button"
              onClick={() => handleSelectStudent(null)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
                !selectedStudent && !inputValue.trim()
                  ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold"
                  : "hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                <span>แสดงนักเรียนทุกคน ({students.length} คน)</span>
              </div>
              {!selectedStudent && !inputValue.trim() && (
                <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              )}
            </button>

            <div className="border-t border-gray-100 dark:border-gray-700/60 my-1" />

            {/* รายชื่อนักเรียน */}
            {filteredStudents.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-xs">
                ไม่พบนักเรียนที่ตรงกับคำค้นหา &ldquo;{inputValue}&rdquo;
              </div>
            ) : (
              filteredStudents.map((st) => {
                const isSelected = selectedStudent?.id === st.id;

                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleSelectStudent(st)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition ${
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700/40 text-gray-800 dark:text-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden">
                        {st.profilePicture ? (
                          <img src={st.profilePicture} alt="" className="w-full h-full object-cover" />
                        ) : (
                          st.name.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0 truncate">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                            {st.name}
                          </span>
                          {st.nickname && (
                            <span className="text-gray-400 text-[11px] shrink-0">
                              ({st.nickname})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono mt-0.5">
                          <span>{st.username}</span>
                          {st.parents && st.parents.length > 0 && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans truncate">
                              • ผปค: {st.parents[0].name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {st.assemblySummary?.isAtRisk && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                          ม.ผ.
                        </span>
                      )}
                      {st.hasSubjectRisk && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                          ข.ร.
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
