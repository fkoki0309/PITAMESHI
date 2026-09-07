import { useEffect } from "react";

export function useHeartbeat(token: string | null, roomId: string) {
  useEffect(() => {
    if (!token) return;

    const sendPing = () =>
      fetch("/api/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ room_id: roomId }),
      });

    sendPing();
    const interval = setInterval(sendPing, 10000);

    const handleUnload = () => {
      navigator.sendBeacon("/api/ping/leave", JSON.stringify({ room_id: roomId, token }));
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [token, roomId]);
}
