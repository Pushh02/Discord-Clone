import { currentUser, redirectToSignIn } from "@clerk/nextjs";
import { db } from "@/lib/db";

export const initialProfile = async()=>{
    const user = await currentUser();

    if(!user){
        const absoluteUrl = `${process.env.NEXT_PUBLIC_WEBSITE_URL}/sign-in`;
        return redirectToSignIn({ returnBackUrl: absoluteUrl });
    }

    const profile = await db.profile.findUnique({
        where:{
            userId: user.id
        }
    })

    if(profile){
        return profile
    }

    const newProfile = await db.profile.create({
        data:{
            userId: user.id,
            name: `${user.firstName} ${user.lastName}`,
            imageUrl: user.imageUrl,
            email: user.emailAddresses[0].emailAddress
        }
    })
    
    return newProfile;
}