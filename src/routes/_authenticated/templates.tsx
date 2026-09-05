import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, LayoutTemplate, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { FieldSelect } from "@/components/inspection/FieldSelect";
import { RoleSelect } from "@/components/inspection/RoleSelect";
import { SpaceTagSelect } from "@/components/inspection/SpaceTagSelect";
import { useTemplateChecklist, useTemplateSets } from "@/lib/checklist-db";
import { useSession } from "@/lib/useSession";

export const Route = createFileRoute("/_authenticated/templates")({
  head: () => ({
    meta: [
      { title: "檢查範本管理 | 驗屋現場紀錄系統" },
      { name: "description", content: "編輯預設驗屋檢查範本的空間、檢驗類別與項目，新建案件將自動套用最新範本。" },
      { property: "og:title", content: "檢查範本管理" },
      { property: "og:description", content: "編輯預設驗屋檢查範本的空間、類別與檢驗項目。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TemplatesPage,
});

const iconBtn =
  "grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted";

function TemplatesPage() {
  const { realRole, loading } = useSession();
  const navigate = useNavigate();
  const { sets } = useTemplateSets();
  const [setId, setSetId] = useState<string>("");
  const t = useTemplateChecklist(setId || null);

  useEffect(() => {
    if (!setId && sets[0]) setSetId(sets[0]!.id);
  }, [setId, sets]);
  const [spaceName, setSpaceName] = useState("");
  const [catName, setCatName] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && realRole !== "admin") void navigate({ to: "/home" });
  }, [loading, navigate, realRole]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <LayoutTemplate className="h-5 w-5 shrink-0 text-primary" />
            <h1 className="truncate font-display text-lg font-bold tracking-tight">預設檢查範本</h1>
          </div>
          <Link
            to="/admin"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold"
          >
            <ArrowLeft className="h-4 w-4" />
            系統後台
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-4 pb-28">
        <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
          此範本會在建立新案件時自動套用；已建立的案件可於現場頁面各自調整，不受影響。
        </p>
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
          <label className="block">
            <span className="field-label">選擇範本</span>
            <select
              value={setId}
              onChange={(e) => setSetId(e.target.value)}
              className="mt-1 h-12 w-full rounded-lg border border-input bg-surface px-3 text-[16px] outline-none focus:border-ring"
            >
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-2 text-xs text-muted-foreground">
            {sets.find((s) => s.id === setId)?.description || "各範本的空間與檢驗項目彼此獨立。"}
          </p>
        </section>

        {t.error && <p className="rounded-lg bg-defect-soft p-3 text-sm text-defect">{t.error}</p>}
        {t.loading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />載入中…
          </p>
        )}

        <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
          <h2 className="mb-3 font-display text-base font-bold">預設空間（{t.spaces.length}）</h2>
          <div className="mb-3 flex gap-2">
            <input
              value={spaceName}
              onChange={(e) => setSpaceName(e.target.value)}
              placeholder="新增預設空間"
              className="h-12 min-w-0 flex-1 rounded-lg border border-input bg-surface px-3 text-[15px] outline-none focus:border-ring"
            />
            <button
              type="button"
              onClick={async () => {
                if (!spaceName.trim()) return;
                await t.addSpace(spaceName);
                setSpaceName("");
              }}
              className="inline-flex h-12 shrink-0 items-center gap-1 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground"
            >
              <Plus className="h-4 w-4" />新增
            </button>
          </div>
          <ul className="space-y-2">
            {t.spaces.map((s) => (
              <li key={s.id} className="flex items-center gap-2 rounded-xl border border-border p-2">
                <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{s.name}</span>
                <button
                  type="button"
                  aria-label="重新命名空間"
                  onClick={() => {
                    const v = window.prompt("空間名稱", s.name);
                    if (v) void t.renameSpace(s.id, v);
                  }}
                  className={iconBtn}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="刪除空間"
                  onClick={() => {
                    if (window.confirm(`從預設範本移除「${s.name}」？`)) void t.deleteSpace(s.id);
                  }}
                  className={`${iconBtn} text-defect`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
          <h2 className="mb-3 font-display text-base font-bold">預設檢驗類別與項目</h2>
          <div className="mb-3 flex gap-2">
            <input
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="新增類別"
              className="h-12 min-w-0 flex-1 rounded-lg border border-input bg-surface px-3 text-[15px] outline-none focus:border-ring"
            />
            <button
              type="button"
              onClick={async () => {
                if (!catName.trim()) return;
                await t.addCategory(catName);
                setCatName("");
              }}
              className="inline-flex h-12 shrink-0 items-center gap-1 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground"
            >
              <Plus className="h-4 w-4" />類別
            </button>
          </div>

          <div className="space-y-3">
            {t.categories.map((cat, ci) => (
              <div key={cat.id} className="rounded-xl border border-border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="min-w-0 flex-1 truncate font-display text-[15px] font-bold">{cat.name}</h3>
                  <button
                    type="button"
                    aria-label="上移類別"
                    disabled={ci === 0}
                    onClick={() => void t.moveCategory(cat.id, -1)}
                    className={`${iconBtn} disabled:opacity-40`}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="下移類別"
                    disabled={ci === t.categories.length - 1}
                    onClick={() => void t.moveCategory(cat.id, 1)}
                    className={`${iconBtn} disabled:opacity-40`}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="重新命名類別"
                    onClick={() => {
                      const v = window.prompt("類別名稱", cat.name);
                      if (v) void t.renameCategory(cat.id, v);
                    }}
                    className={iconBtn}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="刪除類別"
                    onClick={() => {
                      if (window.confirm(`刪除類別「${cat.name}」與其項目？`)) void t.deleteCategory(cat.id);
                    }}
                    className={`${iconBtn} text-defect`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mb-2 space-y-2 rounded-lg bg-muted/50 p-2">
                  <RoleSelect value={cat.roles} onChange={(roles) => void t.setCategoryRoles(cat.id, roles)} />
                  <SpaceTagSelect
                    value={cat.spaces ?? []}
                    options={t.spaces.map((s) => s.name)}
                    onChange={(spaces) => void t.setCategorySpaces(cat.id, spaces)}
                  />
                </div>


                <ul className="space-y-2">
                  {cat.items.map((item, ii) => (
                    <li key={item.id} className="space-y-2 rounded-lg bg-muted/60 p-2">
                      <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 text-sm">{item.title}</span>
                      <button
                        type="button"
                        aria-label="上移項目"
                        disabled={ii === 0}
                        onClick={() => void t.moveItem(cat.id, item.id, -1)}
                        className={`${iconBtn} disabled:opacity-40`}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="下移項目"
                        disabled={ii === cat.items.length - 1}
                        onClick={() => void t.moveItem(cat.id, item.id, 1)}
                        className={`${iconBtn} disabled:opacity-40`}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="編輯項目"
                        onClick={() => {
                          const v = window.prompt("檢驗項目", item.title);
                          if (v) void t.renameItem(item.id, v);
                        }}
                        className={iconBtn}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="刪除項目"
                        onClick={() => {
                          if (window.confirm(`刪除項目「${item.title}」？`)) void t.deleteItem(item.id);
                        }}
                        className={`${iconBtn} text-defect`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      </div>
                      <RoleSelect value={item.roles} onChange={(roles) => void t.setItemRoles(item.id, roles)} />
                      <SpaceTagSelect
                        value={item.spaces ?? []}
                        options={t.spaces.map((s) => s.name)}
                        onChange={(spaces) => void t.setItemSpaces(item.id, spaces)}
                      />
                      <FieldSelect value={item.fields} onChange={(fields) => void t.setItemFields(item.id, fields)} />

                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex gap-2">
                  <input
                    value={drafts[cat.id] ?? ""}
                    onChange={(e) => setDrafts((p) => ({ ...p, [cat.id]: e.target.value }))}
                    placeholder="新增檢驗項目"
                    className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-surface px-3 text-sm outline-none focus:border-ring"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const v = (drafts[cat.id] ?? "").trim();
                      if (!v) return;
                      await t.addItem(cat.id, v);
                      setDrafts((p) => ({ ...p, [cat.id]: "" }));
                    }}
                    className="inline-flex h-11 shrink-0 items-center gap-1 rounded-lg border border-border px-3 text-sm font-semibold"
                  >
                    <Plus className="h-4 w-4" />項目
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <BottomNav isAdmin />
    </div>
  );
}
