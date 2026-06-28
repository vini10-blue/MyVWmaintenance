import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { EditableThumbs } from "../components/Attachments";
import { repo } from "../lib/db/repo";
import { db } from "../lib/db/schema";
import {
  SERVICE_CATEGORY_LABELS,
  type Attachment,
  type Car,
  type PartUsed,
  type ServiceCategory,
} from "../lib/types";
import { CURRENCIES, todayIso } from "../lib/format";
import { CATALOG_BY_KEY } from "../lib/schedule/catalog";
import { scanReceipt } from "../lib/ocr";

export function RecordEditor() {
  const { id = "", recordId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = Boolean(recordId);

  const [car, setCar] = useState<Car>();
  const [serviceKey, setServiceKey] = useState<string | undefined>();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ServiceCategory>("other");
  const [date, setDate] = useState(todayIso());
  const [odometer, setOdometer] = useState<string>("");
  const [cost, setCost] = useState<string>("");
  const [currency, setCurrency] = useState("USD");
  const [performedBy, setPerformedBy] = useState("DIY");
  const [parts, setParts] = useState<PartUsed[]>([]);
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string>();
  const [saving, setSaving] = useState(false);

  // Suggestions gathered from previous records so common entries can be picked
  // from a dropdown instead of retyped (the fields stay free-text/editable).
  const [titleOptions, setTitleOptions] = useState<string[]>([]);
  const [partNameOptions, setPartNameOptions] = useState<string[]>([]);
  const [brandOptions, setBrandOptions] = useState<string[]>([]);

  useEffect(() => {
    db.records.toArray().then((rows) => {
      const titles = new Set<string>();
      const partNames = new Set<string>();
      const brands = new Set<string>();
      for (const r of rows) {
        if (r.title?.trim()) titles.add(r.title.trim());
        for (const p of r.parts ?? []) {
          if (p.name?.trim()) partNames.add(p.name.trim());
          if (p.brand?.trim()) brands.add(p.brand.trim());
        }
      }
      const sorted = (s: Set<string>) =>
        Array.from(s).sort((a, b) => a.localeCompare(b));
      setTitleOptions(sorted(titles));
      setPartNameOptions(sorted(partNames));
      setBrandOptions(sorted(brands));
    });
  }, []);

  // Load car (for defaults) and, in edit mode, the existing record.
  useEffect(() => {
    repo.cars.get(id).then((c) => {
      if (!c) return;
      setCar(c);
      setOdometer((prev) => (prev === "" && !recordId ? String(c.odometer) : prev));
    });
  }, [id, recordId]);

  // Prefill from ?service= for new records.
  useEffect(() => {
    if (recordId) return;
    const key = params.get("service");
    if (key) {
      setServiceKey(key);
      const item = CATALOG_BY_KEY[key];
      if (item) {
        setTitle(item.name);
        setCategory(item.category);
      }
    }
  }, [params, recordId]);

  // Load existing record in edit mode.
  useEffect(() => {
    if (!recordId) return;
    repo.records.get(recordId).then(async (r) => {
      if (!r) return;
      setServiceKey(r.serviceKey);
      setTitle(r.title);
      setCategory(r.category);
      setDate(r.date);
      setOdometer(r.odometer != null ? String(r.odometer) : "");
      setCost(r.cost != null ? String(r.cost) : "");
      setCurrency(r.currency);
      setPerformedBy(r.performedBy ?? "");
      setParts(r.parts ?? []);
      setNotes(r.notes ?? "");
      const atts = await repo.attachments.getMany(r.attachmentIds);
      setAttachments(atts);
    });
  }, [recordId]);

  async function addFiles(files: FileList | null, kind: Attachment["kind"]) {
    if (!files) return;
    for (const file of Array.from(files)) {
      const att = await repo.attachments.add({
        carId: id,
        recordId,
        blob: file,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        kind,
      });
      setAttachments((a) => [...a, att]);
    }
  }

  async function onScanReceipt(file: File) {
    setScanning(true);
    setScanMsg("Reading receipt on your device…");
    // Store the image as a receipt attachment immediately.
    const att = await repo.attachments.add({
      carId: id,
      recordId,
      blob: file,
      filename: file.name,
      mimeType: file.type || "image/jpeg",
      kind: "receipt",
    });
    setAttachments((a) => [...a, att]);
    try {
      const result = await scanReceipt(file);
      const found: string[] = [];
      if (result.amount != null) {
        setCost(String(result.amount));
        found.push("amount");
      }
      if (result.date) {
        setDate(result.date);
        found.push("date");
      }
      if (result.vendor) {
        setPerformedBy(result.vendor);
        found.push("vendor");
      }
      setScanMsg(
        found.length
          ? `Filled ${found.join(", ")} from the receipt — please check before saving.`
          : "Couldn't read the details — please enter them manually.",
      );
    } catch {
      setScanMsg("Scan failed — the photo is attached; enter details manually.");
    } finally {
      setScanning(false);
    }
  }

  async function removeAttachment(attId: string) {
    await repo.attachments.remove(attId);
    setAttachments((a) => a.filter((x) => x.id !== attId));
  }

  async function onSave() {
    if (!title.trim()) {
      alert("Please add a title for what was done.");
      return;
    }
    setSaving(true);
    const attachmentIds = attachments.map((a) => a.id);
    const payload = {
      carId: id,
      serviceKey,
      title: title.trim(),
      category,
      date,
      odometer: odometer === "" ? undefined : Number(odometer),
      cost: cost === "" ? undefined : Number(cost),
      currency,
      performedBy: performedBy.trim() || undefined,
      parts: parts.filter((p) => p.name.trim()),
      notes: notes.trim() || undefined,
      attachmentIds,
    };

    let savedId = recordId;
    if (isEdit && recordId) {
      await repo.records.update(recordId, payload);
      if (payload.odometer != null) await repo.cars.bumpOdometer(id, payload.odometer);
    } else {
      const created = await repo.records.add(payload);
      savedId = created.id;
    }
    // Make sure attachments point at the record.
    for (const aId of attachmentIds) {
      await db.attachments.update(aId, { recordId: savedId });
    }
    navigate(`/car/${id}/history`, { replace: true });
  }

  return (
    <Layout title={isEdit ? "Edit record" : "Log service"} back>
      {/* Shared suggestion lists (fields stay editable; these only offer picks). */}
      <datalist id="title-options">
        {titleOptions.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <datalist id="part-name-options">
        {partNameOptions.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <datalist id="part-brand-options">
        {brandOptions.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>

      <div className="card">
        {/* Receipt scan */}
        <div className="scan-banner">
          <strong>🧾 Scan a receipt</strong>
          <div className="small muted" style={{ margin: "4px 0 8px" }}>
            Reads on your device — fills amount, date and vendor for you to confirm.
          </div>
          <label className="btn btn--sm">
            {scanning ? "Scanning…" : "Scan / choose receipt"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              disabled={scanning}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onScanReceipt(f);
                e.target.value = "";
              }}
            />
          </label>
          {scanMsg && (
            <div className="small" style={{ marginTop: 6 }}>
              {scanMsg}
            </div>
          )}
        </div>

        <div className="field" style={{ marginTop: 12 }}>
          <label>What was done</label>
          <input
            list="title-options"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Oil change"
          />
        </div>

        <div className="grid2">
          <div className="field">
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as ServiceCategory)}>
              {Object.entries(SERVICE_CATEGORY_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div className="grid2">
          <div className="field">
            <label>Odometer ({car?.distanceUnit ?? "mi"})</label>
            <input
              type="number"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Performed by</label>
            <input
              value={performedBy}
              onChange={(e) => setPerformedBy(e.target.value)}
              placeholder="DIY or shop name"
            />
          </div>
        </div>

        <div className="grid2">
          <div className="field">
            <label>Cost</label>
            <input
              type="number"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      {/* Parts */}
      <div className="section-title">Parts used</div>
      <div className="card">
        {parts.map((p, i) => (
          <div className="part-item" key={i}>
            <div className="field">
              <label>Part</label>
              <input
                list="part-name-options"
                value={p.name}
                onChange={(e) =>
                  setParts((arr) => arr.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                }
              />
            </div>
            <div className="grid2">
              <div className="field">
                <label>Brand</label>
                <input
                  list="part-brand-options"
                  value={p.brand ?? ""}
                  placeholder="e.g. Bosch"
                  onChange={(e) =>
                    setParts((arr) =>
                      arr.map((x, j) =>
                        j === i ? { ...x, brand: e.target.value === "" ? undefined : e.target.value } : x,
                      ),
                    )
                  }
                />
              </div>
              <div className="field">
                <label>Cost</label>
                <input
                  type="number"
                  step="0.01"
                  value={p.cost ?? ""}
                  onChange={(e) =>
                    setParts((arr) =>
                      arr.map((x, j) =>
                        j === i ? { ...x, cost: e.target.value === "" ? undefined : Number(e.target.value) } : x,
                      ),
                    )
                  }
                />
              </div>
            </div>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn--sm btn--danger"
                onClick={() => setParts((arr) => arr.filter((_, j) => j !== i))}
              >
                ✕ Remove part
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="btn btn--sm"
          style={{ marginTop: parts.length ? 14 : 0 }}
          onClick={() => setParts((arr) => [...arr, { name: "" }])}
        >
          + Add part
        </button>
      </div>

      {/* Attachments */}
      <div className="section-title">Photos & documents</div>
      <div className="card">
        <EditableThumbs atts={attachments} onRemove={removeAttachment} />
        <div className="row" style={{ marginTop: attachments.length ? 10 : 0, gap: 8 }}>
          <label className="btn btn--sm">
            📷 Add photo
            <input
              type="file"
              accept="image/*"
              hidden
              multiple
              onChange={(e) => {
                addFiles(e.target.files, "photo");
                e.target.value = "";
              }}
            />
          </label>
          <label className="btn btn--sm">
            📄 Add document
            <input
              type="file"
              hidden
              multiple
              onChange={(e) => {
                addFiles(e.target.files, "manual");
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      <div className="fab-spacer" />
      <button className="btn btn--primary btn--block" onClick={onSave} disabled={saving}>
        {saving ? "Saving…" : isEdit ? "Save changes" : "Save record"}
      </button>
      {isEdit && recordId && (
        <>
          <div className="fab-spacer" />
          <button
            className="btn btn--danger btn--block"
            onClick={async () => {
              if (confirm("Delete this record?")) {
                await repo.records.remove(recordId);
                navigate(`/car/${id}/history`, { replace: true });
              }
            }}
          >
            Delete record
          </button>
        </>
      )}
    </Layout>
  );
}
