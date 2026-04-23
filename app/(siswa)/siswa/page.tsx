"use client";

import { LogOut, KeyRound } from "lucide-react";

export default function StudentPortal() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-4">
      <div className="absolute top-4 right-4 flex items-center gap-4 rounded-full bg-white px-4 py-2 shadow-sm border border-gray-200">
        <span className="text-sm font-medium text-gray-700">Andi (10-RPL)</span>
        <button className="text-red-500 hover:text-red-700 transition-colors">
          <LogOut size={18} />
        </button>
      </div>

      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl ring-1 ring-gray-200">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-600">
            <KeyRound size={24} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Mulai Ujian</h2>
          <p className="text-sm text-gray-500 mt-1">
            Masukkan token yang diberikan oleh guru mata pelajaran.
          </p>
        </div>

        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label
              htmlFor="token"
              className="block text-sm font-medium text-gray-700"
            >
              Token Ujian
            </label>
            <input
              type="text"
              id="token"
              className="mt-2 block w-full rounded-lg border-gray-300 bg-gray-50 p-3 text-center text-2xl font-bold tracking-widest text-gray-900 uppercase shadow-sm focus:border-teal-500 focus:bg-white focus:ring-teal-500"
              placeholder="XXXXXX"
              maxLength={6}
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-teal-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            Masuk Ujian
          </button>
        </form>
      </div>
    </div>
  );
}
