import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { redirect } from "next/navigation";
import prisma from "../../../../lib/prisma";
import ProfileClient from "./ProfileClient";

export default async function HeadProfilePage() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "HEAD") {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id }
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8">
        <ProfileClient user={user} />
      </div>
    </div>
  );
}
