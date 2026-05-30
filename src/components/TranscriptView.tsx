"use client";

import React, { useMemo } from "react";
import { GraduationCap, Award, BookOpen, Printer } from "lucide-react";

export default function TranscriptView({ grades, showPrintButton = false }: { grades: any[], showPrintButton?: boolean }) {
  const { termsData, gpax, totalCredits } = useMemo(() => {
    if (!grades || grades.length === 0) return { termsData: [], gpax: 0, totalCredits: 0 };

    let globalTotalPxC = 0;
    let globalTotalCredits = 0;

    const termMap: Record<string, { term: string, year: string, grades: any[], totalPxC: number, totalCredits: number }> = {};

    grades.forEach(g => {
      const yr = g.subject?.academicYear || "-";
      const tm = g.subject?.term || "-";
      const key = `${yr}-${tm}`;
      const cr = g.subject?.credit ? parseFloat(g.subject.credit) : 3.0; // Default 3.0 if missing

      let point = typeof g.grade === 'number' ? g.grade : parseFloat(g.grade);
      if (isNaN(point)) return;

      const pXc = point * cr;

      if (!termMap[key]) {
        termMap[key] = { term: tm, year: yr, grades: [], totalPxC: 0, totalCredits: 0 };
      }

      termMap[key].grades.push({ ...g, credit: cr, point });
      termMap[key].totalPxC += pXc;
      termMap[key].totalCredits += cr;

      globalTotalPxC += pXc;
      globalTotalCredits += cr;
    });

    const sortedTermKeys = Object.keys(termMap).sort((a, b) => b.localeCompare(a)); // Descending

    const termsData = sortedTermKeys.map(key => {
      const d = termMap[key];
      const gpa = d.totalCredits > 0 ? d.totalPxC / d.totalCredits : 0;
      return { ...d, gpa };
    });

    const gpax = globalTotalCredits > 0 ? globalTotalPxC / globalTotalCredits : 0;

    return { termsData, gpax, totalCredits: globalTotalCredits };
  }, [grades]);

  if (grades.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
        ยังไม่มีข้อมูลผลการเรียนที่ถูกจัดเก็บในระบบ
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${showPrintButton ? 'print-area bg-white dark:bg-gray-900 print:bg-white print:text-black' : ''}`}>
      {/* Header for printing (hidden in normal view) */}
      {showPrintButton && (
        <div className="hidden print:block text-center mb-8 pb-4 border-b-2 border-gray-800">
          <h1 className="text-2xl font-bold text-black mb-1">ระเบียนแสดงผลการเรียน (Transcript)</h1>
          <p className="text-gray-600">เอกสารนี้สร้างโดยระบบจัดเก็บข้อมูลการศึกษาอัตโนมัติ</p>
        </div>
      )}

      {showPrintButton && (
        <div className="flex justify-end no-print mb-2">
          <button 
            onClick={() => window.print()} 
            className="flex items-center gap-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60 px-4 py-2 rounded-lg font-bold transition shadow-sm border border-indigo-200 dark:border-indigo-800"
          >
            <Printer className="w-4 h-4" />
            พิมพ์ใบ ปพ.1 (Print)
          </button>
        </div>
      )}

      {/* สรุป GPAX สะสม */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 dark:from-indigo-900 dark:to-purple-900 print:bg-none print:bg-gray-100 print:border print:border-gray-300 rounded-2xl p-6 text-white print:text-black shadow-lg overflow-hidden relative">
        <div className="absolute -right-6 -top-6 opacity-10 print:opacity-5">
          <GraduationCap className="w-48 h-48" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h3 className="text-indigo-100 print:text-gray-600 font-medium mb-1 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-300 print:text-gray-800" />
              เกรดเฉลี่ยสะสมตลอดหลักสูตร (GPAX)
            </h3>
            <p className="text-5xl font-extrabold tracking-tight print:text-black">{gpax.toFixed(2)}</p>
          </div>
          <div className="flex bg-white/10 print:bg-transparent print:border-gray-400 print:text-black rounded-xl p-4 gap-6 backdrop-blur-sm border border-white/20 w-full md:w-auto">
            <div>
              <p className="text-indigo-200 print:text-gray-600 text-xs font-semibold uppercase tracking-wider mb-1">หน่วยกิตสะสม</p>
              <p className="text-2xl font-bold print:text-black">{totalCredits.toFixed(1)}</p>
            </div>
            <div className="w-px bg-white/20 print:bg-gray-300"></div>
            <div>
              <p className="text-indigo-200 print:text-gray-600 text-xs font-semibold uppercase tracking-wider mb-1">จำนวนวิชาที่ประเมินผล</p>
              <p className="text-2xl font-bold print:text-black">{grades.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* แยกตามเทอม */}
      <div className="space-y-4">
        {termsData.map((t, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            {/* Term Header */}
            <div className="bg-gray-50 dark:bg-gray-700/50 px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                <h4 className="font-bold text-gray-800 dark:text-gray-100">
                  ภาคเรียนที่ {t.term} / {t.year}
                </h4>
              </div>
              <div className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 px-3 py-1 rounded-lg text-sm font-extrabold border border-indigo-200 dark:border-indigo-800/50">
                GPA {t.gpa.toFixed(2)}
              </div>
            </div>

            {/* Subjects Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 dark:bg-gray-800 dark:text-gray-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">รหัสวิชา</th>
                    <th className="px-5 py-3 font-semibold">ชื่อวิชา</th>
                    <th className="px-5 py-3 font-semibold text-center w-24">หน่วยกิต</th>
                    <th className="px-5 py-3 font-semibold text-center w-24">ผลการเรียน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {t.grades.map((g, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors bg-white dark:bg-gray-800">
                      <td className="px-5 py-3 font-medium text-gray-900 dark:text-gray-300">
                        {g.subject?.code || "-"}
                      </td>
                      <td className="px-5 py-3 text-gray-700 dark:text-gray-400">
                        {g.subject?.name || "-"}
                      </td>
                      <td className="px-5 py-3 text-center text-gray-500 dark:text-gray-500 font-medium">
                        {g.credit.toFixed(1)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`inline-block px-2 py-1 rounded font-bold w-12 text-center ${
                          g.point >= 3.0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          g.point >= 2.0 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          g.point >= 1.0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {g.point.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/20 px-5 py-2 border-t border-gray-100 dark:border-gray-700 text-right text-xs text-gray-500 font-medium">
              หน่วยกิตเทอมนี้รวม: {t.totalCredits.toFixed(1)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
