import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Layout } from "../components/Layout";
import { EmptyState } from "../components/EmptyState";
import { repo } from "../lib/db/repo";
import { SERVICE_CATEGORY_LABELS, type ServiceCategory } from "../lib/types";
import { formatMoney } from "../lib/format";

const COLORS = ["#0b3d2e", "#c8553d", "#2f8f5b", "#c98a16", "#3a6ea5", "#7d5ba6", "#995d81"];

export function Reports() {
  const cars = useLiveQuery(() => repo.cars.list(), []);
  const [carId, setCarId] = useState<string>("all");

  const report = useLiveQuery(async () => {
    const all = await repo.cars.list();
    const ids = carId === "all" ? all.map((c) => c.id) : [carId];
    let total = 0;
    let currency = "USD";
    const byMonth = new Map<string, number>();
    const byCategory = new Map<ServiceCategory, number>();

    for (const id of ids) {
      const records = await repo.records.listByCar(id);
      for (const r of records) {
        if (r.currency) currency = r.currency;
        const c = r.cost ?? 0;
        total += c;
        const month = r.date.slice(0, 7);
        byMonth.set(month, (byMonth.get(month) ?? 0) + c);
        byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + c);
      }
    }

    const monthData = [...byMonth.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, value]) => ({ month, value: Math.round(value) }));
    const categoryData = [...byCategory.entries()]
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, value]) => ({
        name: SERVICE_CATEGORY_LABELS[cat],
        value: Math.round(value),
      }));

    return { total, currency, monthData, categoryData };
  }, [carId]);

  const hasData = report && (report.monthData.length > 0 || report.categoryData.length > 0);

  return (
    <Layout title="Reports">
      <div className="field">
        <select value={carId} onChange={(e) => setCarId(e.target.value)}>
          <option value="all">All cars</option>
          {cars?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nickname}
            </option>
          ))}
        </select>
      </div>

      {!hasData && (
        <EmptyState emoji="📊" title="No spending yet">
          Log maintenance with costs to see totals and charts here.
        </EmptyState>
      )}

      {hasData && report && (
        <>
          <div className="card">
            <div className="small muted">Total spent</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>
              {formatMoney(report.total, report.currency)}
            </div>
          </div>

          {report.monthData.length > 0 && (
            <>
              <div className="section-title">Spending by month</div>
              <div className="card" style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.monthData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis fontSize={11} width={40} />
                    <Tooltip formatter={(v: number) => formatMoney(v, report.currency)} />
                    <Bar dataKey="value" fill="#0b3d2e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {report.categoryData.length > 0 && (
            <>
              <div className="section-title">Spending by category</div>
              <div className="card" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={report.categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={(e) => e.name}
                    >
                      {report.categoryData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatMoney(v, report.currency)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </>
      )}
    </Layout>
  );
}
