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
  const { user, signOut } = useAuth();
  const [{ status, lastSyncAt }, setState] = useState(getSyncStatus());

  useEffect(() => onSyncStatus((status, lastSyncAt) => setState({ status, lastSyncAt })), []);

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
