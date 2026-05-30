"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export default function LogoutButton({ className }: { className?: string }) {
  const defaultClass = "inline-flex items-center text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs transition";
  return (
    <button
      onClick={async () => {
        await signOut({ redirect: false });
        window.location.href = "/login";
      }}
      className={className || defaultClass}
    >
      <LogOut className={className ? "w-4 h-4 mr-1.5" : "w-3.5 h-3.5 mr-1"} />
      ออกจากระบบ
    </button>
  );
}
