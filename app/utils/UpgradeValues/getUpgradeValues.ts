import { createClient } from '@/utils/supabase/server'
import { upgradeOptions, upgradeTypes } from '../../lib/types'
import { cookies } from "next/headers"
const getUpgradeValues = async (upgradeOption: upgradeOptions, upgradeType: upgradeTypes) => {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const {data, error} = await supabase
        .from("upgrades")
        .select("adoption_change, security_change, decentralization_change, treasury_change, stability_change")
        .eq("category", upgradeOption)
        .eq("choice", upgradeType)
        .single()
    if (error) throw error;
    return data
}

export default getUpgradeValues
