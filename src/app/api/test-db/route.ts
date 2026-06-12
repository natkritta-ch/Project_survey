import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Try to query the database (e.g., just connecting and getting a simple count or 1)
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ success: true, message: "เชื่อมต่อฐานข้อมูลสำเร็จ!" });
  } catch (error: any) {
    console.error("Database connection error:", error);
    return NextResponse.json(
      { success: false, message: "ไม่สามารถเชื่อมต่อฐานข้อมูลได้", error: error.message },
      { status: 500 }
    );
  }
}
