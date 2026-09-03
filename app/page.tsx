"use client"
import getTeamScore from "./utils/TeamScore/getTeamScore"
import GoogleLoginButton from "./components/googleLoginButton"
import applyUpgradePhase from "./components/applyUpgradePhase"
import getDefenseScore from "./utils/attack/ValuesGetter/getDefenseScore"
import isAttackSuccessful from "./utils/attack/isAttackSuccessful"
import afterAttack from "./components/afterAttack"
import applyRebuild from "./utils/Rebuild/applyRebuild"
import applyEventChanges from "./utils/GlobalEvents/applyEventChanges"
import getLeaderboard from "./utils/Leaderboard/getLeaderboard"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Leaderboard, TeamScore } from "./lib/types"

export default function Page() {
//   const [teamname, setTeamname] = useState<string> ("Bitcoin")
//   const [leaderboard, setLeaderboard] = useState<Leaderboard[]> ([])
//   const [teamScore, setTeamScore] = useState<TeamScore> ()
// useEffect(() => {
//     console.log("useeffect is running")
//     const supabase = createClient()

//     console.log("Setting up realtime...")

//     const channel = supabase
//         .channel("leaderboard")
//         .on(
//             "postgres_changes",
//             {
//                 event: "UPDATE",
//                 schema: "public",
//                 table: "teams",
//             },
//             async (payload) => {
//                 const data = await getLeaderboard()
//                 setLeaderboard(data)
//                 const data1 = await getTeamScore(teamname)
//                 setTeamScore(data1)
//             }
//         )
//         .subscribe((status) => {
//             console.log("Subscription status:", status)
//         })

//     return () => {
//         supabase.removeChannel(channel)
//     }
// }, [])

// useEffect(()=> {
//   console.log("teamScore: ",teamScore)
// },[teamScore])
// useEffect(()=> {
//   console.log("leaderboard: ",leaderboard)
// },[leaderboard])
  
  const handleClick = async () => {
    // const data = await getTeamScore("Bitcoin")
    // console.log(data)
    // await applyUpgradePhase("Bitcoin", "Transaction Fees", "Low")
    // await applyUpgradePhase("Bitcoin", "Security Budget", "Low")
    // await applyUpgradePhase("Bitcoin", "Validator Rewards", "Low")
    // const data =await getDefenseScore("Bitcoin", "Smart Contract Exploit")
    // console.log("defense score: ", data);
    // const value = await isAttackSuccessful("Bitcoin", "Smart Contract Exploit", "All-Out Attack")
    // console.log("bool", value)
    // const data = await afterAttack("Cardano", "Bitcoin", "Smart Contract Exploit", "All-Out Attack")
    // const data = await applyRebuild("Bitcoin", "Emergency Recovery")
    // console.log(data)
    // await applyEventChanges("Bitcoin")
    // const data = await getLeaderboard()
    // console.log(data)
  }
  return (
    <>
      <h1>Hello World </h1>

      {/* Will be implemented after everything is completed */}
      {/* <GoogleLoginButton/>   */}

      <button onClick={handleClick}>
        Click Me
      </button>
      
    </>
  )
}