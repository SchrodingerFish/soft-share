import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuthStore } from '../../store';

export const useNotifications = (userId?: number) => {
  const setUnreadCount = useAuthStore((state) => state.setUnreadCount);

  useEffect(() => {
    if (!userId) return;

    const socket = io(window.location.origin);

    socket.on("connect", () => {
      console.log("Connected to WebSocket");
      socket.emit("join", userId.toString());
    });

    socket.on("notification", (data: { title: string; content: string; link?: string }) => {
      toast.info(data.title, {
        description: data.content,
        duration: 5000,
        action: data.link ? {
          label: "View",
          onClick: () => window.location.href = data.link!
        } : undefined
      });
      setUnreadCount(useAuthStore.getState().unreadCount + 1);
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, setUnreadCount]);
};
