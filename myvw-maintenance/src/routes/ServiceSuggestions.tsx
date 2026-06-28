import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { DueBadge } from "../components/DueBadge";
import { repo } from "../lib/db/repo";
import { resolveServicesForCar } from "../lib/schedule/applicability";
import { computeAllDue, type DueStatus } from "../lib/schedule/due";
import { formatDate, milesToUnit } from "../lib/format";

function ServiceRow({
  status,
  carId,
  unit,
}: {
  status: DueStatus;
  carId: string;
  unit: "mi" | "km";
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const s = status.service;
  const intervalText = [
    s.intervalMiles != null
      ? `${Math.round(milesToUnit(s.intervalMiles, unit)).toLocaleString()} ${unit}`
      : null,
    s.intervalMonths != null ? `${s.intervalMonths} mo` : null,
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <div className="card">
      <div className="row row--between" onClick={() => setOpen((o) => !o)} style={{ cursor: "pointer" }}>
        <div className="list-item__main">
          <div className="list-item__title">{s.name}</div>
          <div className="small muted">
            {status.summary}
            {intervalText ? ` · every ${intervalText}` : ""}
          </div>
        </div>
        <DueBadge level={status.level} />
      </div>

      {open && (
        <div style={{ marginTop: 10 }}>
          {s.description && <p className="small">{s.description}</p>}
          {s.checklist.length > 0 && (
            <ul className="small" style={{ marginTop: 4 }}>
              {s.checklist.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ul>
          )}
          {status.last && (
            <div className="small muted">
              Last done {formatDate(status.last.date)}
              {status.last.odometer != null
                ? ` at ${status.last.odometer.toLocaleString()} ${unit}`
                : ""}
            </div>
          )}
          {s.sourceNote && (
            <div className="small muted" style={{ marginTop: 6, fontStyle: "italic" }}>
              {s.sourceNote}
            </div>
          )}
          <div style={{ marginTop: 10 }}>
            <button
              className="btn btn--accent btn--sm"
              onClick={() =>
                navigate(`/car/${carId}/record/new?service=${encodeURIComponent(s.key)}`)
              }
            >
              Log this service
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ServiceSuggestions() {
  const { id = "" } = useParams();
  const data = useLiveQuery(async () => {
    const car = await repo.cars.get(id);
    if (!car) return undefined;
    const records = await repo.records.listByCar(id);
    const services = resolveServicesForCar(car);
    const due = computeAllDue(car, services, records);
    return { car, due };
  }, [id]);

  if (!data) return <Layout title="Suggestions" back><p className="muted">Loading…</p></Layout>;

  return (
    <Layout title="Suggested services" back>
      <div className="disclaimer">
        ⚠️ These are general air-cooled VW guidance intervals, not a substitute for
        the official workshop manual (e.g. Bentley) for your exact car. Adjust any
        interval per car from the car's Edit screen.
      </div>
      <div className="fab-spacer" />
      <div className="stack">
        {data.due.map((status) => (
          <ServiceRow
            key={status.service.key}
            status={status}
            carId={id}
            unit={data.car.distanceUnit}
          />
        ))}
      </div>
    </Layout>
  );
}
