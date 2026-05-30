"use client";

import React from "react";

export default function ClientSearchBox() {
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    const rows = document.querySelectorAll("#logs-tbody tr.log-row");
    
    rows.forEach((row) => {
      const text = row.textContent?.toLowerCase() || "";
      if (text.includes(term)) {
        (row as HTMLElement).style.display = "";
      } else {
        (row as HTMLElement).style.display = "none";
      }
    });
  };

  return (
    <div className="flex relative w-full sm:w-auto">
      <input
        type="text"
        placeholder="พิมพ์ชื่อหรือรหัส เพื่อกรองทันที..."
        onChange={handleSearch}
        className="block w-full sm:w-64 px-4 py-1.5 border border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white transition"
      />
      <div className="absolute inset-y-0 right-0 px-3 flex items-center pointer-events-none text-slate-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>
  );
}
