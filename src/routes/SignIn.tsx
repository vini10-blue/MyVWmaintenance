import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";

export function SignIn() {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError(undefined);
    const { error } = await signInWithEmail(email.trim());
    setBusy(false);
    if (error) setError(error);
    else setSent(true);
  }

  return (
    <div className="app">
      <header className="appbar">
        <h1 className="appbar__title">🚗 MyVW Maintenance</h1>
      </header>
      <main className="app__main">
        <div className="card" style={{ marginTop: 24 }}>
          {sent ? (
            <div className="stack">
              <h2 style={{ margin: 0 }}>Check your email 📩</h2>
              <p className="small">
                We sent a sign-in link to <strong>{email}</strong>. Open it on this
                device to finish signing in. You can close this tab.
              </p>
              <button className="btn" onClick={() => setSent(false)}>
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="stack">
              <h2 style={{ margin: 0 }}>Sign in to sync</h2>
              <p className="small muted">
                Signing in saves your cars and records to the cloud so they're
                backed up and available on all your devices. No password — we email
                you a one-tap link.
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
                {busy ? "Sending…" : "Email me a sign-in link"}
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
