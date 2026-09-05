import { useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CatDef, LibraryCat } from "@/lib/checklist-db";
import type { ItemField } from "@/lib/item-fields";
import type { InspectRole } from "@/lib/roles";
import { FieldSelect } from "./FieldSelect";
import { RoleSelect } from "./RoleSelect";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  spaceName?: string;
  categories: CatDef[];
  library?: LibraryCat[];
  onAddFromTemplate?: (
    catName: string,
    item: { title: string; roles?: InspectRole[]; fields?: ItemField[] },
    catRoles?: InspectRole[],
  ) => Promise<void> | void;
  onAddCategory: (name: string) => Promise<void> | void;
  onRenameCategory: (id: string, name: string) => Promise<void> | void;
  onDeleteCategory: (id: string) => Promise<void> | void;
  onMoveCategory: (id: string, dir: -1 | 1) => Promise<void> | void;
  onAddItem: (categoryId: string, title: string) => Promise<void> | void;
  onUpdateItem: (
    id: string,
    patch: { title?: string; hidden?: boolean; roles?: InspectRole[]; fields?: ItemField[] },
  ) => Promise<void> | void;
  onSetCategoryRoles: (id: string, roles: InspectRole[]) => Promise<void> | void;
  onDeleteItem: (id: string) => Promise<void> | void;
  onMoveItem: (categoryId: string, id: string, dir: -1 | 1) => Promise<void> | void;
};


const iconBtn =
  "grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40";

export function ChecklistManager({
  open,
  onOpenChange,
  spaceName,
  categories,
  library = [],
  onAddFromTemplate,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
  onMoveCategory,
  onAddItem,
  onUpdateItem,
  onSetCategoryRoles,
  onDeleteItem,
  onMoveItem,
}: Props) {
  const [catName, setCatName] = useState("");
  const [itemDrafts, setItemDrafts] = useState<Record<string, string>>({});

  const present = new Set(categories.flatMap((c) => c.items.map((i) => `${c.name}／${i.title}`)));
  const missing = library
    .map((c) => ({ ...c, items: c.items.filter((i) => !present.has(`${c.name}／${i.title}`)) }))
    .filter((c) => c.items.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">檢驗項目管理{spaceName ? ` · ${spaceName}` : ""}</DialogTitle>
        </DialogHeader>

        <p className="rounded-lg bg-muted p-2 text-xs text-muted-foreground">
          此處調整只影響「{spaceName ?? "本空間"}」，不會變更其他空間或預設範本。
        </p>

        {onAddFromTemplate && missing.length > 0 && (
          <section className="rounded-xl border border-dashed border-border p-3">
            <h3 className="mb-2 font-display text-[15px] font-bold">從範本補加項目</h3>
            <div className="space-y-2">
              {missing.map((cat) => (
                <div key={cat.name}>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">{cat.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.items.map((item) => (
                      <button
                        key={item.title}
                        type="button"
                        onClick={() => void onAddFromTemplate(cat.name, item, cat.roles)}
                        className="inline-flex h-9 items-center gap-1 rounded-full border border-border bg-surface px-3 text-xs font-semibold hover:bg-muted"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {item.title}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}



        <div className="flex gap-2">
          <input
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="新增類別（例：機電水電工程）"
            className="h-12 min-w-0 flex-1 rounded-lg border border-input bg-surface px-3 text-[15px] outline-none focus:border-ring"
          />
          <button
            type="button"
            onClick={async () => {
              if (!catName.trim()) return;
              await onAddCategory(catName);
              setCatName("");
            }}
            className="inline-flex h-12 shrink-0 items-center gap-1 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            類別
          </button>
        </div>

        <div className="space-y-3">
          {categories.map((cat, ci) => (
            <section key={cat.id} className="rounded-xl border border-border p-3">
              <div className="mb-2 flex items-center gap-2">
                <h3 className="min-w-0 flex-1 truncate font-display text-[15px] font-bold">{cat.name}</h3>
                <button type="button" aria-label="上移類別" disabled={ci === 0} onClick={() => void onMoveCategory(cat.id, -1)} className={iconBtn}>
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="下移類別"
                  disabled={ci === categories.length - 1}
                  onClick={() => void onMoveCategory(cat.id, 1)}
                  className={iconBtn}
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="重新命名類別"
                  onClick={() => {
                    const v = window.prompt("類別名稱", cat.name);
                    if (v) void onRenameCategory(cat.id, v);
                  }}
                  className={iconBtn}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="刪除類別"
                  onClick={() => {
                    if (window.confirm(`確定刪除類別「${cat.name}」與其所有項目？`)) void onDeleteCategory(cat.id);
                  }}
                  className={`${iconBtn} text-defect`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-2 rounded-lg bg-muted/50 p-2">
                <RoleSelect value={cat.roles} onChange={(roles) => void onSetCategoryRoles(cat.id, roles)} />
              </div>

              <ul className="space-y-2">
                {cat.items.map((item, ii) => (
                  <li key={item.id} className="space-y-2 rounded-lg bg-muted/60 p-2">
                    <div className="flex items-center gap-2">
                    <span className={`min-w-0 flex-1 text-sm ${item.hidden ? "text-muted-foreground line-through" : ""}`}>
                      {item.title}
                    </span>
                    <button type="button" aria-label="上移項目" disabled={ii === 0} onClick={() => void onMoveItem(cat.id, item.id, -1)} className={iconBtn}>
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="下移項目"
                      disabled={ii === cat.items.length - 1}
                      onClick={() => void onMoveItem(cat.id, item.id, 1)}
                      className={iconBtn}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={item.hidden ? "顯示項目" : "隱藏項目"}
                      onClick={() => void onUpdateItem(item.id, { hidden: !item.hidden })}
                      className={iconBtn}
                    >
                      {item.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      aria-label="編輯項目"
                      onClick={() => {
                        const v = window.prompt("檢驗項目", item.title);
                        if (v) void onUpdateItem(item.id, { title: v });
                      }}
                      className={iconBtn}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="刪除項目"
                      onClick={() => {
                        if (window.confirm(`確定刪除項目「${item.title}」？`)) void onDeleteItem(item.id);
                      }}
                      className={`${iconBtn} text-defect`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    </div>
                    <RoleSelect value={item.roles} onChange={(roles) => void onUpdateItem(item.id, { roles })} />
                    <FieldSelect value={item.fields} onChange={(fields) => void onUpdateItem(item.id, { fields })} />
                  </li>
                ))}
              </ul>

              <div className="mt-2 flex gap-2">
                <input
                  value={itemDrafts[cat.id] ?? ""}
                  onChange={(e) => setItemDrafts((p) => ({ ...p, [cat.id]: e.target.value }))}
                  placeholder="新增檢驗項目"
                  className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-surface px-3 text-sm outline-none focus:border-ring"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const v = (itemDrafts[cat.id] ?? "").trim();
                    if (!v) return;
                    await onAddItem(cat.id, v);
                    setItemDrafts((p) => ({ ...p, [cat.id]: "" }));
                  }}
                  className="inline-flex h-11 shrink-0 items-center gap-1 rounded-lg border border-border px-3 text-sm font-semibold"
                >
                  <Plus className="h-4 w-4" />
                  項目
                </button>
              </div>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
