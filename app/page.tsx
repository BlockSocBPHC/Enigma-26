"use client";

import { useState } from "react";
import Link from "next/link";
import signIn from "./utils/googleAuth";

const phases = [
  { number: "01", title: "Launch", detail: "Set fees, security & rewards", tone: "emerald" },
  { number: "02", title: "Attack", detail: "Read public metrics", tone: "rose" },
  { number: "03", title: "Recover", detail: "Rebalance your protocol", tone: "amber" },
  { number: "04", title: "Counterattack", detail: "Take one final position", tone: "orange" },
  { number: "05", title: "Market event", detail: "Adapt to shared conditions", tone: "violet" },
];

const telemetry = [
  { label: "Adoption score", value: "50", suffix: " / 100", tone: "text-cyan-300" },
  { label: "Active protocols", value: "08", suffix: "", tone: "text-white" },
  { label: "Starting position", value: "EVEN", suffix: "", tone: "text-emerald-300" },
];

function ArrowUpRight() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <path d="M3 13 13 3M6 3h7v7" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path d="M21.8 12.23c0-.71-.06-1.4-.18-2.05H12v3.88h5.5a4.7 4.7 0 0 1-2.04 3.08v2.52h3.26c1.9-1.75 3.08-4.34 3.08-7.43Z" fill="#4285F4" />
      <path d="M12 22c2.7 0 4.97-.89 6.63-2.34l-3.26-2.52c-.9.6-2.05.96-3.37.96-2.6 0-4.8-1.75-5.59-4.1H3.04v2.6A10 10 0 0 0 12 22Z" fill="#34A853" />
      <path d="M6.41 14c-.2-.6-.32-1.24-.32-1.9s.12-1.3.32-1.9V7.6H3.04A10 10 0 0 0 2 12.1c0 1.62.39 3.16 1.04 4.5L6.4 14Z" fill="#FBBC05" />
      <path d="M12 6.1c1.44 0 2.73.5 3.75 1.48l2.81-2.81C16.96 3.26 14.7 2.2 12 2.2a10 10 0 0 0-8.96 5.4l3.37 2.6c.79-2.35 2.99-4.1 5.59-4.1Z" fill="#EA4335" />
    </svg>
  );
}

export default function Home() {
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    setIsSigningIn(true);

    try {
      await signIn();
    } catch (error) {
      console.error("Unable to start sign-in", error);
      setIsSigningIn(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#07080d] text-zinc-100 selection:bg-violet-500/40">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(91,61,255,0.16),transparent_27%),radial-gradient(circle_at_82%_13%,rgba(20,188,223,0.11),transparent_23%),linear-gradient(115deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:auto,auto,36px_36px]" />

      <div className="relative mx-auto flex min-h-screen max-w-[1440px] flex-col px-5 sm:px-8 lg:px-12">
        <header className="flex h-20 items-center justify-between border-b border-white/[0.08] sm:h-24">
          <Link href="/" className="group flex items-center gap-3" aria-label="Enigma home">
            <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-lg border border-violet-300/40 bg-violet-500/15 text-sm font-black tracking-tighter text-violet-100 shadow-[0_0_30px_rgba(116,86,255,0.25)]">
              <span className="relative z-10">E</span>
              <span className="absolute inset-x-0 bottom-0 h-px bg-cyan-300/80" />
            </span>
            <span className="font-semibold tracking-[0.18em] text-zinc-100">ENIGMA<span className="ml-1 text-violet-300">/26</span></span>
          </Link>

          <nav className="hidden items-center gap-7 text-[11px] font-medium uppercase tracking-[0.17em] text-zinc-400 md:flex" aria-label="Primary navigation">
            <a className="transition hover:text-white" href="#how-it-works">How it works</a>
            <a className="transition hover:text-white" href="#protocols">Protocol matrix</a>
            <a className="transition hover:text-white" href="#status">Arena status</a>
          </nav>

          <Link href="/dashboard" className="group flex items-center gap-2 text-xs font-medium text-zinc-300 transition hover:text-white">
            <span className="hidden sm:inline">Enter arena</span>
            <span className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-white/[0.035] transition group-hover:border-violet-300/60 group-hover:bg-violet-400/10"><ArrowUpRight /></span>
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-14 py-16 lg:grid-cols-[minmax(0,0.96fr)_minmax(460px,0.94fr)] lg:gap-10 lg:py-20">
          <div className="relative z-10 max-w-2xl">
            <div className="mb-8 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-200/80">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-200" /></span>
              A five-round blockchain economics game
            </div>

            <h1 className="max-w-xl text-5xl font-semibold leading-[0.96] tracking-[-0.065em] text-white sm:text-6xl lg:text-7xl">
              Learn why blockchains
              <span className="block bg-gradient-to-r from-violet-300 via-fuchsia-200 to-cyan-200 bg-clip-text text-transparent"> succeed or fail.</span>
            </h1>

            <p className="mt-7 max-w-lg text-base leading-7 text-zinc-400 sm:text-lg">Lead a blockchain network through five strategic rounds. Balance adoption, security, decentralization, treasury, and stability as every team competes for the strongest final score.</p>

            <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <button onClick={handleSignIn} disabled={isSigningIn} className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-zinc-100 px-5 text-sm font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-wait disabled:opacity-80">
                {isSigningIn ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-950" />Connecting...</> : <><GoogleMark />Continue with Google</>}
              </button>
              <Link href="/dashboard" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.025] px-5 text-sm font-medium text-zinc-200 transition hover:border-violet-300/50 hover:bg-violet-400/[0.08] hover:text-white">Explore the arena <ArrowUpRight /></Link>
            </div>

            <div className="mt-11 flex items-center gap-5 text-xs text-zinc-500">
              <div className="flex -space-x-2" aria-hidden="true">
                {['B', 'E', 'S', 'A'].map((letter, index) => <span key={letter} className={`grid h-7 w-7 place-items-center rounded-full border-2 border-[#07080d] text-[9px] font-bold ${index === 0 ? 'bg-amber-300 text-amber-950' : index === 1 ? 'bg-sky-300 text-sky-950' : index === 2 ? 'bg-rose-300 text-rose-950' : 'bg-violet-300 text-violet-950'}`}>{letter}</span>)}
              </div>
              <p><span className="font-semibold text-zinc-300">8 teams</span> begin from the same position</p>
            </div>
          </div>

          <div id="status" className="relative mx-auto w-full max-w-[590px] lg:mx-0">
            <div className="absolute left-[11%] top-[8%] h-56 w-56 rounded-full bg-violet-600/20 blur-[80px]" />
            <div className="absolute bottom-[13%] right-[4%] h-36 w-36 rounded-full bg-cyan-400/15 blur-[70px]" />

            <div className="relative aspect-[1.06] overflow-hidden rounded-[28px] border border-white/[0.12] bg-[#0b0d15]/85 p-4 shadow-[0_24px_90px_rgba(0,0,0,0.42)] sm:p-5">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:linear-gradient(to_bottom,black,transparent_92%)]" />
              <div className="relative flex items-center justify-between">
                <div><p className="text-[9px] font-medium uppercase tracking-[0.22em] text-zinc-500">Protocol command center</p><p className="mt-1 text-sm font-semibold text-zinc-100">Strategy Arena <span className="text-violet-300">· Round 01 / 05</span></p></div>
                <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.14em] text-emerald-300">Ready</span>
              </div>

              <div className="absolute left-1/2 top-[52%] grid h-40 w-40 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-violet-300/45 bg-[radial-gradient(circle_at_38%_30%,rgba(195,181,255,.56),rgba(103,63,230,.2)_35%,rgba(8,9,17,.7)_70%)] shadow-[0_0_70px_rgba(123,92,255,0.38)] sm:h-48 sm:w-48">
                <span className="absolute inset-3 rounded-full border border-dashed border-cyan-200/25 animate-[spin_15s_linear_infinite]" />
                <span className="absolute inset-[-19px] rounded-full border border-violet-300/20" />
                <span className="absolute inset-[-47px] rounded-full border border-dashed border-white/10 animate-[spin_25s_linear_infinite_reverse]" />
                <span className="grid h-16 w-16 place-items-center rounded-2xl border border-white/20 bg-[#171229]/80 text-2xl shadow-lg">⛓</span>
                <span className="absolute -right-7 top-4 h-2.5 w-2.5 rounded-full bg-cyan-200 shadow-[0_0_18px_6px_rgba(147,237,255,0.4)]" />
                <span className="absolute bottom-5 -left-7 h-2 w-2 rounded-full bg-fuchsia-200 shadow-[0_0_18px_6px_rgba(241,185,255,0.4)]" />
              </div>

              <div className="absolute left-5 top-[29%] rounded-xl border border-white/[0.1] bg-[#111421]/90 px-3 py-2.5 backdrop-blur sm:left-7"><p className="text-[9px] uppercase tracking-[0.15em] text-zinc-500">Security</p><p className="mt-1 font-mono text-sm font-semibold text-cyan-200">50 <span className="text-[10px] text-zinc-500">/ 100</span></p><div className="mt-2 h-1 w-20 overflow-hidden rounded-full bg-white/10"><div className="h-full w-1/2 rounded-full bg-cyan-300" /></div></div>

              <div className="absolute bottom-[25%] right-5 rounded-xl border border-white/[0.1] bg-[#111421]/90 px-3 py-2.5 backdrop-blur sm:right-7"><p className="text-[9px] uppercase tracking-[0.15em] text-zinc-500">Treasury</p><p className="mt-1 font-mono text-sm font-semibold text-amber-200">$1,000</p><p className="mt-1 text-[9px] text-emerald-300">Choose how to invest it</p></div>

              <div className="absolute inset-x-4 bottom-4 grid grid-cols-3 gap-2 border-t border-white/[0.08] pt-3 sm:inset-x-5">
                {telemetry.map((item) => <div key={item.label} className="min-w-0"><p className="truncate text-[8px] uppercase tracking-[0.12em] text-zinc-500">{item.label}</p><p className={`mt-1 truncate font-mono text-sm font-semibold ${item.tone}`}>{item.value}<span className="text-[9px] text-zinc-500">{item.suffix}</span></p></div>)}
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-t border-white/[0.08] py-9 sm:py-11">
          <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div><p className="text-[10px] font-medium uppercase tracking-[0.2em] text-violet-300">The game loop</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Five rounds. One balanced winner.</h2></div>
            <p className="max-w-sm text-sm leading-6 text-zinc-500">The final score weights adoption and security at 30% each, with treasury and stability at 20%.</p>
          </div>

          <div id="protocols" className="grid gap-px overflow-hidden rounded-2xl border border-white/[0.1] bg-white/[0.1] sm:grid-cols-2 lg:grid-cols-5">
            {phases.map((phase) => <article key={phase.number} className="group bg-[#0b0d15] p-5 transition hover:bg-[#10131e]"><div className="flex items-start justify-between"><span className={`text-xs font-mono ${phase.tone === 'emerald' ? 'text-emerald-300' : phase.tone === 'rose' ? 'text-rose-300' : phase.tone === 'amber' ? 'text-amber-300' : phase.tone === 'orange' ? 'text-orange-300' : 'text-violet-300'}`}>{phase.number}</span><span className="text-zinc-600 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-zinc-300"><ArrowUpRight /></span></div><h3 className="mt-9 text-lg font-medium text-zinc-100">{phase.title}</h3><p className="mt-1 text-sm text-zinc-500">{phase.detail}</p></article>)}
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-white/[0.08] py-7 text-[10px] uppercase tracking-[0.14em] text-zinc-600 sm:flex-row sm:items-center sm:justify-between"><p>Enigma / 26 · Blockchain strategy simulation</p><p className="text-zinc-500">Make every block count.</p></footer>
      </div>
    </main>
  );
}
