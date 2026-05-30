import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "../../../../lib/prisma";
import TeacherScannerClient from "./ScannerClient";

export default async function TeacherScanPage({ searchParams }: { searchParams: Promise<{ type?: string, subjectId?: string }> }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "TEACHER") {
    redirect("/login");
  }

  const params = await searchParams;
  const initialType = params.type as "class" | "assembly" | undefined;
  const initialSubjectId = params.subjectId;

  const teacherId = (session?.user as any)?.id;

  // ดึงรายชื่อนักเรียนทั้งหมดที่มีข้อมูลใบหน้า (faceDescriptor)
  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      deletedAt: null,
      faceDescriptor: {
        not: null
      },
      // บล็อกสถานะที่ไม่อยู่ในการเรียนปกติ เพื่อป้องกัน AI สแกนหน้าไปติดบัญชีเก่าที่จบไปแล้ว
      NOT: {
        level: {
          in: ["จบการศึกษา", "ดรอปเรียน", "พ้นสภาพ"]
        }
      }
    },
    select: {
      id: true,
      name: true,
      username: true,
      level: true,
      faceDescriptor: true
    }
  });

  // ดึงเฉพาะวิชาที่อาจารย์คนนี้รับผิดชอบสอน
  const subjects = await prisma.subject.findMany({
    where: { teacherId, deletedAt: null },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col p-8 dark:bg-gray-900">
      <div className="mb-4">
        <Link href="/dashboard/teacher" className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          กลับหน้าหลักอาจารย์
        </Link>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">หน้าจอเช็คชื่อเข้าเรียน</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">เปิดกล้องเพื่อเช็คชื่อนักเรียนโดยอัตโนมัติ</p>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <TeacherScannerClient students={students} subjects={subjects} initialType={initialType} initialSubjectId={initialSubjectId} />
      </div>
    </div>
  );
}
