import { createClient } from '@/utils/supabase/server'
import { GlobalEventType } from '@/app/lib/types'
import { cookies } from 'next/headers'

const getDetails = async (global_event: GlobalEventType) => {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
        .from("global_events")
        .select("security_change, decentralization_change, treasury_change, adoption_change, stability_change")
        .eq("event_name", global_event)
        .single()
    if (error) throw error;
    return data;

}

export default getDetails
