'use client';

import { useForm } from "react-hook-form";
import { useWebSocket } from "@/hooks/use-websocket";
import { useParams } from "next/navigation";

interface ChatInputProps {
    name: string;
    type: "conversation" | "channel";
    apiUrl: string;
    query: {
        conversationId?: string;
        channelId?: string;
    };
}

interface FormData {
    content: string;
}

export const ChatInput = ({
    name,
    type,
    apiUrl,
    query,
}: ChatInputProps) => {
    const params = useParams();
    const { register, handleSubmit, reset } = useForm<FormData>();
    
    const conversationId = query.conversationId || query.channelId;
    
    const { sendMessage } = useWebSocket({
        conversationId: conversationId || "",
        onMessage: () => {}, // We handle messages in ChatMessages component
    });

    const onSubmit = async (data: FormData) => {
        try {
            if (!data.content.trim()) return;

            // Send message through WebSocket
            sendMessage(data.content, params?.memberId as string);

            // Also send to API for persistence
            await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    content: data.content,
                    ...query,
                }),
            });

            reset();
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 bg-gray-100 dark:bg-gray-700">
            <div className="relative w-full">
                <input
                    {...register("content", { required: true })}
                    placeholder={`Message ${name}`}
                    className="px-4 py-2 w-full rounded-lg bg-white dark:bg-gray-600 focus:outline-none"
                />
                <button 
                    type="submit"
                    className="absolute right-2 top-2 bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600"
                >
                    Send
                </button>
            </div>
        </form>
    );
};
