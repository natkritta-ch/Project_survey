import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { redirect } from "next/navigation";
import prisma from "../../../lib/prisma";
import HeadAdminClient from "./HeadAdminClient";
import { clearOldTrash } from "./actions";
import LogoutButton from "../../../components/LogoutButton";

export default async function HeadDashboard() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "HEAD") {
    redirect("/login");
  }

  await clearOldTrash();

  const subjects = await prisma.subject.findMany({ include: { teacher: true }, orderBy: { code: 'asc' } });
  const schedules = await prisma.schedule.findMany({ 
    include: { subject: true }, 
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] 
  });
  const rawUsers = await prisma.user.findMany({ 
    include: { student: true }, 
    orderBy: { username: 'asc' } 
  });

  const users = rawUsers.map(u => {
    const { faceDescriptor, ...rest } = u;
    return rest;
  });
  const termConfigs = await prisma.termConfig.findMany({
    orderBy: [{ academicYear: 'desc' }, { term: 'desc' }]
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col py-8 px-4 sm:px-6 lg:px-8 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">เข้าสู่ระบบหัวหน้าแผนก</h1>
          <p className="text-gray-600 dark:text-gray-400">จัดการข้อมูลรายวิชา ตารางเรียน อาจารย์ และผู้ใช้งานทั้งหมด</p>
        </div>
        <div className="w-full md:w-auto text-sm text-gray-500 bg-white dark:bg-gray-800 px-5 py-3 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-row md:flex-col justify-between md:items-end items-center">
          <div className="mb-0 md:mb-1.5">ผู้ใช้งาน: <span className="font-semibold text-indigo-600 dark:text-indigo-400 text-base">{session?.user?.name}</span></div>
          <div className="flex flex-wrap items-center gap-3 md:gap-0 md:flex-col md:items-end space-y-0 md:space-y-1">
            <a href="/dashboard/2fa" className="inline-flex items-center text-blue-500 hover:text-blue-600 dark:text-blue-400 underline text-xs transition">
              <svg className="w-3.5 h-3.5 mr-1 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              ความปลอดภัย
            </a>
            <a href="/dashboard/head/status" className="inline-flex items-center text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 underline text-xs transition">
              <svg className="w-3.5 h-3.5 mr-1 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
              สถานะ DB
            </a>
            <a href="/dashboard/head/profile" className="inline-flex items-center text-amber-600 hover:text-amber-700 dark:text-amber-400 underline text-xs transition">
              <svg className="w-3.5 h-3.5 mr-1 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              แก้ไขโปรไฟล์
            </a>
            <LogoutButton />
          </div>
        </div>
      </div>

        <HeadAdminClient 
          subjects={subjects} 
          schedules={schedules} 
          users={users} 
          termConfigs={termConfigs}
        />
      </div>
    </div>
  );
}
