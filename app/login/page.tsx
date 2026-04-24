import LoginForm from "@/components/layout/LoginForm";
import { BookOpen } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl ring-1 ring-gray-200">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
            <BookOpen size={28} />
          </div>
          <h2 className="mt-6 text-2xl font-bold tracking-tight text-gray-900">
            Masuk ke Akun Anda
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Gunakan Username yang telah terdaftar
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
