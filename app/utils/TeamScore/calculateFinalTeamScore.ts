
const calulateFinalTeamScore = async (
    adoption: number,
    security: number,
    decentralization: number,
    treasury: number,
    stability: number
) => {   

    const final_Score = (0.30 * adoption)+(0.30 * security)+(0.20 * treasury)+(0.20 * stability)
    return final_Score
}

export default calulateFinalTeamScore
