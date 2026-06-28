import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";

// Supabase rate-limits sign-in emails (roughly one per minute per address), so
// we disable "resend" for a cooldown to stop users hammering the limit.
const RESEND_COOLDOWN = 60;

type Method = "password" | "code";

export function SignIn() {
  const {
    signInWithEmail,
    verifyEmailOtp,
    signInWithPassword,
    signUpWithPassword,
    sendPasswordReset,
  } = useAuth();

  const [method, setMethod] = useState<Method>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const [error, setError] = useState<string>();
  const [info, setInfo] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Tick the resend cooldown down to zero.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function reset(next: Partial<{ error?: string; info?: string }> = {}) {
    setError(next.error);
    setInfo(next.info);
  }

  // ---- Password ----
  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password || busy) return;
    setBusy(true);
    reset();
    if (isSignUp) {
      const { error, needsConfirmation } = await signUpWithPassword(
        email.trim(),
        password,
      );
      setBusy(false);
      if (error) setError(error);
      else if (needsConfirmation)
        reset({ info: "Account created — check your email to confirm, then sign in." });
      // Otherwise a session is created and this screen unmounts.
    } else {
      const { error } = await signInWithPassword(email.trim(), password);
      setBusy(false);
      if (error) setError(error);
    }
  }

  async function forgotPassword() {
    if (!email.trim()) {
      setError("Enter your email first, then tap “Forgot password”.");
      return;
    }
    setBusy(true);
    reset();
    const { error } = await sendPasswordReset(email.trim());
    setBusy(false);
    if (error) setError(error);
    else reset({ info: `Password-reset link sent to ${email}.` });
  }

  // ---- Email code ----
  async function sendCode() {
    if (!email.trim() || busy || cooldown > 0) return;
    setBusy(true);
    reset();
    const { error } = await signInWithEmail(email.trim());
    setBusy(false);
    if (error) setError(error);
    else {
      setSent(true);
      setCooldown(RESEND_COOLDOWN);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!sent) {
      void sendCode();
      return;
    }
    if (code.length < 6 || verifying) return;
    setVerifying(true);
    reset();
    const { error } = await verifyEmailOtp(email.trim(), code);
    setVerifying(false);
    if (error) setError(error);
  }

  function switchMethod(next: Method) {
    setMethod(next);
    setSent(false);
    setCode("");
    reset();
  }

  return (
    <div className="app">
      <header className="appbar">
        <h1 className="appbar__title">🚗 MyVW Maintenance</h1>
      </header>
      <main className="app__main">
        <div className="card" style={{ marginTop: 24 }}>
          <h2 style={{ marginTop: 0, marginBottom: 4 }}>Sign in to sync</h2>
          <p className="small muted" style={{ marginTop: 0 }}>
            Signing in saves your cars and records to the cloud so they're backed
            up and available on all your devices.
          </p>

          {/* Method switch */}
          <div className="row" style={{ gap: 8, marginBottom: 14 }}>
            <button
              type="button"
              className={`btn btn--sm${method === "password" ? " btn--primary" : ""}`}
              style={{ flex: 1 }}
              onClick={() => switchMethod("password")}
            >
              Password
            </button>
            <button
              type="button"
              className={`btn btn--sm${method === "code" ? " btn--primary" : ""}`}
              style={{ flex: 1 }}
              onClick={() => switchMethod("code")}
            >
              Email code
            </button>
          </div>

          {method === "password" ? (
            <form onSubmit={submitPassword} className="stack">
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
              <div className="field">
                <label>Password</label>
                <input
                  type="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  placeholder={isSignUp ? "At least 6 characters" : "Your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <div className="small" style={{ color: "var(--overdue)" }}>{error}</div>}
              {info && <div className="small" style={{ color: "var(--ok)" }}>{info}</div>}
              <button className="btn btn--primary btn--block" disabled={busy} type="submit">
                {busy ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
              </button>
              <div className="row row--between">
                <button
                  type="button"
                  className="btn btn--sm"
                  style={{ border: "none", background: "none", padding: 0, color: "var(--brand)" }}
                  onClick={() => {
                    setIsSignUp((v) => !v);
                    reset();
                  }}
                >
                  {isSignUp ? "Have an account? Sign in" : "New here? Create account"}
                </button>
                {!isSignUp && (
                  <button
                    type="button"
                    className="btn btn--sm"
                    style={{ border: "none", background: "none", padding: 0, color: "var(--muted)" }}
                    onClick={forgotPassword}
                    disabled={busy}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="stack">
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={sent}
                />
              </div>
              {sent && (
                <>
                  <p className="small muted" style={{ margin: 0 }}>
                    We emailed a 6-digit code to <strong>{email}</strong> (you can
                    also tap the link in the email on this device).
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
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    />
                  </div>
                </>
              )}
              {error && <div className="small" style={{ color: "var(--overdue)" }}>{error}</div>}
              {!sent ? (
                <button className="btn btn--primary btn--block" disabled={busy} type="submit">
                  {busy ? "Sending…" : "Email me a sign-in code"}
                </button>
              ) : (
                <>
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
                    onClick={sendCode}
                  >
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend email"}
                  </button>
                </>
              )}
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
