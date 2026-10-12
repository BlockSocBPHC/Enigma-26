"use client"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import isRegistered from "@/app/utils/IsRegistered/isRegistered"
import getTeamScore from "@/app/utils/TeamScore/getTeamScore"
import getLeaderboard from "@/app/utils/Leaderboard/getLeaderboard"
import { TeamDetails } from "@/app/lib/types"
import Navbar from "@/app/components/navbar"
import Info from "@/app/components/info"
import { TeamScore } from "@/app/lib/types"

type Row = Record<string, unknown>

// Sections the navbar links to (ids must match the sections below).
const NAV_LINKS = [
  // { id: "dashboard", label: "dashboard"},
  { id: "leaderboard", label: "Leaderboard" },
  { id: "rulebook", label: "Rulebook" },
]

const CURRENT_ROUND = 1 // hardcoded for now

const panel = "rounded-2xl border border-[rgba(130,255,150,0.16)] bg-[rgba(7,17,10,0.8)] p-5"
const label = "text-xs font-bold uppercase tracking-[0.14em] text-[#a8f27a]"

export default function DashboardPage() {
  const [teamDetails, setteamDetails] = useState<TeamDetails | undefined>()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [teamScore, setTeamScore] = useState<TeamScore | null>(null)
  const [leaderboard, setLeaderboard] = useState<Row[]>([])
  const router = useRouter()

  // for unregistered user
  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user?.email) {
        router.push("/")
        return
      }
      setUserEmail(user.email)

      const teamDetails = await isRegistered(user.email)
      if (teamDetails) {
        setteamDetails(teamDetails)
        const score = await getTeamScore(teamDetails.teamName)
        const board = await getLeaderboard()
        setTeamScore(score)
        setLeaderboard(board)
      } else {
        alert("You have not Registered")
        router.push("/")
      }
    }
    load()
  }, [router])

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  const columns = leaderboard[0] ? Object.keys(leaderboard[0]) : []

  return (
    <div className="min-h-screen bg-[#030604] bg-[radial-gradient(1100px_650px_at_50%_-10%,#0b2a14,transparent_62%)] text-[#f3fff0]">
      <Navbar
        teamName={teamDetails?.teamName ?? ""}
        teamMembers={teamDetails?.teamMembers ?? []}
        userEmail={userEmail}
        roundNumber={CURRENT_ROUND}
        links={NAV_LINKS}
        onSignOut={signOut}
      />

      {/* RIGHT: Fixed Team Score */}
      <aside className="fixed right-6 top-24 z-40 w-80">
        <div className={panel}>
          <p className={label}>Performance</p>

          <h2 className="mt-2 text-xl font-extrabold">
            Team Score
          </h2>

          <p className="mt-1 text-sm text-[#8fae93]">
            {teamDetails?.teamName ?? "Loading team..."}
          </p>

          {teamScore ? (
            <div className="mt-5 space-y-5">
              {[
                { key: "adoption", label: "Adoption" },
                { key: "security", label: "Security" },
                { key: "treasury", label: "Treasury" },
                { key: "decentralization", label: "Decentralization" },
                { key: "stability", label: "Stability" },
              ].map((metric) => {
                const value = Number(
                  teamScore[metric.key as keyof TeamScore] ?? 0
                );

                return (
                  <div key={metric.key}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-sm text-[#8fae93]">
                        {metric.label}
                      </span>

                      <span className="text-sm font-bold text-[#f3fff0]">
                        {value}
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[#2cff5e] transition-all"
                        style={{
                          width: `${Math.max(0, Math.min(value, 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-5 text-sm text-[#8fae93]">
              Loading score details...
            </p>
          )}
        </div>
      </aside>


    </div>
  )
}