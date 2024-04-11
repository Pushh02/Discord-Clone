import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { MemberRole } from "@prisma/client";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();
    const { name, type } = await req.json();
    const { searchParams } = new URL(req.url);

    const serverId = searchParams.get("serverId");

    if (!profile) {
      return new NextResponse("Unautorized", { status: 401 });
    }
    if (!serverId) {
      return new NextResponse("SERVER_ID_MISSING", { status: 400 });
    }

    if(name === "general"){
        return new NextResponse("Name cannot ne 'general'", { status: 400 });
    }

    const server = await db.server.update({
        where:{
            id: serverId,
            members:{
                some:{
                    profileId: profile.id,
                    role:{
                        in: [MemberRole.ADMIN, MemberRole.MODERATOR]
                    }
                }
            }
        },
        data:{
            channels:{
                create:{
                    profileId: profile.id,
                    name,
                    type,
                }
            }
        }
    })
    
    return NextResponse.json(server);

  } catch (err) {
    console.log("[MEMBERS_ID_PATCH]", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
