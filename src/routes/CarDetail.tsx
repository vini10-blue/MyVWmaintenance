import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { DueBadge } from "../components/DueBadge";
import { repo } from "../lib/db/repo";
import { CAR_MODEL_LABELS } from "../lib/types";
import { formatDistance, formatMoney } from "../lib/format";
import { resolveServicesForCar } from "../lib/schedule/applicability";
import { computeAllDue } from "../lib/schedule/due";

export function CarDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const car = useLiveQuery(() => repo.cars.get(id), [id]);
  const data = useLiveQuery(async () => {
    const c = await repo.cars.get(id);
    if (!c) return undefined;
    const records = await repo.records.listByCar(id);
    const services = resolveServicesForCar(c);
    const due = computeAllDue(c, services, records);
    const totalCost = records.reduce((s, r) => s + (r.cost ?? 0), 0);
    return {
      due: due.filter((d) => d.level === "overdue" || d.level === "due_soon"),
      recordCount: records.length,
      totalCost,
      currency: records[0]?.currency ?? "USD",
    };
  }, [id, car?.odometer, car?.updatedAt]);

  if (car === undefined) return <Layout title="Car" back><p className="muted">Loading…</p></Layout>;
  if (car === null) return <Layout title="Car" back><p className="muted">Car not found.</p></Layout>;

  return (
    <Layout
      title={car.nickname}
      back
      action={
        <button className="btn btn--sm" onClick={() => navigate(`/car/${id}/edit`)}>
          Edit
        </button>
      }
    >
      <div className="card">
        <div className="row row--between">
          <div>
            <div className="list-item__title">
              {car.year} {CAR_MODEL_LABELS[car.model]}
            </div>
            <div className="small muted">
              {car.variant ? car.variant + " · " : ""}
              {car.electrics} · {car.fuelSystem === "carb" ? "Carburettor" : "Fuel injection"}
              {car.engine ? " · " + car.engine : ""}
            </div>
          </div>
        </div>
        <div className="row" style={{ marginTop: 10, gap: 18 }}>
          <div>
            <div className="small muted">Odometer</div>
            <strong>{formatDistance(car.odometer, car.distanceUnit)}</strong>
          </div>
          <div>
            <div className="small muted">Records</div>
            <strong>{data?.recordCount ?? 0}</strong>
          </div>
          <div>
            <div className="small muted">Total spent</div>
            <strong>{formatMoney(data?.totalCost ?? 0, data?.currency)}</strong>
          </div>
        </div>
      </div>

      <div className="grid2" style={{ marginTop: 12 }}>
        <button className="btn btn--primary" onClick={() => navigate(`/car/${id}/record/new`)}>
          + Log service
        </button>
        <button className="btn btn--accent" onClick={() => navigate(`/car/${id}/suggestions`)}>
          🔧 Suggestions
        </button>
        <button className="btn" onClick={() => navigate(`/car/${id}/history`)}>
          📜 History
        </button>
        <button className="btn" onClick={() => navigate(`/car/${id}/fuel`)}>
          ⛽ Fuel log
        </button>
      </div>

      <div className="section-title">Needs attention</div>
      {data && data.due.length === 0 ? (
        <div className="card small muted">Nothing overdue or due soon. 🎉</div>
      ) : (
        <div className="card">
          {data?.due.map((d) => (
            <div
              key={d.service.key}
              className="list-item"
              style={{ cursor: "pointer" }}
              onClick={() =>
                navigate(`/car/${id}/record/new?service=${encodeURIComponent(d.service.key)}`)
              }
            >
              <div className="list-item__main">
                <div className="list-item__title">{d.service.name}</div>
                <div className="small muted">{d.summary}</div>
              </div>
              <DueBadge level={d.level} />
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
