import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when the app is configured to talk to a Supabase backend. */
export const cloudEnabled = Boolean(url && key);

// A single shared client. If the env vars are missing the app still runs in
// local-only mode (no cloud mirror), so guard usages with `cloudEnabled`.
export const supabase: SupabaseClient | null = cloudEnabled
  ? createClient(url!, key!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // PKCE returns the login code as a "?code=" query param rather than in
        // the URL hash, so it doesn't collide with the app's HashRouter.
        flowType: "pkce",
      },
    })
  : null;

/** Storage bucket that holds attachment files (photos, receipts, documents). */
export const ATTACHMENT_BUCKET = "attachments";
