import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { EmptyState } from "../components/EmptyState";
import { AttachmentThumbs } from "../components/Attachments";
import { repo } from "../lib/db/repo";
import { SERVICE_CATEGORY_LABELS, type ServiceCategory } from "../lib/types";
import { formatDate, formatMoney } from "../lib/format";

export function History() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<ServiceCategory | "all">("all");

  const records = useLiveQuery(() => repo.records.listByCar(id), [id]);
  const filtered = records?.filter((r) => filter === "all" || r.category === filter);

  return (
    <Layout
      title="Service history"
      back
      action={
        <button className="btn btn--accent btn--sm" onClick={() => navigate(`/car/${id}/record/new`)}>
          + Log
        </button>
      }
    >
      <div className="field">
        <select value={filter} onChange={(e) => setFilter(e.target.value as ServiceCategory | "all")}>
          <option value="all">All categories</option>
          {Object.entries(SERVICE_CATEGORY_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {filtered && filtered.length === 0 && (
        <EmptyState emoji="🧰" title="No records yet">
          Log your first maintenance event for this car.
        </EmptyState>
      )}

      <div className="stack">
        {filtered?.map((r) => (
          <div
            key={r.id}
            className="card"
            style={{ cursor: "pointer" }}
            onClick={() => navigate(`/car/${id}/record/${r.id}`)}
          >
            <div className="row row--between">
              <div className="list-item__main">
                <div className="list-item__title">{r.title}</div>
                <div className="small muted">
                  {formatDate(r.date)}
                  {r.odometer != null ? ` · ${r.odometer.toLocaleString()}` : ""}
                  {r.performedBy ? ` · ${r.performedBy}` : ""}
                </div>
              </div>
              <strong>{formatMoney(r.cost, r.currency)}</strong>
            </div>
            {r.parts.length > 0 && (
              <div className="chips" style={{ marginTop: 8 }}>
                {r.parts.map((p, i) => (
                  <span className="chip" key={i}>
                    {p.name}
                    {p.partNumber ? ` (${p.partNumber})` : ""}
                  </span>
                ))}
              </div>
            )}
            {r.notes && <p className="small muted" style={{ marginTop: 8 }}>{r.notes}</p>}
            {r.attachmentIds.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <AttachmentThumbs ids={r.attachmentIds} />
              </div>
            )}
          </div>
        ))}
      </div>
    </Layout>
  );
}
