import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";

    if (!q || q.length < 1) {
      return NextResponse.json({ success: true, students: [] });
    }

    const students = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        deletedAt: null,
        OR: [
          { name: { contains: q } },
          { username: { contains: q } }
        ]
      },
      select: {
        id: true,
        name: true,
        username: true,
        level: true,
        nickname: true,
        gender: true,
        bloodType: true,
        phone: true,
        email: true,
        address: true,
        nationalId: true,
        faceDescriptor: true,
      },
      take: 15,
      orderBy: { username: "asc" }
    });

    const safeStudents = students.map(s => ({
      id: s.id,
      name: s.name,
      username: s.username,
      level: s.level || "",
      nickname: s.nickname || "",
      gender: s.gender || "ไม่ระบุ",
      bloodType: s.bloodType || "A",
      phone: s.phone || "",
      email: s.email || "",
      address: s.address || "",
      nationalId: s.nationalId || "",
      hasFace: !!s.faceDescriptor
    }));

    return NextResponse.json({ success: true, students: safeStudents });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
