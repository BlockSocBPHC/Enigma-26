import getTeamScore from "../utils/TeamScore/getTeamScore"
import type { upgradeOptions, upgradeTypes } from "../lib/types"
import getUpgradeValues from "../utils/UpgradeValues/getUpgradeValues"
import updateMetrics from "../utils/TeamScore/updateTeamScore"

const applyUpgradePhase = async (teamName: string, upgradeOption: upgradeOptions, upgradeType: upgradeTypes) => {
    let { adoption, security, decentralization, treasury, stability } = await getTeamScore(teamName)
    const {adoption_change, security_change, decentralization_change, treasury_change, stability_change} = await getUpgradeValues(upgradeOption, upgradeType)

    adoption += adoption_change
    security+=security_change
    decentralization+=decentralization_change
    treasury+=treasury_change
    stability+=stability_change

    await updateMetrics(teamName, adoption, security, decentralization, treasury, stability)

    const data = await getTeamScore(teamName)
    console.log(data)
    return data
}

export default applyUpgradePhase