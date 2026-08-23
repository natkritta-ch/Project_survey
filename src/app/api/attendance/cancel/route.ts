import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const userRole = (session.user as any)?.role;
    if (userRole !== "TEACHER" && userRole !== "HEAD") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const { attendanceIds } = await request.json();

    if (!Array.isArray(attendanceIds) || attendanceIds.length === 0) {
      return NextResponse.json({ success: false, message: "No ids provided" }, { status: 400 });
    }

    // Delete records that match the provided ids
    await prisma.attendance.deleteMany({
      where: {
        id: { in: attendanceIds }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancel session error:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}
