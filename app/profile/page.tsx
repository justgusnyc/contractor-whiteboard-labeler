import { createClient } from "@/utils/supabase/supabaseServer";
import { redirect } from "next/navigation";

export default async function ProfilePage(){
    const supabase = await createClient()

    const { data, error } = await supabase.auth.getUser()
    if(error || !data){
        redirect('/login')
    }

    return(
        <div>
            <h1>Profile: </h1>
            <p>{data.user.email}</p>
            <p>{data.user.id}</p>
        
        </div>
    )


}