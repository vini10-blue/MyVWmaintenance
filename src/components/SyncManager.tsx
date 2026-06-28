import { useEffect } from "react";
import { useAuth } from "../auth/AuthProvider";
import { fullSync } from "../lib/sync";

/**
 * Drives cloud sync: runs a full sync when the user signs in, when the window
 * regains focus, and when the network comes back. Renders nothing.
 */
export function SyncManager() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    fullSync();
    const onFocus = () => fullSync();
    const onOnline = () => fullSync();
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, [user?.id]);

  return null;
}
