import type { ReactNode } from "react";

export function EmptyState({
  emoji = "🗒️",
  title,
  children,
}: {
  emoji?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty__emoji">{emoji}</div>
      <h3>{title}</h3>
      {children && <div className="small muted">{children}</div>}
    </div>
  );
}
