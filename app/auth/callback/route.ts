import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);

    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // OAuth provider returned an error
    if (error) {
        const message = errorDescription || error;

        return NextResponse.redirect(
            `${origin}/login?error=${encodeURIComponent(message)}`
        );
    }

    // No authorization code
    if (!code) {
        return NextResponse.redirect(
            `${origin}/login?error=${encodeURIComponent(
                "Authentication was cancelled or failed."
            )}`
        );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

    // Failed to exchange code for session
    if (exchangeError) {
        console.error("Auth callback error:", exchangeError);

        return NextResponse.redirect(
            `${origin}/login?error=${encodeURIComponent(
                "Unable to complete authentication. Please try again."
            )}`
        );
    }

    // Successfully authenticated
    return NextResponse.redirect(`${origin}/dashboard`);
}