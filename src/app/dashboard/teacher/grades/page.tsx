import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import TeacherGradesClient from "./TeacherGradesClient";

export default async function TeacherGradesPage() {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;

  if (userRole !== "TEACHER" && userRole !== "HEAD") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col p-4 sm:p-8 dark:bg-gray-900">
      <div className="mb-4">
        <Link
          href="/dashboard/teacher"
          className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          กลับหน้าหลักอาจารย์
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
          ระบบตรวจสอบใบเกรดและผลการเรียน (Grade Verification)
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          ตรวจสอบและอนุมัติรายงานผลการศึกษา (PDF จาก ศธ.02/RMS) ของนักเรียนแบบ Split-Screen
        </p>
      </div>

      <TeacherGradesClient sessionUser={session?.user} />
    </div>
  );
}
