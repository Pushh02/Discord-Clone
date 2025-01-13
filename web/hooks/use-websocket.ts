'use client';

import { Member, Profile } from "@prisma/client";
import { useEffect, useRef, useCallback } from 'react';

interface WebSocketMessage {
    id: string;
    content: string;
    fileUrl?: string | null;
    member?: Member & {
        profile: Profile;
    };
    senderId?: string;
    timestamp: Date;
}

interface UseWebSocketProps {
    conversationId: string;
    onMessage: (message: WebSocketMessage) => void;
}

export const useWebSocket = ({ conversationId, onMessage }: UseWebSocketProps) => {
    const ws = useRef<WebSocket | null>(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
    const isConnecting = useRef(false);

    const connectWebSocket = useCallback(() => {
        if (!conversationId || isConnecting.current) return;

        if (ws.current?.readyState === WebSocket.OPEN) {
            console.log("WebSocket already connected");
            return;
        }

        if (reconnectAttempts.current >= maxReconnectAttempts) {
            console.log("Max reconnection attempts reached");
            return;
        }

        isConnecting.current = true;

        if (ws.current) {
            ws.current.close();
            ws.current = null;
        }

        try {
            const socket = new WebSocket(`ws://localhost:3001?conversationId=${conversationId}`);
            ws.current = socket;

            socket.onopen = () => {
                console.log('WebSocket Connected');
                isConnecting.current = false;
                reconnectAttempts.current = 0;
                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                    reconnectTimeoutRef.current = undefined;
                }
            };

            socket.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    onMessage(message);
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            };

            socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                isConnecting.current = false;
            };

            socket.onclose = (event) => {
                console.log('WebSocket disconnected', event.code, event.reason);
                isConnecting.current = false;

                if (event.code !== 1000) {
                    reconnectAttempts.current += 1;
                    if (reconnectAttempts.current < maxReconnectAttempts) {
                        console.log(`Reconnect attempt ${reconnectAttempts.current} of ${maxReconnectAttempts}`);
                        reconnectTimeoutRef.current = setTimeout(() => {
                            connectWebSocket();
                        }, Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000));
                    }
                }
            };
        } catch (error) {
            console.error('Error creating WebSocket:', error);
            isConnecting.current = false;
        }
    }, [conversationId, onMessage]);

    useEffect(() => {
        connectWebSocket();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = undefined;
            }
            
            if (ws.current) {
                ws.current.close(1000, "Component unmounting");
                ws.current = null;
            }
            
            isConnecting.current = false;
            reconnectAttempts.current = 0;
        };
    }, [connectWebSocket]);

    const sendMessage = useCallback((content: string, senderId: string) => {
        if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
            console.error('WebSocket is not connected');
            return;
        }

        ws.current.send(JSON.stringify({
            content,
            conversationId,
            senderId
        }));
    }, [conversationId]);

    return { sendMessage };
};
