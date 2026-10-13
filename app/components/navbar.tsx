"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export interface NavbarProps {
    roundNumber?: number; // 1..5, 6 = final results. Omit to hide the round pill.
    roundName?: string;
    teamName: string;
    teamMembers: string[];
    links?: { id: string; label: string }[]; // sections on the page to link to
    userEmail?: string | null;
    onSignOut?: () => void;
}

// Each id must exist on a section in the dashboard page.
const LINKS = [
    { id: "/dashboard", label: "Dashboard" },
    { id: "/scoreboard", label: "Scoreboard" },
    { id: "/rulebook", label: "Rulebook" },
];

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2cff5e]";

export default function Navbar({ roundNumber, roundName, teamName, teamMembers, links = LINKS, userEmail, onSignOut }: NavbarProps) {
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false); // mobile links panel
    const [profileOpen, setProfileOpen] = useState(false);
    const [active, setActive] = useState(links[0]?.id ?? "");
    const profileRef = useRef<HTMLDivElement>(null);

    // Highlight the link of the section currently in view.
    useEffect(() => {
        const els = links
            .filter((l) => !l.id.startsWith("/"))
            .map((l) => document.getElementById(l.id))
            .filter((e): e is HTMLElement => !!e);
        if (!els.length) return;
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) setActive(e.target.id);
                });
            },
            { rootMargin: "-25% 0px -65% 0px" },
        );
        els.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, [links]);

    // Close menus on outside click or Escape.
    useEffect(() => {
        if (!menuOpen && !profileOpen) return;
        const onDown = (e: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setProfileOpen(false);
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [menuOpen, profileOpen]);

    const go = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        const el = document.getElementById(id);
        if (!el) return; // fall back to the plain #hash jump
        e.preventDefault();
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        setActive(id);
        setMenuOpen(false);
    };

    const initial = (userEmail?.trim()[0] ?? teamName.trim()[0] ?? "?").toUpperCase();
    const final = (roundNumber ?? 0) >= 6;

    return (
        <header className="sticky top-0 z-50 border-b border-[rgba(130,255,150,0.16)] bg-[rgba(3,8,5,0.82)] shadow-[0_6px_30px_rgba(0,0,0,0.45)] backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-2.5 px-3.5 md:gap-5 md:px-5">
                {/* brand */}
                <Link
                    href="/dashboard"
                    className={`relative rounded-[10px] px-3.5 py-3 text-sm font-semibold no-underline transition-colors md:py-2 md:text-[13px] ${FOCUS} `}
                >
                    <span className="text-[17px] font-black tracking-[0.06em] [text-shadow:2px_2px_0_#2d6b1b] min-[441px]:text-xl">
                        ENIGMA
                    </span>
                </Link>

                {/* section links — inline on desktop, dropdown panel on mobile */}
                <nav
                    aria-label="Dashboard sections"
                    className={`${menuOpen ? "flex" : "hidden"} absolute inset-x-0 top-full flex-col gap-0.5 border-b border-[rgba(130,255,150,0.4)] bg-[rgba(3,8,5,0.97)] px-3.5 pb-3.5 pt-2.5 md:static md:ml-2 md:flex md:flex-row md:items-center md:gap-1 md:border-0 md:bg-transparent md:p-0`}
                >
                    {links.map((l) => {
                        const isRoute = l.id.startsWith("/");
                        const on = isRoute ? pathname === l.id : active === l.id;
                        const linkClasses = `relative rounded-[10px] px-3.5 py-3 text-sm font-semibold no-underline transition-colors md:py-2 md:text-[13px] ${FOCUS} ${on
                            ? "bg-[rgba(44,255,94,0.12)] text-[#f3fff0] md:after:absolute md:after:inset-x-3.5 md:after:bottom-[3px] md:after:h-0.5 md:after:rounded md:after:bg-[#2cff5e] md:after:shadow-[0_0_8px_#2cff5e] md:after:content-['']"
                            : "text-[#8fae93] hover:bg-[rgba(44,255,94,0.07)] hover:text-[#f3fff0]"
                        }`;

                        if (isRoute) {
                            return (
                                <Link
                                    key={l.id}
                                    href={l.id}
                                    aria-current={on ? "true" : undefined}
                                    onClick={() => setMenuOpen(false)}
                                    className={linkClasses}
                                >
                                    {l.label}
                                </Link>
                            );
                        }

                        return (
                            <a
                                key={l.id}
                                href={`#${l.id}`}
                                aria-current={on ? "true" : undefined}
                                onClick={(e) => go(e, l.id)}
                                className={linkClasses}
                            >
                                {l.label}
                            </a>
                        );
                    })}
                </nav>

                {/* right cluster */}
                <div className="ml-auto flex items-center gap-2.5">
                    {roundNumber !== undefined && (
                        <div
                            title={final ? "Game finished" : `Round ${roundNumber} of 5`}
                            className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[rgba(130,255,150,0.4)] bg-[rgba(44,255,94,0.08)] px-3 py-1.5 text-xs"
                        >
                            <span
                                aria-hidden="true"
                                className={`h-2 w-2 rounded-full ${final
                                    ? "bg-[#8fae93]"
                                    : "animate-pulse bg-[#2cff5e] shadow-[0_0_10px_#2cff5e] motion-reduce:animate-none"
                                    }`}
                            />
                            <b className="font-extrabold text-[#a8f27a]">{final ? "Final" : `R${roundNumber}`}</b>
                            <span className="hidden font-semibold text-[#f3fff0] min-[441px]:inline">{roundName}</span>
                        </div>
                    )}

                    <span
                        title="Playing as"
                        className="hidden max-w-[150px] truncate rounded-[10px] border border-[rgba(130,255,150,0.16)] px-2.5 py-1.5 text-xs font-semibold text-[#8fae93] lg:block"
                    >
                        {teamName}
                    </span>



                    {/* profile menu */}
                    <div className="relative" ref={profileRef}>
                        <button
                            type="button"
                            aria-haspopup="menu"
                            aria-expanded={profileOpen}
                            aria-label="Account menu"
                            onClick={() => setProfileOpen((v) => !v)}
                            className={`grid h-9 w-9 cursor-pointer place-items-center rounded-full border-2 border-white/10 bg-gradient-to-br from-[#a8f27a] to-[#3dd957] text-sm font-extrabold text-[#021006] transition hover:-translate-y-px hover:shadow-[0_0_16px_rgba(44,255,94,0.5)] ${FOCUS}`}
                        >
                            {initial}
                        </button>
                        {profileOpen && (
                            <div
                                role="menu"
                                className="absolute right-0 top-[calc(100%+10px)] z-[60] min-w-[230px] rounded-[14px] border border-[rgba(130,255,150,0.4)] bg-[rgba(7,17,10,0.97)] p-2 shadow-[0_16px_40px_rgba(0,0,0,0.6),0_0_24px_rgba(44,255,94,0.1)]"
                            >
                                <div className="mb-1.5 flex flex-col gap-0.5 border-b border-[rgba(130,255,150,0.16)] px-3 pb-3 pt-2.5">
                                    <small className="text-[10px] uppercase tracking-[0.14em] text-[#a8f27a]">Playing as</small>
                                    <b className="text-sm text-[#f3fff0]">{teamName}</b>
                                    {userEmail && <span className="break-all text-xs text-[#8fae93]">{userEmail}</span>}
                                </div>

                                {/* Team members */}
                                <div className="border-b border-[rgba(130,255,150,0.16)] px-3 py-3">
                                    <small className="mb-2 block text-[10px] uppercase tracking-[0.14em] text-[#a8f27a]">
                                        Team Members ({teamMembers.length})
                                    </small>

                                    <ul className="flex flex-col gap-2">
                                        {teamMembers.map((member, index) => (
                                            <li
                                                key={`${member}-${index}`}
                                                className="flex items-center gap-2 text-xs text-[#8fae93]"
                                            >
                                                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[rgba(130,255,150,0.25)] bg-[rgba(44,255,94,0.08)] text-[10px] font-bold text-[#a8f27a]">
                                                    {member.trim().charAt(0).toUpperCase()}
                                                </span>

                                                <span className="break-words">{member}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <button
                                    type="button"
                                    role="menuitem"
                                    disabled={!onSignOut}
                                    onClick={() => {
                                        setProfileOpen(false);
                                        onSignOut?.();
                                    }}
                                    className={`w-full cursor-pointer rounded-[10px] px-3 py-2.5 text-left text-[13px] font-semibold text-[#ff8f8f] hover:bg-[rgba(255,107,107,0.12)] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`}
                                >
                                    Sign out
                                </button>
                            </div>
                        )}
                    </div>

                    {/* mobile menu toggle */}
                    <button
                        type="button"
                        aria-label={menuOpen ? "Close menu" : "Open menu"}
                        aria-expanded={menuOpen}
                        onClick={() => setMenuOpen((v) => !v)}
                        className={`flex h-[38px] w-[38px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border border-[rgba(130,255,150,0.4)] md:hidden ${FOCUS}`}
                    >
                        <span className="h-0.5 w-4 rounded-sm bg-[#f3fff0]" />
                        <span className="h-0.5 w-4 rounded-sm bg-[#f3fff0]" />
                        <span className="h-0.5 w-4 rounded-sm bg-[#f3fff0]" />
                    </button>
                </div>
            </div>
        </header>
    );
}