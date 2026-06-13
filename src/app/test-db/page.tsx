"use client";

import { useState } from "react";
import { Database, Loader2, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TestDbPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [details, setDetails] = useState("");
  const [connectionInfo, setConnectionInfo] = useState<{host: string, user: string, database: string} | null>(null);

  const checkConnection = async () => {
    setStatus("loading");
    setMessage("");
    setDetails("");
    
    try {
      const res = await fetch("/api/test-db");
      const data = await res.json();
      
      if (data.success) {
        setStatus("success");
        setMessage(data.message);
        if (data.connection) setConnectionInfo(data.connection);
      } else {
        setStatus("error");
        setMessage(data.message);
        setDetails(data.error || "Unknown error");
      }
    } catch (err: any) {
      setStatus("error");
      setMessage("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
      setDetails(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
            <Database className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">ทดสอบการเชื่อมต่อฐานข้อมูล</h1>
          <p className="text-sm text-muted-foreground">ใช้สำหรับตรวจสอบว่าระบบสามารถเชื่อมต่อกับฐานข้อมูลได้หรือไม่</p>
        </div>

        <div className="bg-card border border-border shadow-sm rounded-xl overflow-hidden p-6 sm:p-8 flex flex-col items-center gap-6">
          
          {status === "idle" && (
            <div className="w-full aspect-video bg-muted border border-border border-dashed rounded-lg flex flex-col items-center justify-center gap-3">
              <Database className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground font-medium">รอการทดสอบ...</p>
            </div>
          )}

          {status === "loading" && (
            <div className="w-full aspect-video bg-muted border border-border border-dashed rounded-lg flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-primary font-medium">กำลังเชื่อมต่อ...</p>
            </div>
          )}

          {status === "success" && (
            <div className="w-full flex flex-col gap-4">
              <div className="w-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 rounded-lg p-6 flex flex-col items-center justify-center gap-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{message}</p>
              </div>
              {connectionInfo && (
                <div className="w-full bg-muted/50 border border-border rounded-lg p-4 text-sm space-y-2">
                  <p className="font-semibold text-foreground border-b border-border pb-2 mb-2">รายละเอียดการเชื่อมต่อ</p>
                  <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                    <span className="font-medium text-foreground">Host:</span>
                    <span className="col-span-2">{connectionInfo.host}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                    <span className="font-medium text-foreground">Database:</span>
                    <span className="col-span-2">{connectionInfo.database}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                    <span className="font-medium text-foreground">User:</span>
                    <span className="col-span-2">{connectionInfo.user}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {status === "error" && (
            <div className="w-full bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex flex-col items-center justify-center gap-3 text-center">
              <XCircle className="w-10 h-10 text-destructive" />
              <div>
                <p className="text-sm text-destructive font-medium">{message}</p>
                {details && (
                  <p className="text-xs text-destructive/80 mt-1 max-w-xs break-words">{details}</p>
                )}
              </div>
            </div>
          )}

          <button
            onClick={checkConnection}
            disabled={status === "loading"}
            className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 shadow-sm"
          >
            {status === "loading" ? "กำลังทดสอบ..." : "ตรวจสอบการเชื่อมต่อ"}
          </button>
        </div>

        <div className="text-center pt-4">
          <Link href="/register" className="inline-flex items-center text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            กลับไปหน้าลงทะเบียน
          </Link>
        </div>
      </div>
    </div>
  );
}
