"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { loginSchema } from "@/schemas/loginSchema";

export default function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (formData: FormData) => {
    setLoading(true);

    const rawLoginData = Object.fromEntries(formData.entries());

    const loginValidation = loginSchema.safeParse(rawLoginData);

    if (!loginValidation.success) {
      const errorMessages = loginValidation.error.issues[0].message;
      toast.error(errorMessages);
      setLoading(false);
      return;
    }

    const { username, password } = loginValidation.data;

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      toast.error(result.error);
      setLoading(false);
    } else {
      toast.success("Berhasil masuk!");
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <form action={handleLogin} className="mt-8 space-y-6">
      <div className="space-y-4">
        <div>
          <label className="sr-only">Username</label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              name="username"
              type="text"
              required
              className="block w-full rounded-lg py-3 pl-10 text-gray-900 focus:border-teal-500 focus:ring-teal-500 sm:text-sm bg-gray-50 border ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:bg-white transition-colors"
              placeholder="Username"
            />
          </div>
        </div>

        <div>
          <label className="sr-only">Password</label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              name="password"
              type="password"
              required
              className="block w-full rounded-lg py-3 pl-10 text-gray-900 focus:border-teal-500 focus:ring-teal-500 sm:text-sm bg-gray-50 border ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:bg-white transition-colors"
              placeholder="Password"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex w-full justify-center rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-700  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-50 transition-all"
      >
        {loading ? "Memeriksa data..." : "Masuk"}
      </button>
    </form>
  );
}
