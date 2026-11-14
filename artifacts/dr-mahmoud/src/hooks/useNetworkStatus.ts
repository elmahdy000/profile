import { useState, useEffect, useCallback } from "react";
import { getOfflineStorageMetrics, type OfflineStorageMetrics } from "@/lib/offlineStorage";

const LS_FORCE_OFFLINE_KEY = "dr_force_offline_mode";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  });

  const [forceOfflineMode, setForceOfflineMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(LS_FORCE_OFFLINE_KEY) === "true";
  });

  const [metrics, setMetrics] = useState<OfflineStorageMetrics>({
    lessonsCount: 0,
    questionsCount: 0,
    estimatedBytes: 0,
    estimatedMbFormatted: "0 كيلوبايت",
  });

  const refreshMetrics = useCallback(async () => {
    const m = await getOfflineStorageMetrics();
    setMetrics(m);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("dr_offline_vault_changed", refreshMetrics);

    void refreshMetrics();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("dr_offline_vault_changed", refreshMetrics);
    };
  }, [refreshMetrics]);

  const toggleForceOfflineMode = useCallback((desired?: boolean) => {
    setForceOfflineMode((prev) => {
      const next = desired !== undefined ? desired : !prev;
      localStorage.setItem(LS_FORCE_OFFLINE_KEY, String(next));
      return next;
    });
  }, []);

  const isEffectivelyOffline = !isOnline || forceOfflineMode;

  return {
    isOnline,
    forceOfflineMode,
    isEffectivelyOffline,
    toggleForceOfflineMode,
    metrics,
    refreshMetrics,
  };
}
