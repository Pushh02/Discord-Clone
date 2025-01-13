import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { Message } from "@prisma/client";
import { NextResponse } from "next/server";

const MESSAGES_BATCH = 10;

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();
    const { searchParams } = new URL(req.url);

    const cursor = searchParams.get("cursor");
    const channelId = searchParams.get("channelId");

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!channelId) {
      return new NextResponse("Channel ID missing", { status: 400 });
    }

    let messages = await db.message.findMany({
      take: MESSAGES_BATCH,
      where: {
        channelId,
      },
      include: {
        member: {
          include: {
            profile: true,
          }
        }
      },
      orderBy: {
        createdAt: "desc",
      },
      ...(cursor && {
        skip: 1,
        cursor: {
          id: cursor,
        },
      }),
    });

    let nextCursor = null;

    if (messages.length === MESSAGES_BATCH) {
      nextCursor = messages[MESSAGES_BATCH - 1].id;
    }

    return NextResponse.json({
      items: messages,
      nextCursor
    });
  } catch (error) {
    console.log("[MESSAGES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();
    const { content, fileUrl, channelId } = await req.json();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!channelId) {
      return new NextResponse("Channel ID missing", { status: 400 });
    }

    if (!content) {
      return new NextResponse("Content missing", { status: 400 });
    }

    const server = await db.server.findFirst({
      where: {
        channels: {
          some: {
            id: channelId
          }
        },
        members: {
          some: {
            profileId: profile.id
          }
        }
      },
      include: {
        members: true
      }
    });

    if (!server) {
      return new NextResponse("Server not found", { status: 404 });
    }

    const member = server.members.find((member) => member.profileId === profile.id);

    if (!member) {
      return new NextResponse("Member not found", { status: 404 });
    }

    const message = await db.message.create({
      data: {
        content,
        fileUrl,
        channelId,
        memberId: member.id,
      },
      include: {
        member: {
          include: {
            profile: true,
          }
        }
      }
    });

    return NextResponse.json(message);
  } catch (error) {
    console.log("[MESSAGES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
