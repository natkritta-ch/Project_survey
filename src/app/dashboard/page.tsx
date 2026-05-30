import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardController() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as any)?.role;

  switch (role) {
    case "HEAD":
      redirect("/dashboard/head");
    case "TEACHER":
      redirect("/dashboard/teacher");
    case "STUDENT":
      redirect("/dashboard/student");
    case "PARENT":
      redirect("/dashboard/parent");
    default:
      return <div>ไม่พบสิทธิ์การใช้งานที่ถูกต้อง</div>;
  }
}
