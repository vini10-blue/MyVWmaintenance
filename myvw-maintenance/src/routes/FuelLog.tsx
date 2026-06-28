import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { EmptyState } from "../components/EmptyState";
import { repo } from "../lib/db/repo";
import { CURRENCIES, fuelEconomy, formatDate, formatMoney, todayIso } from "../lib/format";
import type { FuelLog, VolumeUnit } from "../lib/types";

interface FuelRowView {
  log: FuelLog;
  economy: string;
}

export function FuelLogPage() {
  const { id = "" } = useParams();
  const car = useLiveQuery(() => repo.cars.get(id), [id]);
  const logs = useLiveQuery(() => repo.fuelLogs.listByCar(id), [id]);

  const [date, setDate] = useState(todayIso());
  const [odometer, setOdometer] = useState("");
  const [volume, setVolume] = useState("");
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>("L");
  const [cost, setCost] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [fullTank, setFullTank] = useState(true);
  const [open, setOpen] = useState(false);

  // Compute economy between consecutive full-tank fills (oldest→newest).
  const rows: FuelRowView[] = [];
  if (logs && car) {
    const asc = [...logs].sort((a, b) => a.odometer - b.odometer);
    for (let i = 0; i < asc.length; i++) {
      const log = asc[i];
      const prev = asc[i - 1];
      let economy = "—";
      if (prev && log.fullTank) {
        economy = fuelEconomy(
          log.odometer - prev.odometer,
          car.distanceUnit,
          log.volume,
          log.volumeUnit,
        );
      }
      rows.push({ log, economy });
    }
    rows.reverse(); // newest first
  }

  async function add() {
    if (!odometer || !volume) {
      alert("Enter at least the odometer and volume.");
      return;
    }
    await repo.fuelLogs.add({
      carId: id,
      date,
      odometer: Number(odometer),
      volume: Number(volume),
      volumeUnit,
      cost: cost === "" ? undefined : Number(cost),
      currency,
      fullTank,
    });
    setOdometer("");
    setVolume("");
    setCost("");
    setOpen(false);
  }

  return (
    <Layout
      title="Fuel log"
      back
      action={
        <button className="btn btn--accent btn--sm" onClick={() => setOpen((o) => !o)}>
          {open ? "Close" : "+ Fill-up"}
        </button>
      }
    >
      {open && (
        <div className="card">
          <div className="grid2">
            <div className="field">
              <label>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="field">
              <label>Odometer ({car?.distanceUnit ?? "mi"})</label>
              <input type="number" value={odometer} onChange={(e) => setOdometer(e.target.value)} />
            </div>
          </div>
          <div className="grid2">
            <div className="field">
              <label>Volume</label>
              <input type="number" step="0.01" value={volume} onChange={(e) => setVolume(e.target.value)} />
            </div>
            <div className="field">
              <label>Unit</label>
              <select value={volumeUnit} onChange={(e) => setVolumeUnit(e.target.value as VolumeUnit)}>
                <option value="L">litres</option>
                <option value="gal">gallons (US)</option>
              </select>
            </div>
          </div>
          <div className="grid2">
            <div className="field">
              <label>Cost</label>
              <input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
            <div className="field">
              <label>Currency</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <label className="row" style={{ padding: "6px 0", cursor: "pointer" }}>
            <input type="checkbox" checked={fullTank} onChange={(e) => setFullTank(e.target.checked)} />
            <span className="small">Filled the tank completely (needed for economy)</span>
          </label>
          <button className="btn btn--primary btn--block" onClick={add}>
            Save fill-up
          </button>
        </div>
      )}

      {rows.length === 0 && !open && (
        <EmptyState emoji="⛽" title="No fill-ups yet">
          Log fuel to track economy and keep the odometer up to date.
        </EmptyState>
      )}

      <div className="stack" style={{ marginTop: open ? 12 : 0 }}>
        {rows.map(({ log, economy }) => (
          <div key={log.id} className="card">
            <div className="row row--between">
              <div className="list-item__main">
                <div className="list-item__title">
                  {log.volume} {log.volumeUnit}
                  {!log.fullTank ? " (partial)" : ""}
                </div>
                <div className="small muted">
                  {formatDate(log.date)} · {log.odometer.toLocaleString()} {car?.distanceUnit}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <strong>{economy}</strong>
                <div className="small muted">{formatMoney(log.cost, log.currency)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
