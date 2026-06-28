import { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { useAuth } from "../auth/AuthProvider";
import { fullSync, getSyncStatus, onSyncStatus, type SyncStatus } from "../lib/sync";
import { formatDate } from "../lib/format";

const STATUS_LABEL: Record<SyncStatus, string> = {
  idle: "All changes synced",
  syncing: "Syncing…",
  error: "Sync error — will retry",
  offline: "Offline — will sync when back online",
};

export function Account() {
  const { user, signOut, updatePassword } = useAuth();
  const [{ status, lastSyncAt }, setState] = useState(getSyncStatus());

  const [showPw, setShowPw] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string }>();

  useEffect(() => onSyncStatus((status, lastSyncAt) => setState({ status, lastSyncAt })), []);

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 6) {
      setPwMsg({ ok: false, text: "Password must be at least 6 characters." });
      return;
    }
    setPwBusy(true);
    setPwMsg(undefined);
    const { error } = await updatePassword(newPw);
    setPwBusy(false);
    if (error) setPwMsg({ ok: false, text: error });
    else {
      setNewPw("");
      setShowPw(false);
      setPwMsg({ ok: true, text: "Password updated." });
    }
  }

  return (
    <Layout title="Account" back>
      <div className="card stack">
        <div>
          <div className="small muted">Signed in as</div>
          <strong>{user?.email ?? "—"}</strong>
        </div>
        <div>
          <div className="small muted">Cloud backup</div>
          <div>{STATUS_LABEL[status]}</div>
          {lastSyncAt && (
            <div className="small muted">Last synced {formatDate(lastSyncAt)}</div>
          )}
        </div>
        <button className="btn" onClick={() => fullSync()} disabled={status === "syncing"}>
          🔄 Sync now
        </button>
      </div>

      <div className="card stack" style={{ marginTop: 12 }}>
        <div className="row row--between">
          <strong>Password</strong>
          {!showPw && (
            <button
              className="btn btn--sm"
              onClick={() => {
                setShowPw(true);
                setPwMsg(undefined);
              }}
            >
              Change
            </button>
          )}
        </div>
        {showPw && (
          <form onSubmit={savePassword} className="stack">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>New password</label>
              <input
                type="password"
                autoComplete="new-password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
              />
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn--primary" style={{ flex: 1 }} disabled={pwBusy} type="submit">
                {pwBusy ? "Saving…" : "Save password"}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setShowPw(false);
                  setNewPw("");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        {pwMsg && (
          <div className="small" style={{ color: pwMsg.ok ? "var(--ok)" : "var(--overdue)" }}>
            {pwMsg.text}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <p className="small muted">
          Your data is stored on this device and mirrored to your private cloud
          account, so it survives clearing your browser and syncs across devices.
        </p>
        <button className="btn btn--danger btn--block" onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    </Layout>
  );
}
