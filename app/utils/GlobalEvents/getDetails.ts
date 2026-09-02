import { createClient } from '@/utils/supabase/client'
import { GlobalEventType } from '@/app/lib/types'

const getDetails = async (global_event: GlobalEventType) => {
    const supabase = createClient()

    const { data, error } = await supabase
        .from("global_events")
        .select("security_change, decentralization_change, treasury_change, adoption_change, stability_change")
        .eq("event_name", global_event)
        .single()
    if (error) throw error;
    return data;

}

export default getDetails
