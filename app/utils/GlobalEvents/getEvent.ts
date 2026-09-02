import { GlobalEventType } from "@/app/lib/types"
const events: GlobalEventType[] = [
    "AI Security Breakthrough",
    "Bull Market",
    "Coordinated Cyber Attack",
    "Institutional Investment Wave",
    "Major Exchange Listing",
    "Market Crash",
    "Open Source Contributor Boom",
    "Regulatory Crackdown",
    "Security Grant",
    "Validator Incentive Program"
]

const getEvent = () => {
    return events[Math.floor(Math.random() * events.length)]
}
export default getEvent
