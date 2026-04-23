import Link from "next/link";
import { BookOpen, Mail, Lock } from "lucide-react";

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
            Atau{" "}
            <Link
              href="/register"
              className="font-medium text-teal-600 hover:text-teal-500 transition-colors"
            >
              daftar akun baru
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" action="#" method="POST">
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="username" className="sr-only">
                Username / NISN
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="block w-full rounded-lg border-gray-300 py-3 pl-10 text-gray-900 focus:border-teal-500 focus:ring-teal-500 sm:text-sm bg-gray-50 border ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:bg-white"
                  placeholder="Username atau NISN/NIP"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="block w-full rounded-lg border-gray-300 py-3 pl-10 text-gray-900 focus:border-teal-500 focus:ring-teal-500 sm:text-sm bg-gray-50 border ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:bg-white"
                  placeholder="Password"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <label
                htmlFor="remember-me"
                className="ml-2 block text-sm text-gray-900"
              >
                Ingat saya
              </label>
            </div>

            <div className="text-sm">
              <a
                href="#"
                className="font-medium text-teal-600 hover:text-teal-500"
              >
                Lupa password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="flex w-full justify-center rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 transition-colors"
            >
              Masuk
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
