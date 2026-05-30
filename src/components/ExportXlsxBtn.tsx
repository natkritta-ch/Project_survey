"use client";

import React from "react";
import * as XLSX from "xlsx";

interface ExportXlsxBtnProps {
  filename: string;
  headers: string[];
  data: any[][];
  levelFilter?: string;
  levelColIndex?: number;
  className?: string;
  label?: string;
}

export default function ExportXlsxBtn({ 
  filename, 
  headers, 
  data, 
  levelFilter = "all", 
  levelColIndex = 2, 
  className, 
  label = "⬇️ Export Excel" 
}: ExportXlsxBtnProps) {
  
  const handleExport = () => {
    const wb = XLSX.utils.book_new();

    if (levelFilter === "all" || levelFilter === "-- ทุกชั้นปี --") {
      const groups: Record<string, any[][]> = {};
      data.forEach(row => {
        const lvl = row[levelColIndex] || "ไม่ระบุ";
        if (!groups[lvl]) groups[lvl] = [];
        groups[lvl].push(row);
      });
      
      const sortedLevels = Object.keys(groups).sort();
      if (sortedLevels.length === 0) {
        const ws = XLSX.utils.aoa_to_sheet([headers]);
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      } else {
        sortedLevels.forEach(lvl => {
          const ws = XLSX.utils.aoa_to_sheet([headers, ...groups[lvl]]);
          const safeName = String(lvl).replace(/[\\/*?\[\]]/g, '').substring(0, 31);
          XLSX.utils.book_append_sheet(wb, ws, safeName);
        });
      }
    } else {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
      const safeName = String(levelFilter).replace(/[\\/*?\[\]]/g, '').substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, safeName);
    }

    XLSX.writeFile(wb, filename);
  };

  return (
    <button onClick={handleExport} className={className || "px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition"}>
      {label}
    </button>
  );
}
