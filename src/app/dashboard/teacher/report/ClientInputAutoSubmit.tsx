"use client";

import React from "react";

export default function ClientInputAutoSubmit({ 
  type,
  name, 
  defaultValue, 
  className,
  title
}: { 
  type: string,
  name: string, 
  defaultValue: string, 
  className: string,
  title?: string
}) {
  return (
    <input 
      type={type}
      name={name} 
      defaultValue={defaultValue} 
      className={className}
      title={title}
      onChange={(e) => {
        if (e.target.form) {
          e.target.form.submit();
        }
      }}
    />
  );
}
