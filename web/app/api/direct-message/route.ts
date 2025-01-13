import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

const MESSAGE_BATCH = 10;

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();
    const { searchParams } = new URL(req.url);

    const cursor = searchParams.get("cursor");
    const conversationId = searchParams.get("conversationId");

    if (!profile) {
      return new NextResponse("Unauthorised", { status: 401 });
    }

    if (!conversationId) {
      return new NextResponse("Conversation ID missing", { status: 400 });
    }

    let messages = await db.directMessage.findMany({
      take: MESSAGE_BATCH,
      where: {
        conversationId,
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
      ...(cursor && {
        skip: 1,
        cursor: {
          id: cursor,
        },
      }),
    });

    let nextCursor = null;

    if (messages.length === MESSAGE_BATCH) {
      nextCursor = messages[MESSAGE_BATCH - 1].id;
    }

    // Transform messages to match the expected format
    const transformedMessages = messages.map(message => ({
      id: message.id,
      content: message.content,
      senderId: message.memberId,
      timestamp: message.createdAt
    }));

    return NextResponse.json(transformedMessages);
  } catch (err) {
    console.log("DIRECT_MESSAGE_GET", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();
    const { content, conversationId } = await req.json();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!conversationId) {
      return new NextResponse("Conversation ID missing", { status: 400 });
    }

    if (!content) {
      return new NextResponse("Content missing", { status: 400 });
    }

    const conversation = await db.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          {
            memberOne: {
              profileId: profile.id
            }
          },
          {
            memberTwo: {
              profileId: profile.id
            }
          }
        ]
      },
      include: {
        memberOne: true,
        memberTwo: true
      }
    });

    if (!conversation) {
      return new NextResponse("Conversation not found", { status: 404 });
    }

    const member = conversation.memberOne.profileId === profile.id 
      ? conversation.memberOne 
      : conversation.memberTwo;

    const message = await db.directMessage.create({
      data: {
        content,
        fileUrl: '',
        member: {
          connect: {
            id: member.id
          }
        },
        conversation: {
          connect: {
            id: conversationId
          }
        }
      },
      include: {
        member: {
          include: {
            profile: true
          }
        }
      }
    });

    // Transform the message to match the expected format
    const transformedMessage = {
      id: message.id,
      content: message.content,
      senderId: message.memberId,
      timestamp: message.createdAt
    };

    return NextResponse.json(transformedMessage);
  } catch (err) {
    console.log("DIRECT_MESSAGE_POST", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
