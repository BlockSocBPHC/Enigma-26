"use client"
import getTeamScore from "./utils/TeamScore/getTeamScore"
import GoogleLoginButton from "./components/googleLoginButton"
import applyUpgradePhase from "./components/applyUpgradePhase"
import getDefenseScore from "./utils/attack/ValuesGetter/getDefenseScore"
import isAttackSuccessful from "./utils/attack/isAttackSuccessful"
import afterAttack from "./components/afterAttack"

export default function Page() {
  
  const handleClick = async () => {
    // await getTeamScore("Avalanche")
    // await applyUpgradePhase("Bitcoin", "Transaction Fees", "Low")
    // await applyUpgradePhase("Bitcoin", "Security Budget", "Low")
    // await applyUpgradePhase("Bitcoin", "Validator Rewards", "Low")
    // const data =await getDefenseScore("Bitcoin", "Smart Contract Exploit")
    // console.log("defense score: ", data);
    // const value = await isAttackSuccessful("Bitcoin", "Smart Contract Exploit", "All-Out Attack")
    // console.log("bool", value)
    const data = await afterAttack("Cardano", "Bitcoin", "Smart Contract Exploit", "All-Out Attack")
    console.log(data)
  }
  return (
    <>
      <h1>Hello World </h1>

      {/* Will be implemented after everything is completed */}
      {/* <GoogleLoginButton/>   */}

      {/* <button onClick={handleClick}>
        Click Me
      </button> */}
      
    </>
  )
}