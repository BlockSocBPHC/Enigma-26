"use server"
import getTeamScore from "../TeamScore/getTeamScore"
import getDetails from "./getDetails"
import updateTeamScore from "../TeamScore/updateTeamScore"
import getEvent from "./getEvent"

const applyEventChanges = async (teamname: string) => {
    const global_event = getEvent()
    let {adoption, security, decentralization, treasury, stability} = await getTeamScore(teamname)
    const {security_change, decentralization_change, treasury_change, adoption_change, stability_change} = await getDetails(global_event)
    adoption += adoption_change
    security += security_change
    decentralization += decentralization_change
    treasury += treasury_change
    stability += stability_change

    const data = await updateTeamScore(teamname, adoption, security, decentralization, treasury, stability)
    console.log(data)
    return data
}

export default applyEventChanges
