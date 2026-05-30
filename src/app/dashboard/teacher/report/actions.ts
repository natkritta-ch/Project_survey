"use server";

import prisma from "../../../../lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateAttendanceStatus(id: string, status: string) {
  await prisma.attendance.update({
    where: { id },
    data: { status }
  });
  
  revalidatePath("/dashboard/teacher/report");
  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/parent");
}
