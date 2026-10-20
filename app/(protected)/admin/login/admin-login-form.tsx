"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminLoginAction } from "../actions";

export default function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.append("username", username);
    formData.append("password", password);

    startTransition(async () => {
      try {
        const res = await adminLoginAction(formData);
        if (res.success) {
          router.push("/admin");
          router.refresh();
        } else {
          setError(res.error || "Invalid username or password");
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    });
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-[#2cff5e]/25 bg-gradient-to-b from-[#0a1a0f]/90 to-[#030805]/95 p-8 sm:p-10 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#2cff5e]/30 bg-[#2cff5e]/10 text-2xl shadow-[0_0_20px_rgba(44,255,94,0.3)]">
          🛡️
        </div>
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#2cff5e]/30 bg-[#2cff5e]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#a8f27a]">
          Enigma Organizer Portal
        </div>
        <h1 className="mt-3 text-2xl font-black uppercase tracking-wider text-white">
          Admin Sign In
        </h1>
        <p className="mt-1.5 text-xs text-[#8fae93]">
          Enter your authorized organizer credentials to access the central competition controls.
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-xs font-semibold text-red-300">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-[0.14em] text-[#a8f27a] mb-1.5">
            Admin Username
          </label>
          <input
            type="text"
            required
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. jayesh"
            className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#2cff5e] focus:outline-none focus:ring-1 focus:ring-[#2cff5e] transition"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-[0.14em] text-[#a8f27a] mb-1.5">
            Admin Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 pr-11 text-sm text-white placeholder:text-white/30 focus:border-[#2cff5e] focus:outline-none focus:ring-1 focus:ring-[#2cff5e] transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8fae93] hover:text-white transition"
              tabIndex={-1}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="mt-2 w-full rounded-xl bg-gradient-to-r from-[#2cff5e] to-[#a8f27a] py-3.5 text-center text-sm font-black text-[#031006] hover:brightness-110 shadow-[0_0_20px_rgba(44,255,94,0.3)] transition disabled:opacity-50"
        >
          {isPending ? "Authenticating…" : "Sign In to Admin Panel →"}
        </button>
      </form>

      <div className="mt-6 border-t border-white/10 pt-4 text-center">
        <Link
          href="/dashboard"
          className="text-xs font-semibold text-[#8fae93] hover:text-white transition"
        >
          ← Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
