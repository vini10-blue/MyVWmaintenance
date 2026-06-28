import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { repo } from "../lib/db/repo";
import type { Attachment } from "../lib/types";

const KIND_ICON: Record<string, string> = {
  receipt: "🧾",
  photo: "🖼️",
  manual: "📄",
  other: "📎",
};

/** Resolve a Blob to an object URL for the lifetime of the component. */
function useBlobUrl(blob?: Blob): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) return;
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

function Thumb({ att, onRemove }: { att: Attachment; onRemove?: () => void }) {
  const url = useBlobUrl(att.blob);
  const isImage = att.mimeType.startsWith("image/");
  return (
    <div style={{ position: "relative" }}>
      <a href={url} target="_blank" rel="noreferrer" title={att.filename}>
        {isImage && url ? (
          <img className="thumb" src={url} alt={att.filename} />
        ) : (
          <div
            className="thumb"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              background: "var(--surface-2)",
            }}
          >
            {KIND_ICON[att.kind] ?? "📎"}
          </div>
        )}
      </a>
      {onRemove && (
        <button
          aria-label="Remove attachment"
          onClick={onRemove}
          style={{
            position: "absolute",
            top: -8,
            right: -8,
            width: 22,
            height: 22,
            borderRadius: "50%",
            border: "none",
            background: "var(--overdue)",
            color: "#fff",
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

/** Read-only thumbnails for a set of attachment ids. */
export function AttachmentThumbs({ ids }: { ids: string[] }) {
  const atts = useLiveQuery(() => repo.attachments.getMany(ids), [ids.join(",")]);
  if (!atts || atts.length === 0) return null;
  return (
    <div className="thumbs">
      {atts.map((a) => (
        <Thumb key={a.id} att={a} />
      ))}
    </div>
  );
}

/** Editable thumbnail list (used in editors). */
export function EditableThumbs({
  atts,
  onRemove,
}: {
  atts: Attachment[];
  onRemove: (id: string) => void;
}) {
  if (atts.length === 0) return null;
  return (
    <div className="thumbs">
      {atts.map((a) => (
        <Thumb key={a.id} att={a} onRemove={() => onRemove(a.id)} />
      ))}
    </div>
  );
}
