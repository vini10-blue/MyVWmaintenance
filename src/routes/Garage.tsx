import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { EmptyState } from "../components/EmptyState";
import { repo } from "../lib/db/repo";
import { db } from "../lib/db/schema";
import { CAR_MODEL_LABELS, type Car } from "../lib/types";
import { formatDistance } from "../lib/format";
import { resolveServicesForCar } from "../lib/schedule/applicability";
import { computeAllDue } from "../lib/schedule/due";
import { useEffect, useState } from "react";

function CarPhoto({ photoId }: { photoId?: string }) {
  const att = useLiveQuery(
    () => (photoId ? repo.attachments.get(photoId) : undefined),
    [photoId],
  );
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!att?.blob) return;
    const u = URL.createObjectURL(att.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [att?.blob]);
  if (!url) return null;
  return <img className="car-photo" src={url} alt="" style={{ marginBottom: 10 }} />;
}

function CarCard({ car }: { car: Car }) {
  const navigate = useNavigate();
  const dueCounts = useLiveQuery(async () => {
    const records = await repo.records.listByCar(car.id);
    const services = resolveServicesForCar(car);
    const all = computeAllDue(car, services, records);
    return {
      overdue: all.filter((d) => d.level === "overdue").length,
      soon: all.filter((d) => d.level === "due_soon").length,
    };
  }, [car.id, car.odometer, car.updatedAt]);

  return (
    <div className="card" onClick={() => navigate(`/car/${car.id}`)} style={{ cursor: "pointer" }}>
      <CarPhoto photoId={car.photoId} />
      <div className="row row--between">
        <div>
          <div className="list-item__title">{car.nickname}</div>
          <div className="small muted">
            {car.year} · {CAR_MODEL_LABELS[car.model]}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="small muted">
            {formatDistance(car.odometer, car.distanceUnit)}
          </div>
        </div>
      </div>
      {dueCounts && (dueCounts.overdue > 0 || dueCounts.soon > 0) && (
        <div className="row" style={{ marginTop: 10 }}>
          {dueCounts.overdue > 0 && (
            <span className="badge badge--overdue">{dueCounts.overdue} overdue</span>
          )}
          {dueCounts.soon > 0 && (
            <span className="badge badge--due_soon">{dueCounts.soon} due soon</span>
          )}
        </div>
      )}
    </div>
  );
}

export function Garage() {
  const navigate = useNavigate();
  const cars = useLiveQuery(() => db.cars.orderBy("createdAt").toArray(), []);

  return (
    <Layout
      title="My Garage"
      action={
        <div className="row" style={{ gap: 8 }}>
          <button
            className="btn btn--sm"
            aria-label="Account and sync"
            onClick={() => navigate("/account")}
          >
            👤
          </button>
          <button className="btn btn--accent btn--sm" onClick={() => navigate("/car/new")}>
            + Car
          </button>
        </div>
      }
    >
      {cars && cars.length === 0 && (
        <EmptyState emoji="🚙" title="No cars yet">
          Add your first classic VW to start tracking maintenance, costs and fuel.
          <div style={{ marginTop: 16 }}>
            <button className="btn btn--primary" onClick={() => navigate("/car/new")}>
              Add a car
            </button>
          </div>
        </EmptyState>
      )}
      <div className="stack">
        {cars?.map((car) => (
          <CarCard key={car.id} car={car} />
        ))}
      </div>
    </Layout>
  );
}
