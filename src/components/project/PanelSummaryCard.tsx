import { Link } from "@tanstack/react-router";
import { ChevronRight, Zap } from "lucide-react";
import { usePanels } from "@/lib/panels-db";

/** 案件總覽頁的電箱摘要入口卡片，點擊進入獨立電箱管理頁。 */
export function PanelSummaryCard({ projectId }: { projectId: string }) {
  const db = usePanels(projectId);

  if (db.loading) return <p className="text-sm text-muted-foreground">載入中…</p>;

  return (
    <div className="space-y-2">
      {db.panels.length === 0 && (
        <p className="text-sm text-muted-foreground">尚未建立電箱，點擊下方前往設定。</p>
      )}
      {db.panels.map((p) => {
        const count = db.circuits.filter((c) => c.panel_id === p.id).length;
        return (
          <Link
            key={p.id}
            to="/panels/$projectId"
            params={{ projectId }}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-3"
          >
            <Zap className="h-4 w-4 shrink-0 text-accent" />
            <span className="min-w-0 flex-1 text-[14px] font-bold">
              {p.name || "電箱"}
              <span className="ml-1 font-semibold text-muted-foreground">
                — 總電源 {p.amperage || "—"}A · {p.wire_spec || "—"}mm²（{count} 個迴路）
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        );
      })}
      <Link
        to="/panels/$projectId"
        params={{ projectId }}
        className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold"
      >
        前往電箱管理
      </Link>
    </div>
  );
}
