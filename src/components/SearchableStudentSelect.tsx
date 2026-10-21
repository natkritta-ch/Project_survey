"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, X, User, Users, AlertCircle, ShieldAlert } from "lucide-react";

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
  placeholder = "เลือกหรือพิมพ์ค้นหานักเรียน...",
  className = ""
}: SearchableStudentSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // หานักเรียนที่ถูกเลือก (ถ้ามี)
  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return students.find(s => s.id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  // ซิงค์ localSearch เมื่อ searchQuery จากภายนอกเปลี่ยน
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // จัดการปิดเมื่อคลิกด้านนอก
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // โฟกัสช่องค้นหาเมื่อเปิด
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // กรองรายชื่อนักเรียนตามคำค้นหา
  const filteredStudents = useMemo(() => {
    if (!localSearch.trim()) return students;
    const q = localSearch.toLowerCase();
    return students.filter(s => {
      const matchName = (s.name || "").toLowerCase().includes(q);
      const matchUser = (s.username || "").toLowerCase().includes(q);
      const matchNick = (s.nickname || "").toLowerCase().includes(q);
      const matchPhone = (s.phone || "").toLowerCase().includes(q);
      const matchParent = (s.parents || []).some(p => (p.name || "").toLowerCase().includes(q) || (p.phone || "").includes(q));
      return matchName || matchUser || matchNick || matchPhone || matchParent;
    });
  }, [students, localSearch]);

  const handleSelectStudent = (st: StudentOption | null) => {
    onSelectStudent(st);
    if (st) {
      onSearchQueryChange("");
      setLocalSearch("");
    }
    setIsOpen(false);
  };

  const handleSearchChange = (val: string) => {
    setLocalSearch(val);
    onSearchQueryChange(val);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectStudent(null);
    onSearchQueryChange("");
    setLocalSearch("");
  };

  const hasActiveFilter = Boolean(selectedStudent || searchQuery.trim());

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* ปุ่มหลักของ Select Dropdown */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between text-left text-xs px-3.5 py-2.5 rounded-xl border transition-all ${
          isOpen
            ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
            : hasActiveFilter
              ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50/40 dark:bg-indigo-950/20 text-gray-900 dark:text-white"
              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-200"
        }`}
      >
        <div className="flex items-center gap-2.5 truncate pr-2 min-w-0">
          {selectedStudent ? (
            <>
              <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-[10px] shrink-0 overflow-hidden">
                {selectedStudent.profilePicture ? (
                  <img src={selectedStudent.profilePicture} alt="" className="w-full h-full object-cover" />
                ) : (
                  selectedStudent.name.charAt(0)
                )}
              </div>
              <div className="truncate">
                <span className="font-bold text-gray-900 dark:text-white">
                  {selectedStudent.name}
                </span>
                {selectedStudent.nickname && (
                  <span className="text-gray-400 text-[11px] ml-1">
                    ({selectedStudent.nickname})
                  </span>
                )}
                <span className="text-gray-400 font-mono text-[11px] ml-1.5">
                  • {selectedStudent.username}
                </span>
              </div>
            </>
          ) : searchQuery.trim() ? (
            <>
              <Search className="w-4 h-4 text-indigo-500 shrink-0" />
              <span className="font-medium text-indigo-600 dark:text-indigo-400 truncate">
                ค้นหา: &ldquo;{searchQuery}&rdquo;
              </span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-gray-400 dark:text-gray-500 truncate">
                {placeholder} ({students.length} คน)
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {hasActiveFilter && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClearAll}
              className="p-1 text-gray-400 hover:text-rose-500 rounded-md transition"
              title="ล้างการเลือก / แสดงทุกคน"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isOpen ? "rotate-180 text-indigo-500" : ""
            }`}
          />
        </div>
      </button>

      {/* Popover Dropdown พร้อมช่องค้นหา */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-80 flex flex-col min-w-[320px] sm:min-w-[360px]">
          {/* ช่องพิมพ์ค้นหา */}
          <div className="p-2.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/50 sticky top-0 z-10">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
              <input
                ref={inputRef}
                type="text"
                value={localSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="พิมพ์ชื่อ, รหัสนักเรียน, ชื่อเล่น หรือชื่อผู้ปกครอง..."
                className="w-full text-xs pl-8 pr-7 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              {localSearch && (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* รายการตัวเลือก */}
          <div className="overflow-y-auto flex-1 p-1.5 space-y-1">
            {/* ตัวเลือกแสดงทุกคน */}
            <button
              type="button"
              onClick={() => handleSelectStudent(null)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
                !selectedStudent && !searchQuery
                  ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold"
                  : "hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                <span>แสดงนักเรียนทุกคน ({students.length} คน)</span>
              </div>
              {!selectedStudent && !searchQuery && (
                <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              )}
            </button>

            <div className="border-t border-gray-100 dark:border-gray-700/60 my-1" />

            {/* รายชื่อนักเรียน */}
            {filteredStudents.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-xs">
                ไม่พบนักเรียนที่ตรงกับคำค้นหา &ldquo;{localSearch}&rdquo;
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
