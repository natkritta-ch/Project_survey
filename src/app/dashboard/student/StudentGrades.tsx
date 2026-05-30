"use client";

import { useState } from "react";
import { Save, Loader2, BookOpen, Lock, ShieldCheck } from "lucide-react";

// Bug #8 fix: เพิ่ม canSubmitGrades prop — ต้องได้รับอนุญาตจากอาจารย์ก่อน
export default function StudentGrades({
  subjects,
  initialGrades,
  canSubmitGrades
}: {
  subjects: any[];
  initialGrades: any[];
  canSubmitGrades: boolean;
}) {
  const [grades, setGrades] = useState<Record<string, string>>(
    initialGrades.reduce((acc, g) => ({ ...acc, [g.subjectId]: g.grade.toString() }), {})
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState<string>("ทั้งหมด");
  const [filterTerm, setFilterTerm] = useState<string>("ทั้งหมด");

  const uniqueYears = Array.from(new Set(subjects.map(s => s.academicYear || "ไม่ระบุ"))).sort((a, b) => b.localeCompare(a));
  const uniqueTerms = Array.from(new Set(subjects.map(s => s.term || "ไม่ระบุ"))).sort();

  const filteredSubjects = subjects.filter(s => {
    if (filterYear !== "ทั้งหมด" && (s.academicYear || "ไม่ระบุ") !== filterYear) return false;
    if (filterTerm !== "ทั้งหมด" && (s.term || "ไม่ระบุ") !== filterTerm) return false;
    return true;
  });

  const handleSave = async (subjectId: string) => {
    const val = grades[subjectId];
    if (val === undefined || val === "") return;

    setSavingId(subjectId);
    setSavedId(null);
    try {
      const res = await fetch("/api/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, grade: parseFloat(val) })
      });
      const data = await res.json();
      if (!data.success) {
        alert("บันทึกเกรดไม่สำเร็จ: " + data.message);
      } else {
        setSavedId(subjectId);
        setTimeout(() => setSavedId(null), 3000);
      }
    } catch (e) {
      console.error(e);
      alert("เกิดข้อผิดพลาดในการบันทึกเกรด");
    } finally {
      setSavingId(null);
    }
  };



  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        {canSubmitGrades ? (
          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800 w-full sm:w-auto">
            <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">ได้รับอนุญาตให้กรอกผลการเรียนแล้ว</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 w-full sm:w-auto">
            <Lock className="w-5 h-5 text-gray-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">หมดช่วงเวลาแก้ไข หรือการกรอกเกรดถูกปิดอยู่</span>
          </div>
        )}

        <div className="flex items-center gap-3 w-full sm:w-auto bg-gray-50 dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">ปีการศึกษา:</span>
            <select 
              value={filterYear} 
              onChange={e => setFilterYear(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 dark:text-white"
            >
              <option value="ทั้งหมด">ทั้งหมด</option>
              {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">เทอม:</span>
            <select 
              value={filterTerm} 
              onChange={e => setFilterTerm(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 dark:text-white"
            >
              <option value="ทั้งหมด">ทั้งหมด</option>
              {uniqueTerms.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredSubjects.length === 0 ? (
          <div className="text-center text-gray-400 py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">ไม่มีวิชาเรียนที่ตรงกับตัวกรอง</div>
        ) : (
          filteredSubjects.map(s => (
            <div key={s.id} className="flex justify-between items-center p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm transition hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                  <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-gray-900 dark:text-gray-100">[{s.code}] {s.name}</span>
                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full w-fit mt-1">ปีการศึกษา {s.academicYear} เทอม {s.term}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canSubmitGrades ? (
                  <>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="4"
                      placeholder="0.0 - 4.0"
                      className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all outline-none"
                      value={grades[s.id] || ""}
                      onChange={(e) => setGrades({ ...grades, [s.id]: e.target.value })}
                    />
                    <button
                      onClick={() => handleSave(s.id)}
                      disabled={savingId === s.id || grades[s.id] === undefined || grades[s.id] === ""}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${
                        savedId === s.id
                          ? "bg-green-500 text-white hover:bg-green-600"
                          : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700"
                      }`}
                    >
                      {savingId === s.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : savedId === s.id ? (
                        <ShieldCheck className="w-4 h-4" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {savedId === s.id ? "บันทึกแล้ว!" : "บันทึก"}
                    </button>
                  </>
                ) : (
                  <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-bold text-gray-800 dark:text-gray-200 min-w-[80px] text-center border border-gray-200 dark:border-gray-600 shadow-sm">
                    {grades[s.id] !== undefined ? `เกรด: ${grades[s.id]}` : "รอจัดเก็บผล"}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
