import { useState } from "react";
import { ArrowDown, ArrowUp, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { spaceSettings, type SpaceDef, type SpaceSettings } from "@/lib/checklist-db";
import { RoleSelect } from "./RoleSelect";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  spaces: SpaceDef[];
  onAdd: (name: string) => Promise<void> | void;
  onRename: (space: SpaceDef, name: string) => Promise<void> | void;
  onDelete: (space: SpaceDef) => Promise<void> | void;
  onMove: (space: SpaceDef, dir: -1 | 1) => Promise<void> | void;
  onDuplicate: (space: SpaceDef, name: string) => Promise<void> | void;
  onSettings: (spaceId: string, patch: Partial<SpaceSettings>) => Promise<void> | void;
};

const iconBtn =
  "grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40";

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[hsl(var(--primary))]"
      />
      {label}
    </label>
  );
}

export function SpaceManager({
  open,
  onOpenChange,
  spaces,
  onAdd,
  onRename,
  onDelete,
  onMove,
  onDuplicate,
  onSettings,
}: Props) {
  const [name, setName] = useState("");

  const add = async () => {
    if (!name.trim()) return;
    await onAdd(name);
    setName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">空間管理</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="新增空間名稱（例：主臥衛浴）"
            className="h-12 min-w-0 flex-1 rounded-lg border border-input bg-surface px-3 text-[15px] outline-none focus:border-ring"
          />
          <button
            type="button"
            onClick={() => void add()}
            className="inline-flex h-12 shrink-0 items-center gap-1 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            新增
          </button>
        </div>

        <ul className="space-y-2">
          {spaces.map((s, i) => {
            const cfg = spaceSettings(s);
            return (
            <li key={s.id} className="space-y-2 rounded-xl border border-border p-2">
              <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{s.name}</span>
              <button
                type="button"
                aria-label="上移"
                disabled={i === 0}
                onClick={() => void onMove(s, -1)}
                className={iconBtn}
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="下移"
                disabled={i === spaces.length - 1}
                onClick={() => void onMove(s, 1)}
                className={iconBtn}
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="重新命名"
                onClick={() => {
                  const v = window.prompt("空間名稱", s.name);
                  if (v) void onRename(s, v);
                }}
                className={iconBtn}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="複製空間"
                onClick={() => {
                  const v = window.prompt("複製為新空間，名稱：", `${s.name} 2`);
                  if (v) void onDuplicate(s, v);
                }}
                className={iconBtn}
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="刪除空間"
                onClick={() => {
                  if (window.confirm(`確定刪除「${s.name}」？該空間的檢查紀錄與照片將一併移除。`))
                    void onDelete(s);
                }}
                className={`${iconBtn} text-defect`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-border pt-2">
                <Toggle
                  label="格局圖／備註"
                  checked={cfg.show_brief}
                  onChange={(v) => void onSettings(s.id, { show_brief: v })}
                />
                <Toggle
                  label="空間尺寸"
                  checked={cfg.show_dimensions}
                  onChange={(v) => void onSettings(s.id, { show_dimensions: v })}
                />
                <Toggle
                  label="長"
                  checked={cfg.dim_length}
                  onChange={(v) => void onSettings(s.id, { dim_length: v })}
                />
                <Toggle
                  label="寬"
                  checked={cfg.dim_width}
                  onChange={(v) => void onSettings(s.id, { dim_width: v })}
                />
                <Toggle
                  label="高"
                  checked={cfg.dim_height}
                  onChange={(v) => void onSettings(s.id, { dim_height: v })}
                />
              </div>

              <div className="space-y-2 border-t border-border pt-2">
                <RoleSelect
                  label="格局圖／備註角色"
                  value={cfg.brief_roles}
                  onChange={(roles) => void onSettings(s.id, { brief_roles: roles })}
                />
                <RoleSelect
                  label="空間尺寸角色"
                  value={cfg.dim_roles}
                  onChange={(roles) => void onSettings(s.id, { dim_roles: roles })}
                />
                <RoleSelect
                  label="窗框含水率角色"
                  value={cfg.window_roles}
                  onChange={(roles) => void onSettings(s.id, { window_roles: roles })}
                />
              </div>
            </li>
            );
          })}
          {spaces.length === 0 && (
            <li className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              尚未建立空間
            </li>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
