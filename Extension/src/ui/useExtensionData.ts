import { useCallback, useEffect, useRef, useState } from "react";
import { sendRequest } from "../shared/api";
import type { DashboardSnapshot, ExtensionRequest } from "../shared/models";
import { applyAppearance } from "./appearance";

export const useExtensionData = (days = 31) => {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const load = useCallback(async (sync: boolean) => {
    const version = ++requestVersion.current;
    try {
      setError(null);
      const data = await sendRequest<DashboardSnapshot>({ type: "GET_DASHBOARD", days, sync });
      if (version !== requestVersion.current) return;
      setSnapshot(data);
      applyAppearance(data.settings);
    } catch (reason) {
      if (version !== requestVersion.current) return;
      setError(reason instanceof Error ? reason.message : "Could not load extension data");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [days]);

  const refresh = useCallback(() => load(true), [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    let timer: number | undefined;
    const refreshFromStorage = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName !== "local" || (!changes["daylight:signed-state"] && !changes["nudge:signed-state"])) return;
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(() => void load(false), 40);
    };
    chrome.storage.onChanged.addListener(refreshFromStorage);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      chrome.storage.onChanged.removeListener(refreshFromStorage);
    };
  }, [load]);

  useEffect(() => {
    const refreshOnFocus = () => void refresh();
    const refreshOnVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisibility);
    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisibility);
    };
  }, [refresh]);

  const mutate = useCallback(async (request: ExtensionRequest) => {
    setError(null);
    try {
      await sendRequest(request);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save this change");
      throw reason;
    }
  }, [refresh]);

  return { snapshot, loading, error, refresh, mutate };
};
