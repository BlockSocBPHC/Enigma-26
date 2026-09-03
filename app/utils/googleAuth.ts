"use client";

import { createClient } from "@/utils/supabase/client";

const signIn = async () => {
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: `${window.location.origin}/auth/callback`,
        },
    });

    if (error) {
        console.error("Google sign-in error:", error);
    }
};

export default signIn;