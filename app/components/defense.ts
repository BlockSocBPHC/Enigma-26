import { createClient } from "@/utils/supabase/client"

type AttackType =
  | "Spam Attack"
  | "Validator Bribery"
  | "Governance Attack"
  | "Treasury Drain"
  | "Network Fork Attack"
  | "Reputation Attack"
  | "Smart Contract Exploit"

const calculateDefence = async (
  teamName: string,
  attackType: AttackType
) => {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("name", teamName)
    .single()

  if (error) throw error

  if (!data) {
    throw new Error("Team not found")
  }

  // Team stats
  const {
    adoption,
    security,
    treasury,
    stability,
    decentralization,
  } = data

  let defence = 0

  switch (attackType) {
    case "Spam Attack":
      defence = 0.6 * security + 0.4 * adoption
      break

    case "Validator Bribery":
      defence = 0.7 * security + 0.3 * decentralization
      break

    case "Governance Attack":
      defence = 0.8 * decentralization + 0.2 * security
      break

    case "Treasury Drain":
      defence = 0.7 * treasury + 0.3 * security
      break

    case "Network Fork Attack":
      defence = 0.6 * decentralization + 0.4 * adoption
      break

    case "Reputation Attack":
      defence = 0.7 * adoption + 0.3 * treasury
      break

    case "Smart Contract Exploit":
      defence = security
      break

    default:
      throw new Error("Invalid attack type")
  }

  return defence
}

export default calculateDefence