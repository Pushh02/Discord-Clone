import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { MemberRole } from "@prisma/client";
import { NextResponse } from "next/server";

export async function DELETE(req: Request, res: Response) {
  try {
    const profile = await currentProfile();
    const { searchParams } = new URL(req.url);
    const serverId = searchParams.get("serverId");
    const channelId = searchParams.get("channelId");
    const messageId = searchParams.get("messageId");

    if(!profile){
        return new NextResponse("Unautorized", { status: 401 });
    }
    if (!channelId){
        return new NextResponse("CHANNEL_ID_MISSING", { status: 400 });
    }
    if (!serverId){
        return new NextResponse("SERVER_ID_MISSING", { status: 400 });
    }

    const server = await db.server.findFirst({
        where: {
            id: serverId as string,
            members: {
                some: {
                    profileId: profile.id,
                }
            }
        },
        include: {
            members: true,
        }
    })

    if (!server){
        return new NextResponse("SERVER_NOT_FOUND", { status: 404 });
    }

    const channel = db.channel.findFirst({
        where: {
            id: channelId as string,
            serverId: server.id as string,
        },
    });

    if (!channel){
        return new NextResponse("CHANNEL_NOT_FOUND", { status: 404 });
    }

    const member = server.members.find((member) => member.profileId === profile.id);

    if (!member){
        return new NextResponse("MEMBER_NOT_FOUND", { status: 404 });
    }

    let message = await db.message.findFirst({
        where: {
            id: messageId as string,
            channelId: channelId as string,
        },
        include: {
            member: {
                include: {
                    profile: true,
                }
            }
        }
    });

    if (!message || message.deleted){
        return new NextResponse("MESSAGE_NOT_FOUND", { status: 404 });
    }

    const isMessageOwner = message.memberId === member.id;
    const isAdmin = member.role === MemberRole.ADMIN;
    const isModerator = member.role === MemberRole.MODERATOR;
    const canModify = isMessageOwner || isAdmin || isModerator;

    if(!canModify){
        return new NextResponse("Unautorized", { status: 401 });
    }

    message = await db.message.update({
        where: {
            id: messageId as string,
        },
        data: {
            fileUrl: null,
            content: "This message has been deleted",
            deleted: true,
        },
        include: {
            member: {
                include: {
                    profile: true,
                }
            }
        }
    })
    return NextResponse.json({message});

  } catch (err) {
    console.log("[MESSAGE_ID]", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(req: Request, res: Response) {
    try {
      const profile = await currentProfile();
      const { searchParams } = new URL(req.url);
      const messageId = searchParams.get("messageId");
      const serverId = searchParams.get("serverId");
      const channelId = searchParams.get("channelId");
      const { content } = await req.json();
  
      if(!profile){
          return new NextResponse("Unautorized", { status: 401 });
      }
      if (!channelId){
          return new NextResponse("CHANNEL_ID_MISSING", { status: 400 });
      }
      if (!serverId){
          return new NextResponse("SERVER_ID_MISSING", { status: 400 });
      }
  
      const server = await db.server.findFirst({
          where: {
              id: serverId as string,
              members: {
                  some: {
                      profileId: profile.id,
                  }
              }
          },
          include: {
              members: true,
          }
      })
  
      if (!server){
          return new NextResponse("SERVER_NOT_FOUND", { status: 404 });
      }
  
      const channel = db.channel.findFirst({
          where: {
              id: channelId as string,
              serverId: server.id as string,
          },
      });
  
      if (!channel){
          return new NextResponse("CHANNEL_NOT_FOUND", { status: 404 });
      }
  
      const member = server.members.find((member) => member.profileId === profile.id);
  
      if (!member){
          return new NextResponse("MEMBER_NOT_FOUND", { status: 404 });
      }
  
      let message = await db.message.findFirst({
          where: {
              id: messageId as string,
              channelId: channelId as string,
          },
          include: {
              member: {
                  include: {
                      profile: true,
                  }
              }
          }
      });
  
      if (!message || message.deleted){
          return new NextResponse("MESSAGE_NOT_FOUND", { status: 404 });
      }
  
      const isMessageOwner = message.memberId === member.id;

      if(!isMessageOwner){
        return new NextResponse("Unautorized", { status: 401 });
      }
  
      message = await db.message.update({
          where: {
              id: messageId as string,
          },
          data: {
              content,
          },
          include: {
              member: {
                  include: {
                      profile: true,
                  }
              }
          }
      })

      const updateKey = `chat:${channelId}:message:update`;
      //@ts-ignore
      res?.socket?.server?.io?.emit(updateKey, message);

      return NextResponse.json({message}); 
    } catch (err) {
      console.log("[MESSAGE_ID]", err);
      return new NextResponse("Internal Error", { status: 500 });
    }
  }
  