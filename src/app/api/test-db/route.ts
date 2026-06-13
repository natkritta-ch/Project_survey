import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Try to query the database (e.g., just connecting and getting a simple count or 1)
    await prisma.$queryRaw`SELECT 1`;
    
    const dbUrl = process.env.DATABASE_URL || "";
    let host = "Unknown";
    let user = "Unknown";
    let database = "Unknown";
    try {
      const parsedUrl = new URL(dbUrl);
      host = parsedUrl.hostname;
      user = parsedUrl.username;
      database = parsedUrl.pathname.replace('/', '');
    } catch (e) {}

    return NextResponse.json({ 
      success: true, 
      message: "เชื่อมต่อฐานข้อมูลสำเร็จ!",
      connection: { host, user, database }
    });
  } catch (error: any) {
    console.error("Database connection error:", error);
    return NextResponse.json(
      { success: false, message: "ไม่สามารถเชื่อมต่อฐานข้อมูลได้", error: error.message },
      { status: 500 }
    );
  }
}
