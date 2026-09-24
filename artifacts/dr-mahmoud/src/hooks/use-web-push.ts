import { useState, useEffect, useCallback } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useWebPush(studentId?: number | null) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    ) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    setLoading(true);

    try {
      // 1. Request notification permission
      const currentPerm = await Notification.requestPermission();
      setPermission(currentPerm);
      if (currentPerm !== "granted") {
        setLoading(false);
        return false;
      }

      // 2. Fetch VAPID public key
      const keyRes = await fetch("/api/push/vapid-public-key").catch(() => null);
      if (!keyRes || !keyRes.ok) throw new Error("تعذر جلب مفتاح الإشعارات");
      const { publicKey } = await keyRes.json();
      if (!publicKey) throw new Error("مفتاح الإشعارات غير متوفر");

      // 3. Ensure service worker is ready
      const registration = await navigator.serviceWorker.ready;

      // 4. Subscribe to Push Manager
      let sub = await registration.pushManager.getSubscription();
      if (!sub) {
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      // 5. Send subscription to server
      const json = sub.toJSON();
      const p256dh = json.keys?.p256dh;
      const auth = json.keys?.auth;
      if (!p256dh || !auth) throw new Error("مفاتيح التشفير غير مكتملة");

      const saveRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          subscription: {
            endpoint: sub.endpoint,
            keys: { p256dh, auth },
          },
          studentId: studentId || undefined,
        }),
      });

      if (saveRes.ok) {
        setIsSubscribed(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error("[WebPush Hook] Failed to subscribe:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported, studentId]);

  // If permission is already granted, verify subscription on mount
  useEffect(() => {
    if (!isSupported || Notification.permission !== "granted") return;
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) {
          setIsSubscribed(true);
          // Sync with server silently
          void subscribeToPush();
        }
      });
    }).catch(() => {});
  }, [isSupported, subscribeToPush]);

  return {
    isSupported,
    permission,
    isSubscribed,
    loading,
    subscribeToPush,
  };
}
