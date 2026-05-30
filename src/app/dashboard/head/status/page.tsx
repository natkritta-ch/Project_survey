import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { redirect } from "next/navigation";
import prisma from "../../../../lib/prisma";
import Link from "next/link";
import { ArrowLeft, Database, Activity, CheckCircle, XCircle, HardDrive, Users, FileText, ClipboardCheck, BookOpen } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function SystemStatusPage() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "HEAD") {
    redirect("/login");
  }

  let dbStatus = "UNKNOWN";
  let latency = 0;
  let errorMsg = "";

  const start = Date.now();
  try {
    // Attempt a simple query to test connection
    await prisma.$queryRaw`SELECT 1`;
    latency = Date.now() - start;
    dbStatus = "CONNECTED";
  } catch (err: any) {
    dbStatus = "DISCONNECTED";
    errorMsg = err.message || "ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้";
  }

  // Get some basic stats if connected
  let stats = { users: 0, attendances: 0, grades: 0, subjects: 0 };
  
  if (dbStatus === "CONNECTED") {
    try {
      stats.users = await prisma.user.count();
      stats.attendances = await prisma.attendance.count();
      stats.grades = await prisma.grade.count();
      stats.subjects = await prisma.subject.count();
    } catch (e) {}
  }

  // Parse Database URL safely to hide password
  let safeDbUrl = "mysql://***:***@localhost:3306/project";
  const dbEnv = process.env.DATABASE_URL || "";
  if (dbEnv) {
    try {
      const url = new URL(dbEnv);
      safeDbUrl = `${url.protocol}//${url.username}:***@${url.host}${url.pathname}`;
    } catch(e) {}
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-4 sm:p-8 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto w-full">
        <div className="mb-6 flex items-center justify-between">
          <Link 
            href="/dashboard/head" 
            className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition bg-white dark:bg-slate-800 px-4 py-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            กลับไปหน้าแดชบอร์ด
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-500" />
            ตรวจสอบสถานะระบบ (System Status)
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Main Status Card */}
          <div className="md:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center shrink-0 ${dbStatus === 'CONNECTED' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30'}`}>
                <Database className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-1">สถานะฐานข้อมูล (MySQL)</h2>
                {dbStatus === "CONNECTED" ? (
                  <div className="flex items-center text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle className="w-5 h-5 mr-1.5" />
                    ออนไลน์ (เชื่อมต่อสำเร็จ)
                  </div>
                ) : (
                  <div className="flex items-center text-rose-600 dark:text-rose-400 font-semibold">
                    <XCircle className="w-5 h-5 mr-1.5" />
                    ออฟไลน์ (การเชื่อมต่อล้มเหลว)
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700/50 space-y-4">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">ความหน่วง (Latency / Ping)</p>
                <div className="flex items-center">
                  <span className={`text-2xl font-bold ${latency < 100 ? 'text-emerald-600' : latency < 300 ? 'text-amber-500' : 'text-rose-600'}`}>
                    {dbStatus === "CONNECTED" ? `${latency} ms` : '-'}
                  </span>
                  {dbStatus === "CONNECTED" && latency < 100 && <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">เร็วมาก</span>}
                </div>
              </div>
              
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Database URI (ซ่อนรหัสผ่าน)</p>
                <code className="bg-slate-200 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-sm text-slate-700 dark:text-slate-300 block overflow-x-auto whitespace-nowrap">
                  {safeDbUrl}
                </code>
              </div>

              {errorMsg && (
                <div className="bg-rose-50 border-l-4 border-rose-500 p-3 rounded-r-lg">
                  <p className="text-xs text-rose-800 font-mono break-words">{errorMsg}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions / System Info */}
          <div className="bg-indigo-600 dark:bg-indigo-900 rounded-2xl shadow-sm p-6 text-white flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <HardDrive className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-lg font-bold mb-2">ข้อมูลเซิร์ฟเวอร์</h2>
              <ul className="space-y-2 text-indigo-100 text-sm">
                <li className="flex justify-between"><span>สภาพแวดล้อม:</span> <span className="font-semibold text-white">{process.env.NODE_ENV || 'development'}</span></li>
                <li className="flex justify-between"><span>เวลาเซิร์ฟเวอร์:</span> <span className="font-semibold text-white">{new Date().toLocaleTimeString('th-TH')}</span></li>
                <li className="flex justify-between"><span>Prisma ORM:</span> <span className="font-semibold text-white">Active</span></li>
              </ul>
            </div>
            <button className="mt-6 w-full bg-white text-indigo-600 py-2.5 rounded-xl font-bold hover:bg-indigo-50 transition shadow-sm" style={{ cursor: 'not-allowed', opacity: 0.8 }}>
              ระบบทำงานปกติ
            </button>
          </div>
        </div>

        {/* Database Stats */}
        {dbStatus === "CONNECTED" && (
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center">
              <Database className="w-5 h-5 mr-2 text-indigo-500" />
              ปริมาณข้อมูลในฐานข้อมูลปัจจุบัน
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <Users className="w-8 h-8 text-blue-500 mb-2 opacity-80" />
                <p className="text-sm text-slate-500 font-medium mb-1">จำนวนผู้ใช้งาน</p>
                <p className="text-3xl font-extrabold text-slate-800 dark:text-white">{stats.users}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <ClipboardCheck className="w-8 h-8 text-emerald-500 mb-2 opacity-80" />
                <p className="text-sm text-slate-500 font-medium mb-1">ประวัติเข้าเรียน</p>
                <p className="text-3xl font-extrabold text-slate-800 dark:text-white">{stats.attendances}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <FileText className="w-8 h-8 text-amber-500 mb-2 opacity-80" />
                <p className="text-sm text-slate-500 font-medium mb-1">ประวัติผลการเรียน</p>
                <p className="text-3xl font-extrabold text-slate-800 dark:text-white">{stats.grades}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <BookOpen className="w-8 h-8 text-purple-500 mb-2 opacity-80" />
                <p className="text-sm text-slate-500 font-medium mb-1">จำนวนรายวิชา</p>
                <p className="text-3xl font-extrabold text-slate-800 dark:text-white">{stats.subjects}</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
