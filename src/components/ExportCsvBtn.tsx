"use client";

import React from "react";

interface ExportCsvBtnProps {
  filename: string;
  headers: string[];
  data: any[][];
  className?: string;
  label?: string;
}

export default function ExportCsvBtn({ filename, headers, data, className, label = "⬇️ ส่งออก CSV" }: ExportCsvBtnProps) {
  const handleExport = () => {
    const processRow = (row: any[]) => row.map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',');
    const csvContent = "\uFEFF" + [headers, ...data].map(processRow).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button onClick={handleExport} className={className || "px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition"}>
      {label}
    </button>
  );
}
