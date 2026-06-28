import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";

/** Shown after the user follows a password-reset link from their email. */
export function UpdatePassword() {
  const { updatePassword, signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    setError(undefined);
    const { error } = await updatePassword(password);
    setBusy(false);
    // On success `recovering` clears and the app shows the garage.
    if (error) setError(error);
  }

  return (
    <div className="app">
      <header className="appbar">
        <h1 className="appbar__title">🚗 MyVW Maintenance</h1>
      </header>
      <main className="app__main">
        <div className="card" style={{ marginTop: 24 }}>
          <form onSubmit={submit} className="stack">
            <h2 style={{ margin: 0 }}>Set a new password</h2>
            <div className="field">
              <label>New password</label>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Confirm password</label>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {error && (
              <div className="small" style={{ color: "var(--overdue)" }}>
                {error}
              </div>
            )}
            <button className="btn btn--primary btn--block" disabled={busy} type="submit">
              {busy ? "Saving…" : "Save password"}
            </button>
            <button type="button" className="btn btn--block" onClick={() => signOut()}>
              Cancel
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
