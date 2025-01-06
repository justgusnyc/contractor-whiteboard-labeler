"use server";

import { createClient } from "@/utils/supabase/supabaseServer";

export async function authenticateUser(formData: FormData) {
    const supabase = await createClient();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { error: "Email and password are required." };
    }

    // Attempt to log the user in
    const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (!loginError) {
        return { success: true, message: "Logged in successfully!" };
    }

    console.warn("Login failed, attempting signup...");

    // Attempt to sign the user up
    const { data: signupData, error: signupError } = await supabase.auth.signUp(
        { email, password },
    );

    if (signupError) {
        console.error("Signup failed:", signupError);
        if (signupError.status === 500) {
            return { error: "There was a problem with the database. Please try again later." };
        }
        return { error: signupError.message || "Signup failed. Please try again." };
    }

    // Manually add the user to `users` table for safe keeping and referencing 
    const userId = signupData.user?.id;
    if (userId) {
        const { error: insertError } = await supabase.from("users").insert({
            id: userId,
            email,
            created_at: new Date().toISOString(),
        });

        if (insertError) {
            console.error("Failed to add user to users table:", insertError);
            return {
                success: true,
                message: "Signup successful! Check your email to confirm your account.",
                warning: "However, there was an issue syncing your account. Please contact support.",
            };
        }
    }

    return {
        success: true,
        signup: true,
        message: "Signup successful! Check your email to confirm your account.",
    };
}

export async function resetPassword(email: string) {
    const supabase = await createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "http://localhost:3000/login", // Adjust for production
    });

    if (error) {
        console.error(error);
        return { error: "Error resetting password. Please try again." };
    }

    return { success: true, message: "Password reset email sent! Check your inbox." };
}

