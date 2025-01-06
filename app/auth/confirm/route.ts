import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/supabaseServer";
import { redirect } from "next/navigation";

// when a user clicks confirm on the email link then this exchanges their code for a valid
// auth token
export async function GET(request: NextRequest){
    const { searchParams } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType
    const next = searchParams.get('next') ?? '/'

    if(token_hash && type){
        const supabase = await createClient()
        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        })

        if(!error){
            // redirect user to specified redirect URL or root of app
            redirect(next)
        }
    }
    // send them to error if problem
    redirect('/error')
}