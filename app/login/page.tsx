"use client";

import { useRouter } from "next/navigation";
import { authenticateUser, resetPassword } from "./actions";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/supabaseClient";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Check if the user is already logged in
        const checkSession = async () => {
            const supabase = createClient();
            const { data: session } = await supabase.auth.getSession();

            if (session?.session) {
                // Redirect to home if user is logged in
                router.push("/");
            }
        };

        checkSession();
    }, [router]);

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setMessage("");
        setIsLoading(true);
    
        const formData = new FormData();
        formData.append("email", email);
        formData.append("password", password);
    
        const result = await authenticateUser(formData);
    
        setIsLoading(false);
    
        if (result?.success) {
            if (result?.signup) {
                setMessage("Signup successful. Check your email to confirm your account.");
                return;
            }
    
            // Manually refresh the session before redirecting
            const supabase = createClient();
            await supabase.auth.refreshSession();
    
            router.push("/");
            return;
        }
    
        if (result?.error) {
            setMessage(result.error);
        } else if (result?.message) {
            setMessage(result.message || "");
        }
    };
         

    const handlePasswordReset = async () => {
        if (!email) {
            setMessage("Please enter your email first.");
            return;
        }

        setMessage("");
        setResetPasswordLoading(true);

        const result = await resetPassword(email);

        setResetPasswordLoading(false);

        if (result?.error) {
            setMessage(result.error);
        } else {
            setMessage(result.message || "");
        }
    };

    return (
        <div className="mt-5 mx-auto max-w-md p-4">
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <h2 className="text-center text-lg font-bold">Log In / Sign Up</h2>
                {message && (
                    <p className={`text-center text-sm ${message.includes("success") ? "text-green-500" : "text-red-500"}`}>
                        {message}
                    </p>
                )}

                <div className="flex flex-col gap-4">
                    <label className="flex justify-between items-center">
                        <span className="text-md font-medium mr-2">Email:</span>
                        <input
                            type="email"
                            name="email"
                            className="p-2 border rounded-lg flex-1 shadow-md"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </label>
                    <label className="flex justify-between items-center">
                        <span className="text-md font-medium mr-2">Password:</span>
                        <input
                            type="password"
                            name="password"
                            className="p-2 border rounded-lg flex-1 shadow-md"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </label>
                </div>

                <button
                    className="border border-blue-300 rounded-lg p-2 self-center hover:bg-blue-50 shadow-md"
                    type="submit"
                    disabled={isLoading}
                >
                    {isLoading ? "Processing..." : "Log In / Sign Up"}
                </button>
                <button
                    className="border border-blue-300 rounded-lg p-2 self-center hover:bg-blue-50 shadow-md"
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={resetPasswordLoading}
                >
                    {resetPasswordLoading ? "Processing..." : "Reset Password"}
                </button>
            </form>
        </div>
    );
}
