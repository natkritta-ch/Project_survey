"use client";

import React, { useRef } from "react";

export default function ClientSelectAutoSubmit({ 
  name, 
  defaultValue, 
  className, 
  children 
}: { 
  name: string, 
  defaultValue: string, 
  className: string, 
  children: React.ReactNode 
}) {
  return (
    <select 
      name={name} 
      defaultValue={defaultValue} 
      className={className}
      onChange={(e) => {
        if (e.target.form) {
          e.target.form.submit();
        }
      }}
    >
      {children}
    </select>
  );
}
