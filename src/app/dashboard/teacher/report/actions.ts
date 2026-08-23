"use server";

import prisma from "../../../../lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";

export async function updateAttendanceStatus(id: string, status: string) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;
  if (userRole !== "TEACHER" && userRole !== "HEAD") {
    throw new Error("Unauthorized");
  }

  await prisma.attendance.update({
    where: { id },
    data: { status }
  });
  
  revalidatePath("/dashboard/teacher/report");
  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/parent");
}

