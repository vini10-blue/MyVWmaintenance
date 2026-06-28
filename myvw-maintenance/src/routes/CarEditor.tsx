import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { repo, type NewCar } from "../lib/db/repo";
import {
  CAR_MODEL_LABELS,
  type Car,
  type CarMods,
  type CarModel,
  type DistanceUnit,
  type Electrics,
  type FuelSystem,
} from "../lib/types";

interface FormValues {
  nickname: string;
  model: CarModel;
  variant: string;
  year: number;
  engine: string;
  electrics: Electrics;
  fuelSystem: FuelSystem;
  vin: string;
  plate: string;
  odometer: number;
  distanceUnit: DistanceUnit;
  purchaseDate: string;
  notes: string;
}

const MOD_OPTIONS: { key: keyof CarMods; label: string; hint: string }[] = [
  { key: "electronicIgnition", label: "Electronic ignition", hint: "Removes points & condenser service" },
  { key: "converted12V", label: "12V conversion", hint: "Converted from original 6V" },
  { key: "discBrakeConversion", label: "Front disc brakes", hint: "Disc conversion instead of drums" },
  { key: "fullFlowOilFilter", label: "Full-flow oil filter", hint: "Relaxes the oil-change interval" },
  { key: "engineSwap", label: "Engine swap / non-stock", hint: "Type 4, dual carbs, etc." },
  { key: "efiConversion", label: "EFI conversion", hint: "Aftermarket fuel injection" },
];

export function CarEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [mods, setMods] = useState<CarMods>({});
  const [existing, setExisting] = useState<Car | undefined>();
  const [photoFile, setPhotoFile] = useState<File | undefined>();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      model: "type1_beetle",
      year: 1967,
      electrics: "12V",
      fuelSystem: "carb",
      distanceUnit: "mi",
      odometer: 0,
    },
  });

  useEffect(() => {
    if (!id) return;
    repo.cars.get(id).then((car) => {
      if (!car) return;
      setExisting(car);
      setMods(car.mods ?? {});
      reset({
        nickname: car.nickname,
        model: car.model,
        variant: car.variant ?? "",
        year: car.year,
        engine: car.engine ?? "",
        electrics: car.electrics,
        fuelSystem: car.fuelSystem,
        vin: car.vin ?? "",
        plate: car.plate ?? "",
        odometer: car.odometer,
        distanceUnit: car.distanceUnit,
        purchaseDate: car.purchaseDate ?? "",
        notes: car.notes ?? "",
      });
    });
  }, [id, reset]);

  async function onSubmit(v: FormValues) {
    const base: NewCar = {
      nickname: v.nickname.trim() || "My VW",
      model: v.model,
      variant: v.variant.trim() || undefined,
      year: Number(v.year),
      engine: v.engine.trim() || undefined,
      electrics: v.electrics,
      fuelSystem: v.fuelSystem,
      vin: v.vin.trim() || undefined,
      plate: v.plate.trim() || undefined,
      odometer: Number(v.odometer) || 0,
      distanceUnit: v.distanceUnit,
      purchaseDate: v.purchaseDate || undefined,
      notes: v.notes.trim() || undefined,
      mods,
      intervalOverrides: existing?.intervalOverrides ?? {},
      customServiceItems: existing?.customServiceItems ?? [],
    };

    let carId = id;
    if (isEdit && id) {
      await repo.cars.update(id, base);
    } else {
      const created = await repo.cars.add(base);
      carId = created.id;
    }

    if (photoFile && carId) {
      const att = await repo.attachments.add({
        carId,
        blob: photoFile,
        filename: photoFile.name,
        mimeType: photoFile.type || "image/jpeg",
        kind: "photo",
      });
      await repo.cars.update(carId, { photoId: att.id });
    }

    navigate(`/car/${carId}`, { replace: true });
  }

  async function onDelete() {
    if (id && confirm("Delete this car and all its records?")) {
      await repo.cars.remove(id);
      navigate("/", { replace: true });
    }
  }

  return (
    <Layout title={isEdit ? "Edit car" : "Add a car"} back>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="card">
          <div className="field">
            <label>Nickname</label>
            <input
              placeholder="e.g. Herbie"
              {...register("nickname", { required: "Required" })}
            />
            {errors.nickname && <span className="err">{errors.nickname.message}</span>}
          </div>

          <div className="field">
            <label>Model</label>
            <select {...register("model")}>
              {Object.entries(CAR_MODEL_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid2">
            <div className="field">
              <label>Year</label>
              <input
                type="number"
                {...register("year", { required: true, valueAsNumber: true, min: 1938, max: 2003 })}
              />
            </div>
            <div className="field">
              <label>Variant (optional)</label>
              <input placeholder="Bay window, 1303S…" {...register("variant")} />
            </div>
          </div>

          <div className="field">
            <label>Engine (optional)</label>
            <input placeholder="1600 dual-port" {...register("engine")} />
          </div>

          <div className="grid2">
            <div className="field">
              <label>Electrics</label>
              <select {...register("electrics")}>
                <option value="6V">6 Volt</option>
                <option value="12V">12 Volt</option>
              </select>
            </div>
            <div className="field">
              <label>Fuel system</label>
              <select {...register("fuelSystem")}>
                <option value="carb">Carburettor</option>
                <option value="fuel_injection">Fuel injection</option>
              </select>
            </div>
          </div>

          <div className="grid2">
            <div className="field">
              <label>Odometer</label>
              <input type="number" {...register("odometer", { valueAsNumber: true })} />
            </div>
            <div className="field">
              <label>Units</label>
              <select {...register("distanceUnit")}>
                <option value="mi">miles</option>
                <option value="km">km</option>
              </select>
            </div>
          </div>

          <div className="grid2">
            <div className="field">
              <label>Plate (optional)</label>
              <input {...register("plate")} />
            </div>
            <div className="field">
              <label>Purchased (optional)</label>
              <input type="date" {...register("purchaseDate")} />
            </div>
          </div>

          <div className="field">
            <label>VIN / chassis (optional)</label>
            <input {...register("vin")} />
          </div>

          <div className="field">
            <label>Photo (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0])}
            />
          </div>

          <div className="field">
            <label>Notes (optional)</label>
            <textarea {...register("notes")} />
          </div>
        </div>

        <div className="section-title">Modifications</div>
        <div className="card">
          <div className="small muted" style={{ marginBottom: 8 }}>
            These tailor the suggested service list for your car.
          </div>
          {MOD_OPTIONS.map((opt) => (
            <label
              key={opt.key}
              className="row"
              style={{ padding: "8px 0", cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={!!mods[opt.key]}
                onChange={(e) => setMods((m) => ({ ...m, [opt.key]: e.target.checked }))}
              />
              <span className="list-item__main">
                <div className="list-item__title">{opt.label}</div>
                <div className="small muted">{opt.hint}</div>
              </span>
            </label>
          ))}
        </div>

        <div className="fab-spacer" />
        <button className="btn btn--primary btn--block" disabled={isSubmitting} type="submit">
          {isEdit ? "Save changes" : "Add car"}
        </button>
        {isEdit && (
          <>
            <div className="fab-spacer" />
            <button type="button" className="btn btn--danger btn--block" onClick={onDelete}>
              Delete car
            </button>
          </>
        )}
      </form>
    </Layout>
  );
}
