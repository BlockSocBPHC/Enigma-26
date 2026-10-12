"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import "./landing.css";

function NetworkBg() {
  const { nodes, edges } = useMemo(() => {
    let seed = 11;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const nodes = Array.from({ length: 36 }, () => ({ x: Math.round(rnd() * 1000), y: Math.round(rnd() * 1000) }));
    const edges: [number, number][] = [];
    nodes.forEach((a, i) =>
      nodes.forEach((b, j) => {
        if (j > i && Math.hypot(a.x - b.x, a.y - b.y) < 230) edges.push([i, j]);
      }),
    );
    return { nodes, edges };
  }, []);
  return (
    <svg className="lp-net" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {edges.map(([i, j]) => (
        <line key={`${i}-${j}`} x1={nodes[i].x} y1={nodes[i].y} x2={nodes[j].x} y2={nodes[j].y} />
      ))}
      {nodes.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={3} />
      ))}
    </svg>
  );
}

function Cube() {
  return (
    <div className="lp-cube-wrap" aria-hidden="true">
      <div className="lp-cube">
        {["f1", "f2", "f3", "f4", "f5", "f6"].map((f) => (
          <div key={f} className={`lp-face ${f}`} />
        ))}
      </div>
    </div>
  );
}

function GoogleG() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.5 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export default function LandingPage() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      setEmail(data.user?.email ?? null);
      setChecking(false);
    });
    return () => {
      alive = false;
    };
  }, [supabase]);

  const signIn = async () => {
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
    // On success the browser navigates to Google, so we only land here on failure.
    if (error) {
      setError(error.message || "Could not start Google sign-in. Please try again.");
      setBusy(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setEmail(null);
  };

  return (
    <div className="lp">
      <NetworkBg />
      <div className="lp-vignette" />

      <main className="lp-shell">
        <p className="lp-kicker">Blockchain Economics · Strategy Game</p>
        <h1 className="lp-logo">ENIGMA</h1>
        <p className="lp-tag">DECODE ✦ STRATEGIZE ✦ CONQUER</p>
        <p className="lp-sub">Crack the code. Challenge the unknown.</p>

        <Cube />

        <section className="lp-card" aria-labelledby="lp-login-title">
          <h2 id="lp-login-title">Enter the arena</h2>
          <p className="lp-muted">Sign in with the Google account you registered with.</p>

          {checking ? (
            <div className="lp-skeleton" aria-busy="true" />
          ) : email ? (
            <div className="lp-signed">
              <p>
                Signed in as <b>{email}</b>
              </p>
              <Link href="/dashboard" className="lp-btn lp-primary">
                Continue to dashboard →
              </Link>
              <button type="button" className="lp-link" onClick={signOut}>
                Use a different account
              </button>
            </div>
          ) : (
            <button type="button" className="lp-btn lp-google" onClick={signIn} disabled={busy}>
              <GoogleG />
              {busy ? "Redirecting to Google…" : "Continue with Google"}
            </button>
          )}

          {error && (
            <p className="lp-error" role="alert">
              {error}
            </p>
          )}
          <p className="lp-fine">Only registered team leaders can open the dashboard.</p>
        </section>

        <ul className="lp-facts">
          <li><span>Prize pool</span><b>INR 10,000</b></li>
          <li><span>Date</span><b>23rd October</b></li>
          <li><span>Time</span><b>11 A.M</b></li>
          <li><span>Venue</span><b>F-205</b></li>
        </ul>

        <footer className="lp-foot">
          <span>For queries: NAME1 — xxxxxxxxxx · NAME2 — xxxxxxxxxx</span>
          <span>The challenge: build code &amp; compete</span>
        </footer>
      </main>
    </div>
  );
}