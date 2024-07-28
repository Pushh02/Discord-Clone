"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { io as ClientIO } from "socket.io-client";
import { socket } from "../../app/socket"

type SocketContextType = {
  socket: any | null;
  isConnected: boolean;
};

const ScoketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => {
  return useContext(ScoketContext);
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [transport, setTransport] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    
    if (socket.connected) {
      onConnect();
    }

    function onConnect() {
      setIsConnected(true);
      setTransport(socket.io.engine.transport.name);

      socket.io.engine.on("upgrade", (transport) => {
        setTransport(transport.name);
      });
    }

    function onDisconnect() {
      setIsConnected(false);
      setTransport("N/A");
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  return (
    <ScoketContext.Provider value={{ socket, isConnected }}>
      {children}
    </ScoketContext.Provider>
  );
};
