"use client";

import React, { useRef } from "react";

export default function ClientFilterForm({ 
  children, 
  action 
}: { 
  children: React.ReactNode, 
  action: string 
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const handleChange = () => {
    if (formRef.current) {
      formRef.current.submit();
    }
  };

  return (
    <form 
      ref={formRef}
      method="GET" 
      action={action} 
      className="flex flex-wrap gap-5 items-end"
      onChange={handleChange}
    >
      {children}
    </form>
  );
}
