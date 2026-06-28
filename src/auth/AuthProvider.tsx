import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { cloudEnabled, supabase } from "../lib/supabase";
import { fullSync } from "../lib/sync";

interface AuthState {
  /** Still determining whether there is a session. */
  loading: boolean;
  /** Whether a cloud backend is configured at all. */
  cloudEnabled: boolean;
  session: Session | null;
  user: User | null;
  /** True while the user is completing a password-reset link. */
  recovering: boolean;
  signInWithEmail: (email: string) => Promise<{ error?: string }>;
  /** Finish sign-in by entering the 6-digit code from the email. */
  verifyEmailOtp: (email: string, token: string) => Promise<{ error?: string }>;
  signInWithPassword: (
    email: string,
    password: string,
  ) => Promise<{ error?: string }>;
  signUpWithPassword: (
    email: string,
    password: string,
  ) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  sendPasswordReset: (email: string) => Promise<{ error?: string }>;
  /** Set a new password (used on the reset screen and from Account). */
  updatePassword: (password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(cloudEnabled);
  const [session, setSession] = useState<Session | null>(null);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      // Clicking a password-reset link signs the user in with a temporary
      // session; intercept it so the app shows a "set new password" screen.
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthState = {
    loading,
    cloudEnabled,
    session,
    user: session?.user ?? null,
    recovering,
    async signInWithEmail(email: string) {
      if (!supabase) return { error: "Cloud is not configured." };
      // Send a one-time sign-in email. It contains BOTH a magic link and a
      // 6-digit code, so the user can either tap the link or — more reliably on
      // mobile, where the link often opens in a different browser and fails —
      // type the code straight into this tab (see verifyEmailOtp).
      const emailRedirectTo = window.location.origin + import.meta.env.BASE_URL;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo },
      });
      return error ? { error: error.message } : {};
    },
    async verifyEmailOtp(email: string, token: string) {
      if (!supabase) return { error: "Cloud is not configured." };
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: token.trim(),
        type: "email",
      });
      return error ? { error: error.message } : {};
    },
    async signInWithPassword(email: string, password: string) {
      if (!supabase) return { error: "Cloud is not configured." };
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return error ? { error: error.message } : {};
    },
    async signUpWithPassword(email: string, password: string) {
      if (!supabase) return { error: "Cloud is not configured." };
      const emailRedirectTo = window.location.origin + import.meta.env.BASE_URL;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo },
      });
      if (error) return { error: error.message };
      // With "Confirm email" enabled in Supabase there's no session yet — the
      // user must click the confirmation link before they can sign in.
      return { needsConfirmation: !data.session };
    },
    async sendPasswordReset(email: string) {
      if (!supabase) return { error: "Cloud is not configured." };
      const redirectTo = window.location.origin + import.meta.env.BASE_URL;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      return error ? { error: error.message } : {};
    },
    async updatePassword(password: string) {
      if (!supabase) return { error: "Cloud is not configured." };
      const { error } = await supabase.auth.updateUser({ password });
      if (!error) setRecovering(false);
      return error ? { error: error.message } : {};
    },
    async signOut() {
      if (supabase) {
        // Make sure any unsynced local changes reach the cloud before the
        // session ends, so nothing is lost on sign-out.
        try {
          await fullSync();
        } catch {
          /* ignore — sign out anyway */
        }
        await supabase.auth.signOut();
        setRecovering(false);
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
