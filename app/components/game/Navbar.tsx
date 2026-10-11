"use client";

import React from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

interface NavbarProps {
  userEmail?: string | null;
  activeTeamName: string;
  allTeamNames: string[];
  onSelectTeam: (teamName: string) => void;
}

export default function Navbar({
  userEmail,
  activeTeamName,
  allTeamNames,
  onSelectTeam,
}: NavbarProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center font-black text-white text-base shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition">
            E
          </div>
          <div>
            <div className="font-extrabold text-white tracking-wider text-sm sm:text-base flex items-center gap-1.5">
              <span>ENIGMA</span>
              <span className="text-xs px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 font-mono">
                2026
              </span>
            </div>
            <div className="text-[10px] text-zinc-400 font-mono tracking-tight hidden sm:block">
              Blockchain Strategy Arena
            </div>
          </div>
        </Link>

        {/* Protocol Selector & User controls */}
        <div className="flex items-center gap-3">
          {/* Active Protocol Selector */}
          {allTeamNames.length > 0 && (
            <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs">
              <span className="text-[10px] uppercase font-mono text-zinc-400 hidden md:inline">
                Team:
              </span>
              <select
                value={activeTeamName}
                onChange={(e) => onSelectTeam(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
              >
                {allTeamNames.map((name) => (
                  <option key={name} value={name} className="bg-zinc-900 text-white">
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* User Badge */}
          {userEmail && (
            <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-zinc-400 px-3 py-1.5 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="max-w-[150px] truncate">{userEmail}</span>
            </div>
          )}

          {/* Sign out button */}
          <button
            onClick={handleSignOut}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-mono transition"
          >
            Log Out
          </button>
        </div>
      </div>
    </header>
  );
}
