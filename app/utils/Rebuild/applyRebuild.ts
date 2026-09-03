"use server"
import { RebuildType } from '@/app/lib/types'
import getTeamScore from '../TeamScore/getTeamScore'
import getRebuildDetails from './getRebuildDetails'
import updateTeamScore from '../TeamScore/updateTeamScore'

const applyRebuild = async (teamname: string, rebuild_type: RebuildType) => {
    let {adoption, security, decentralization, treasury, stability} = await getTeamScore(teamname)
    const {treasury_cost, security_change, decentralization_change, treasury_change, adoption_change, stability_change} =await getRebuildDetails(rebuild_type)
    
    treasury= treasury - treasury_cost + treasury_change
    adoption+=adoption_change
    security+=security_change
    decentralization+=decentralization_change
    stability+=stability_change

    const data = await updateTeamScore(teamname, adoption, security, decentralization, treasury, stability)
    return data

}

export default applyRebuild
