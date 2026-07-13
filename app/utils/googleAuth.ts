"use client"
import { createClient } from "@/utils/supabase/client";

const signIn = async () => {
    const supabase = createClient();

    await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: "http://localhost:3000/auth/callback",
        },
    });
};

export default signIn;