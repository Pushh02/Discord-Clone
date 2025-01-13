"use client";

import { Member, Profile } from "@prisma/client";
import { useEffect, useState, useRef } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { UserAvatar } from "../user-avatar";
import { cn } from "@/lib/utils";
import axios from "axios";
import Image from "next/image";

interface Message {
  id: string;
  content: string;
  senderId: string;
  timestamp: Date;
  fileUrl?: string | null;
}

interface ChatMessagesProps {
  member: Member & {
    profile: Profile;
  };
  otherMember: Member & {
    profile: Profile;
  };
  name: string;
  chatId: string;
  type: string;
  apiUrl: string;
  paramKey: string;
  paramValue: string;
}

export const ChatMessages = ({
  member,
  otherMember,
  name,
  chatId,
  type,
  apiUrl,
  paramKey,
  paramValue,
}: ChatMessagesProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);
  const hasInitialFetch = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (hasInitialFetch.current) return;
      
      try {
        console.log("Fetching messages from:", `${apiUrl}?${paramKey}=${paramValue}`);
        const response = await axios.get(`${apiUrl}?${paramKey}=${paramValue}`);
        console.log("Initial messages loaded:", response.data);
        if (Array.isArray(response.data)) {
          setMessages(response.data);
          hasInitialFetch.current = true;
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();
  }, [apiUrl, paramKey, paramValue]);

  const onMessage = (message: Message) => {
    console.log("Received message in ChatMessages:", message);
    
    setMessages((current) => {
      if (current.some(m => m.id === message.id)) {
        return current;
      }
      if (messagesRef.current.some(m => m.id === message.id)) {
        return current;
      }

      const newMessages = [...current, message];
      console.log("New messages state:", newMessages);
      return newMessages;
    });
  };

  const { sendMessage } = useWebSocket({
    conversationId: chatId,
    //@ts-ignore
    onMessage,
  });

  useEffect(() => {
    const messageContainer = document.getElementById('message-container');
    if (messageContainer) {
      messageContainer.scrollTop = messageContainer.scrollHeight;
    }
  }, [messages]);

  return (
    <div id="message-container" className="flex-1 flex flex-col py-4 overflow-y-auto">
      <div className="flex-1" />
      <div className="space-y-2">
        {messages && messages.length > 0 ? (
          messages.map((message) => {
            const isOwner = message.senderId === member.id;
            const messageKey = `${message.id}-${message.timestamp}`;
            
            return (
              <div
                key={messageKey}
                className="relative group flex items-center hover:bg-black/5 p-4 transition w-full"
              >
                <div className="group flex gap-x-2 items-start w-full">
                  <div className="cursor-pointer hover:drop-shadow-md transition">
                    <UserAvatar 
                      src={isOwner ? otherMember.profile.imageUrl : member.profile.imageUrl} 
                    />
                  </div>
                  <div className="flex flex-col w-full">
                    <div className="flex items-center gap-x-2">
                      <div className="flex items-center">
                        <p className="font-semibold text-sm hover:underline cursor-pointer">
                          {isOwner ? otherMember.profile.name : member.profile.name}
                        </p>
                      </div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {message.fileUrl && (
                      <a
                        href={message.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative aspect-square rounded-md mt-2 overflow-hidden border flex items-center bg-secondary h-48 w-48"
                      >
                        <Image
                          src={message.fileUrl}
                          alt={message.content}
                          className="object-cover"
                        />
                      </a>
                    )}
                    <p className={cn(
                      "text-sm text-zinc-600 dark:text-zinc-300"
                    )}>
                      {message.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex items-center justify-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No messages yet. Start a conversation!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
