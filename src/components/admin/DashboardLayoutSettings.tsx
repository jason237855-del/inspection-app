import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, LayoutList } from "lucide-react";
import { useDashboardLayout, type DashboardSection } from "@/lib/dashboard-layout";
import { cn } from "@/lib/utils";

/** Admin control for the project dashboard (Page 2) tab order and module visibility. */
export function DashboardLayoutSettings() {
  const { sections, loading, update, move, reorder } = useDashboardLayout();
  const [list, setList] = useState<DashboardSection[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());
  const dragging = useRef(false);

  useEffect(() => {
    if (!dragging.current) setList(sections);
  }, [sections]);

  const indexAtY = (y: number) => {
    const entries = list
      .map((s) => ({ id: s.id, el: rows.current.get(s.id) }))
      .filter((e): e is { id: string; el: HTMLLIElement } => Boolean(e.el));
    for (let i = 0; i < entries.length; i++) {
      const r = entries[i]!.el.getBoundingClientRect();
      if (y < r.top + r.height / 2) return i;
    }
    return entries.length - 1;
  };

  const onPointerDown = (e: React.PointerEvent, id: string) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = true;
    setDragId(id);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragId) return;
    const from = list.findIndex((s) => s.id === dragId);
    const to = indexAtY(e.clientY);
    if (from < 0 || to < 0 || to === from) return;
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    setList(next);
  };

  const onPointerUp = () => {
    if (!dragId) return;
    const ids = list.map((s) => s.id);
    setDragId(null);
    dragging.current = false;
    void reorder(ids);
  };

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <h2 className="mb-1 flex items-center gap-2 font-display text-base font-bold">
        <LayoutList className="h-4 w-4 text-primary" />
        案件總覽頁版面設定
      </h2>
      <p className="mb-3 text-xs text-muted-foreground">
        按住左側 <GripVertical className="inline h-3.5 w-3.5 align-text-bottom" /> 拖曳即可調整順序，也可用箭頭微調；並可個別開關頁籤與內容區塊。
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground">載入中…</p>
      ) : (
        <ul className="space-y-2 select-none">
          {list.map((s, i) => (
            <li
              key={s.id}
              ref={(el) => {
                if (el) rows.current.set(s.id, el);
                else rows.current.delete(s.id);
              }}
              className={cn(
                "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border p-3 transition-shadow",
                dragId === s.id && "border-primary bg-primary/5 shadow-card",
              )}
            >
              <button
                type="button"
                aria-label={`拖曳排序 ${s.label}`}
                onPointerDown={(e) => onPointerDown(e, s.id)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className="grid h-10 w-8 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-muted-foreground active:cursor-grabbing"
              >
                <GripVertical className="h-5 w-5" />
              </button>

              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{s.label}</p>
                <p className="truncate text-xs text-muted-foreground">順序 {i + 1}</p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                <Toggle
                  label="頁籤"
                  on={s.tab_visible}
                  onClick={() => void update(s.id, { tab_visible: !s.tab_visible })}
                />
                <Toggle
                  label="區塊"
                  on={s.block_visible}
                  onClick={() => void update(s.id, { block_visible: !s.block_visible })}
                />
                <button
                  type="button"
                  aria-label={`${s.label} 上移`}
                  disabled={i === 0}
                  onClick={() => void move(s.id, -1)}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-border disabled:opacity-40"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={`${s.label} 下移`}
                  disabled={i === list.length - 1}
                  onClick={() => void move(s.id, 1)}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-border disabled:opacity-40"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "h-9 rounded-lg border px-3 text-xs font-bold transition-colors",
        on ? "border-foreground bg-foreground text-background" : "border-border bg-surface text-muted-foreground",
      )}
    >
      {label}
      {on ? " 顯示" : " 隱藏"}
    </button>
  );
}
