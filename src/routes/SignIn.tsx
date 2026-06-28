import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";

// Supabase rate-limits sign-in emails (roughly one per minute per address), so
// we disable "resend" for a cooldown to stop users hammering the limit.
const RESEND_COOLDOWN = 60;

export function SignIn() {
  const { signInWithEmail, verifyEmailOtp } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Tick the resend cooldown down to zero.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (!email.trim() || busy || cooldown > 0) return;
    setBusy(true);
    setError(undefined);
    const { error } = await signInWithEmail(email.trim());
    setBusy(false);
    if (error) setError(error);
    else {
      setSent(true);
      setCooldown(RESEND_COOLDOWN);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || verifying) return;
    setVerifying(true);
    setError(undefined);
    const { error } = await verifyEmailOtp(email.trim(), code);
    setVerifying(false);
    // On success the auth state changes and this screen unmounts; on failure we
    // surface the message so the user can retry without a fresh email.
    if (error) setError(error);
  }

  return (
    <div className="app">
      <header className="appbar">
        <h1 className="appbar__title">🚗 MyVW Maintenance</h1>
      </header>
      <main className="app__main">
        <div className="card" style={{ marginTop: 24 }}>
          {sent ? (
            <form onSubmit={verify} className="stack">
              <h2 style={{ margin: 0 }}>Check your email 📩</h2>
              <p className="small">
                We sent a sign-in email to <strong>{email}</strong>. Enter the
                6-digit code below — or tap the link in the email if you opened
                it on this device.
              </p>
              <div className="field">
                <label>6-digit code</label>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                />
              </div>
              {error && (
                <div className="small" style={{ color: "var(--overdue)" }}>
                  {error}
                </div>
              )}
              <button
                className="btn btn--primary btn--block"
                disabled={verifying || code.length < 6}
                type="submit"
              >
                {verifying ? "Verifying…" : "Verify & sign in"}
              </button>
              <button
                type="button"
                className="btn btn--block"
                disabled={busy || cooldown > 0}
                onClick={() => send()}
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend email"}
              </button>
              <button
                type="button"
                className="btn btn--block"
                onClick={() => {
                  setSent(false);
                  setCode("");
                  setError(undefined);
                }}
              >
                Use a different email
              </button>
            </form>
          ) : (
            <form onSubmit={send} className="stack">
              <h2 style={{ margin: 0 }}>Sign in to sync</h2>
              <p className="small muted">
                Signing in saves your cars and records to the cloud so they're
                backed up and available on all your devices. No password — we email
                you a one-tap link and a 6-digit code.
              </p>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error && <div className="small" style={{ color: "var(--overdue)" }}>{error}</div>}
              <button className="btn btn--primary btn--block" disabled={busy} type="submit">
                {busy ? "Sending…" : "Email me a sign-in code"}
              </button>
            </form>
          )}
        </div>
        <p className="small muted" style={{ textAlign: "center", marginTop: 16 }}>
          Your data is private to your account.
        </p>
      </main>
    </div>
  );
}
