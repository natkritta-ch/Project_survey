import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { redirect } from "next/navigation";
import prisma from "../../../../../lib/prisma";
import TranscriptView from "../../../../../components/TranscriptView";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function HeadTranscriptPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "HEAD") {
    redirect("/login");
  }

  const studentId = params.id;

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    include: {
      grades: {
        include: { subject: true }
      }
    }
  });

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">ไม่พบข้อมูลนักเรียน</h2>
          <Link href="/dashboard/head" className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400">
            กลับไปหน้าแดชบอร์ด
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col p-4 sm:p-8 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto w-full">
        <div className="mb-6 flex items-center justify-between no-print">
          <Link 
            href="/dashboard/head" 
            className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            กลับไปหน้าแดชบอร์ด
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden print:shadow-none print:border-none print:bg-transparent">
          <div className="bg-gradient-to-r from-indigo-50 to-white dark:from-gray-800 dark:to-gray-800 px-6 py-5 border-b border-gray-100 dark:border-gray-700 no-print">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400 p-1.5 rounded-lg">🎓</span>
              ข้อมูลผลการเรียนรวม (Transcript)
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-9">
              นักเรียน: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{student.name}</span> ({student.level || "ไม่ระบุชั้นปี"})
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 ml-9">
              รหัสนักเรียน: {student.username}
            </p>
          </div>
          
          <div className="p-6 md:p-8">
            <TranscriptView grades={student.grades} showPrintButton={true} />
          </div>
        </div>
      </div>
    </div>
  );
}
