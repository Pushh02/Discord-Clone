import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { NextApiResponseServerIo } from "@/types";
import { Message } from "@prisma/client";
import { NextResponse } from "next/server";

const MESSAGE_BATCH = 10;

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();
    const { searchParams } = new URL(req.url);

    const cursor = searchParams.get("cursor");
    const channelId = searchParams.get("channelId");

    if (!profile) {
      return new NextResponse("Unauthorised", { status: 401 });
    }

    if (!channelId) {
      return new NextResponse("Channel ID missing", { status: 400 });
    }

    let message: Message[] = [];

    if (cursor) {
      message = await db.message.findMany({
        take: MESSAGE_BATCH,
        skip: 1,
        cursor: {
          id: cursor,
        },
        where: {
          channelId,
        },
        include: {
          member: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } else {
      message = await db.message.findMany({
        take: MESSAGE_BATCH,
        where: {
          channelId,
        },
        include: {
          member: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }
    let nextCursor = null;

    if (message.length === MESSAGE_BATCH) {
      nextCursor = message[MESSAGE_BATCH - 1].id;
    }

    return NextResponse.json({
      items: message,
      nextCursor,
    });
  } catch (err) {
    console.log("MESSAGE_GET", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request, res: NextApiResponseServerIo) {
  try {
    const profile = await currentProfile();
    const { content, fileUrl } = await req.json();
    const { searchParams } = new URL(req.url);
    const serverId = searchParams.get("serverId");
    const channelId = searchParams.get("channelId");

    if (!profile) return new NextResponse("Unautorized", { status: 401 });

    if (!channelId)
      return new NextResponse("CHANNEL_ID_MISSING", { status: 400 });

    if (!serverId)
      return new NextResponse("SERVER_ID_MISSING", { status: 400 });

    if (!content) return new NextResponse("CONTENT_MISSING", { status: 400 });

    const server = await db.server.findFirst({
      where: {
        id: serverId as string,
        members: {
          some: {
            profileId: profile.id,
          },
        },
      },
      include: {
        members: true,
      },
    });

    if (!server) return new NextResponse("SERVER_NOT_FOUND", { status: 400 });

    const channel = await db.channel.findFirst({
      where: {
        id: channelId as string,
        serverId: serverId as string,
      },
    });

    if (!channel) return new NextResponse("CHANNEL_NOT_FOUND", { status: 400 });

    const member = server?.members.find(
      (member) => member.profileId === profile.id
    );

    if (!member) return new NextResponse("MEMBERs_NOT_FOUND", { status: 400 });

    const message = await db.message.create({
      data: {
        content,
        fileUrl,
        channelId: channelId as string,
        memberId: member.id,
      },
      include: {
        member: {
          include: {
            profile: true,
          },
        },
      },
    });

    const channelKey = `chat:${channelId}:messages`;

    res?.socket?.server?.io?.emit(channelKey, message);

    return NextResponse.json(message);
  } catch (err) {
    console.log("MESSAGE_POST", err);
    return new NextResponse("INTERNAL_ERROR", { status: 500 });
  }
}
