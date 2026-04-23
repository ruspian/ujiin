import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SetupForm from "../../components/layout/SetupForm";

export default async function SetupPage() {
  const adminExists = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (adminExists) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <SetupForm />
    </div>
  );
}
