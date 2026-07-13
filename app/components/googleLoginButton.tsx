"use client";
import signIn from "../utils/googleAuth";

export default function GoogleLoginButton() {
    return (
        <button onClick={signIn}>
            Continue with Google
        </button>
    );
}