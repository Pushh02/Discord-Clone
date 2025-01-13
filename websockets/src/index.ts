import express from "express";
import WebSocket from "ws";
import cors from "cors";
import { randomUUID } from "crypto";

interface Message {
    id: string;
    content: string;
    conversationId: string;
    senderId: string;
    timestamp: Date;
}

const app = express();
app.use(cors());

const server = app.listen(3001, () => {
    console.log("WebSocket server started on port 3001");
});

const wss = new WebSocket.Server({ server });

// Store clients with both conversationId and clientId
const clients = new Map<string, Map<string, WebSocket>>();

wss.on("connection", (ws, req) => {
    const conversationId = new URL(req.url!, `http://${req.headers.host}`).searchParams.get("conversationId");
    const clientId = randomUUID(); // Generate unique client ID
    
    if (!conversationId) {
        ws.close();
        return;
    }

    // Initialize conversation map if it doesn't exist
    if (!clients.has(conversationId)) {
        clients.set(conversationId, new Map());
    }

    // Add this client to the conversation
    const conversationClients = clients.get(conversationId)!;
    conversationClients.set(clientId, ws);

    console.log(`Client ${clientId} connected to conversation: ${conversationId}`);
    console.log(`Active clients in conversation: ${conversationClients.size}`);

    ws.on("message", (rawMessage) => {
        try {
            const incomingMessage = JSON.parse(rawMessage.toString());
            const message: Message = {
                id: randomUUID(),
                content: incomingMessage.content,
                conversationId: incomingMessage.conversationId,
                senderId: incomingMessage.senderId,
                timestamp: new Date()
            };
            
            console.log(`Message received from client ${clientId}:`, message);

            // Broadcast to all clients in the same conversation except sender
            const conversationClients = clients.get(conversationId);
            if (conversationClients) {
                conversationClients.forEach((client, id) => {
                    if (id !== clientId && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(message));
                    }
                });
            }
        } catch (error) {
            console.error("Error processing message:", error);
        }
    });

    ws.on("close", () => {
        // Remove this client from the conversation
        const conversationClients = clients.get(conversationId);
        if (conversationClients) {
            conversationClients.delete(clientId);
            console.log(`Client ${clientId} disconnected from conversation: ${conversationId}`);
            console.log(`Remaining clients in conversation: ${conversationClients.size}`);

            // If no more clients in this conversation, remove the conversation
            if (conversationClients.size === 0) {
                clients.delete(conversationId);
                console.log(`Removed empty conversation: ${conversationId}`);
            }
        }
    });

    ws.on("error", (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        const conversationClients = clients.get(conversationId);
        if (conversationClients) {
            conversationClients.delete(clientId);
        }
    });
});
