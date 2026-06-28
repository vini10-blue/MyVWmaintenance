import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { EmptyState } from "../components/EmptyState";
import { DueBadge } from "../components/DueBadge";
import { repo } from "../lib/db/repo";
import { resolveServicesForCar } from "../lib/schedule/applicability";
import { computeAllDue, type DueStatus } from "../lib/schedule/due";
import type { Car } from "../lib/types";

interface DueForCar {
  car: Car;
  items: DueStatus[];
}

export function Reminders() {
  const navigate = useNavigate();

  const data = useLiveQuery(async () => {
    const cars = await repo.cars.list();
    const out: DueForCar[] = [];
    for (const car of cars) {
      const records = await repo.records.listByCar(car.id);
      const services = resolveServicesForCar(car);
      const due = computeAllDue(car, services, records).filter(
        (d) => d.level === "overdue" || d.level === "due_soon",
      );
      if (due.length) out.push({ car, items: due });
    }
    return out;
  }, []);

  const total = data?.reduce((s, d) => s + d.items.length, 0) ?? 0;

  return (
    <Layout title="Due & overdue">
      {data && total === 0 && (
        <EmptyState emoji="✅" title="All caught up">
          Nothing is overdue or due soon across your garage.
        </EmptyState>
      )}
      {data?.map(({ car, items }) => (
        <div key={car.id}>
          <div className="section-title">{car.nickname}</div>
          <div className="card">
            {items.map((d) => (
              <div
                key={d.service.key}
                className="list-item"
                style={{ cursor: "pointer" }}
                onClick={() =>
                  navigate(`/car/${car.id}/record/new?service=${encodeURIComponent(d.service.key)}`)
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
        </div>
      ))}
    </Layout>
  );
}
