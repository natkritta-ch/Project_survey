"use client";

import React from "react";

export default function ClientCheckboxAutoSubmit({ 
  name, 
  value, 
  defaultChecked, 
  className 
}: { 
  name: string, 
  value: string, 
  defaultChecked: boolean, 
  className: string 
}) {
  return (
    <input 
      type="checkbox"
      name={name} 
      value={value}
      defaultChecked={defaultChecked} 
      className={className}
      onChange={(e) => {
        if (e.target.form) {
          e.target.form.submit();
        }
      }}
    />
  );
}
