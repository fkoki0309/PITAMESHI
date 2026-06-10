"use client";

import { useCallback, useEffect, useState } from "react";

type ToastProps = {
  message: string;
  type?: "error" | "success" | "info";
  duration?: number;
  onDismiss: () => void;
};

export function Toast({ message, type = "error", duration = 3000, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  const bg =
    type === "error" ? "bg-red-500" :
    type === "success" ? "bg-green-500" :
    "bg-foreground";

  return (
    <div
      className={`fixed top-4 left-4 right-4 z-50 max-w-md mx-auto px-4 py-3 rounded-2xl shadow-xl text-white text-sm font-medium text-center transition-all duration-300 ${bg} ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      }`}
    >
      {message}
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<{ id: number; message: string; type: "error" | "success" | "info" }[]>([]);

  const showToast = useCallback((message: string, type: "error" | "success" | "info" = "error") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const ToastContainer = () => (
    <>
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onDismiss={() => dismiss(t.id)} />
      ))}
    </>
  );

  return { showToast, ToastContainer };
}
