import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckSquare,
  CircleSlash,
  ClipboardList,
  Clock,
  Cloud,
  FileText,
  LayoutGrid,
  ListChecks,
  Loader2,
  Search,
  TriangleAlert,
  User,
  Zap,
} from "lucide-react";
import { ChecklistItem } from "@/components/inspection/ChecklistItem";
import { ChecklistManager } from "@/components/inspection/ChecklistManager";
import { ReportPreview, type ReportSpace } from "@/components/inspection/ReportPreview";
import { SpaceManager } from "@/components/inspection/SpaceManager";
import { SpaceModulePanel } from "@/components/inspection/SpaceModulePanel";
import { supabase } from "@/integrations/supabase/client";
import { spaceSettings, useProjectChecklist, useTemplateLibrary, type CatDef, type ItemDef, type SpaceDef } from "@/lib/checklist-db";
import { useProjectInspection } from "@/lib/inspection-db";
import { blankItem, defectCount } from "@/lib/inspection-store";
import type { ItemField } from "@/lib/item-fields";
import { ALL_ROLES, ROLE_OPTIONS, matchesRole, type InspectRole, type RoleFilter } from "@/lib/roles";
import { roundLabel } from "@/lib/rounds-db";
import { useSession } from "@/lib/useSession";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/inspect/$projectId")({
  validateSearch: (search: Record<string, unknown>) => {
    const s = search['status'];
    const status =
      s === "pending" || s === "pass" || s === "defect" || s === "na" ? (s as StatusFilter) : undefined;
    return {
      report: search['report'] === "1" ? "1" : undefined,
      status,
    };
  },
  head: () => ({
    meta: [
      { title: "現場檢查紀錄 | 驗屋現場紀錄系統" },
      { name: "description", content: "分空間檢查清單、缺失拍照、尺寸坪數與含水率量測，資料即時儲存於雲端。" },
      { property: "og:title", content: "現場檢查紀錄" },
      { property: "og:description", content: "分空間檢查清單、缺失拍照、尺寸坪數與含水率量測，資料即時儲存。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InspectPage,
});

type ProjectInfo = {
  name: string;
  client_name: string;
  client_phone: string;
  address: string;
  unit: string;
  developer: string;
  layout: string;
  total_ping: number | null;
  inspection_date: string | null;
  notes: string;
  current_round: number;
};

/** A category name aggregated across every space that contains it. */
type CatGroup = { name: string; entries: { space: SpaceDef; cat: CatDef; items: ItemDef[] }[] };

type StatusFilter = "all" | "pending" | "pass" | "defect" | "na";

/** Spatial tools rendered as first-class category cards in the directory. */
type SpatialKind = "dim" | "win";
const SPATIAL_DEFS: { kind: SpatialKind; name: string }[] = [
  { kind: "dim", name: "空間尺寸測量" },
  { kind: "win", name: "窗框含水率" },
];

function InspectPage() {
  const { projectId } = useParams({ from: "/_authenticated/inspect/$projectId" });
  const { report, status } = Route.useSearch();
  const navigate = useNavigate({ from: "/inspect/$projectId" });
  const checklist = useProjectChecklist(projectId);
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const currentRound = project?.current_round ?? 1;

  const templateLibrary = useTemplateLibrary(projectId);
  const { user } = useSession();
  const [profileName, setProfileName] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>(ALL_ROLES);
  const stamp = useMemo(() => {
    const who = profileName || user?.email || "";
    if (!who) return "";
    return roleFilter === ALL_ROLES ? who : `${who} (${roleFilter})`;
  }, [profileName, roleFilter, user?.email]);
  const {
    spaces,
    current,
    activeSpace,
    setActiveSpace,
    setItem,
    addPhotos,
    removePhoto,
    reloadInspection,
    inspectedBy,
    saveError,
    clearSaveError,
    loading,
    saving,
  } = useProjectInspection(projectId, currentRound, stamp);
  const [reportOpen, setReportOpen] = useState(report === "1");
  const [spaceMgrOpen, setSpaceMgrOpen] = useState(false);
  const [itemMgrOpen, setItemMgrOpen] = useState(false);
  // Page 3 (category directory) → Page 4 (room-grouped checklist / spatial module).
  const [view, setView] = useState<{ page: "dir" | "items" | "module"; cat?: string; mod?: SpatialKind }>(
    status ? { page: "items", cat: "all" } : { page: "dir" },
  );
  // The status filter lives in the URL so it survives navigation from the dashboard.
  const statusFilter: StatusFilter = status ?? "all";
  const setStatusFilter = (next: StatusFilter) => {
    void navigate({
      to: ".",
      search: (prev) => ({ ...prev, status: next === "all" ? undefined : next }),
      replace: true,
    });
  };
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase
      .from("projects")
      .select("name, client_name, client_phone, address, unit, developer, layout, total_ping, inspection_date, notes, current_round")
      .eq("id", projectId)
      .maybeSingle()
      .then(({ data }) => setProject((data as ProjectInfo) ?? null));
  }, [projectId]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfileName(data?.full_name ?? ""));
  }, [user]);

  const spaceNames = useMemo(() => checklist.spaces.map((s) => s.name), [checklist.spaces]);

  useEffect(() => {
    if (!spaceNames.length) return;
    if (!activeSpace || !spaceNames.includes(activeSpace)) setActiveSpace(spaceNames[0]!);
  }, [activeSpace, setActiveSpace, spaceNames]);

  const activeSpaceDef = useMemo(
    () => checklist.spaces.find((s) => s.name === activeSpace) ?? null,
    [activeSpace, checklist.spaces],
  );
  const spaceCategories = activeSpaceDef ? checklist.categoriesFor(activeSpaceDef.id) : [];

  /* ---------- Page 3: categories aggregated across every space ---------- */
  const groups = useMemo<CatGroup[]>(() => {
    const out: CatGroup[] = [];
    const index = new Map<string, CatGroup>();
    for (const sp of checklist.spaces) {
      for (const cat of checklist.categoriesFor(sp.id)) {
        let items = cat.items.filter((i) => !i.hidden && matchesRole(i.roles, roleFilter));
        // Re-inspection rounds only cover items carried over as defects (or
        // added during this round) — not the full original checklist.
        if (currentRound > 1) {
          items = items.filter((i) => spaces[sp.name]?.items[i.id]);
        }
        if (!items.length && !matchesRole(cat.roles, roleFilter)) continue;
        if (!items.length) continue;
        let g = index.get(cat.name);
        if (!g) {
          g = { name: cat.name, entries: [] };
          index.set(cat.name, g);
          out.push(g);
        }
        g.entries.push({ space: sp, cat, items });
      }
    }
    return out;
  }, [checklist, roleFilter, currentRound, spaces]);

  /** Spatial modules become category cards; each lists the spaces where it applies. */
  const spatialCards = useMemo(() => {
    return SPATIAL_DEFS.map(({ kind, name }) => {
      const entries = checklist.spaces
        .map((sp) => ({ space: sp, settings: spaceSettings(sp) }))
        .filter(({ settings: s }) => {
          if (kind === "dim") return s.show_dimensions && matchesRole(s.dim_roles, roleFilter);
          return matchesRole(s.window_roles, roleFilter);
        });
      return { kind, name, entries };
    }).filter((c) => c.entries.length > 0);
  }, [checklist.spaces, roleFilter]);

  const openModule = useMemo(
    () => (view.page === "module" ? (spatialCards.find((c) => c.kind === view.mod) ?? null) : null),
    [spatialCards, view],
  );



  /** Per-space, per-category item list for the printed report — deliberately
   * ignores the on-screen role filter (a formal report shouldn't omit items
   * just because a particular work role happens to be selected right now),
   * but still respects the re-inspection round scoping like `groups` does. */
  const reportSpaces = useMemo<ReportSpace[]>(() => {
    return checklist.spaces
      .map((sp) => {
        const categories = checklist
          .categoriesFor(sp.id)
          .map((cat) => {
            let items = cat.items.filter((i) => !i.hidden);
            if (currentRound > 1) {
              items = items.filter((i) => spaces[sp.name]?.items[i.id]);
            }
            return { id: cat.id, name: cat.name, items: items.map((i) => ({ id: i.id, title: i.title })) };
          })
          .filter((cat) => cat.items.length > 0);
        return { id: sp.id, name: sp.name, categories };
      })
      .filter((sp) => sp.categories.length > 0);
  }, [checklist, currentRound, spaces]);

  const stateOf = (spaceName: string, itemId: string) => spaces[spaceName]?.items[itemId];
  // A carried-over item has a row (status "pending") the moment a round
  // starts, so "has a row" alone no longer means "已檢驗" — it must also not
  // still be sitting at "pending" (round 1 items never get that status).
  const isChecked = (spaceName: string, itemId: string) => {
    const st = stateOf(spaceName, itemId);
    return !!st && st.status !== "pending";
  };
  const countOf = (entries: CatGroup["entries"]) => {
    let total = 0;
    let done = 0;
    let defects = 0;
    for (const e of entries)
      for (const i of e.items) {
        total += 1;
        if (isChecked(e.space.name, i.id)) done += 1;
        if (stateOf(e.space.name, i.id)?.status === "defect") defects += 1;
      }
    return { total, done, defects };
  };

  const overall = useMemo(() => countOf(groups.flatMap((g) => g.entries)), [groups, spaces]);
  const allDefects = spaceNames.reduce((n, s) => n + defectCount(spaces[s]), 0);

  const query = search.trim().toLowerCase();
  const searchGroups = query
    ? groups
        .map((g) => ({
          ...g,
          entries: g.entries
            .map((e) => ({ ...e, items: e.items.filter((i) => i.title.toLowerCase().includes(query)) }))
            .filter((e) => e.items.length > 0),
        }))
        .filter((g) => g.entries.length > 0)
    : [];

  // A role switch can hide the open category/module → fall back to the directory.
  useEffect(() => {
    if (view.page === "items" && view.cat && view.cat !== "all" && !groups.some((g) => g.name === view.cat)) {
      setView({ page: "dir" });
    }
    if (view.page === "module" && !spatialCards.some((c) => c.kind === view.mod)) setView({ page: "dir" });
  }, [groups, spatialCards, view]);

  const openEntries = useMemo(() => {
    if (view.page !== "items") return [];
    const src = view.cat === "all" ? groups.flatMap((g) => g.entries) : (groups.find((g) => g.name === view.cat)?.entries ?? []);
    // Group by space, preserving space order.
    const bySpace = new Map<string, { space: SpaceDef; items: ItemDef[] }>();
    for (const sp of checklist.spaces) {
      const items = src.filter((e) => e.space.id === sp.id).flatMap((e) => e.items);
      if (items.length) bySpace.set(sp.id, { space: sp, items });
    }
    return [...bySpace.values()];
  }, [checklist.spaces, groups, view]);

  const passStatus = (spaceName: string, id: string) => {
    const st = stateOf(spaceName, id);
    if (statusFilter === "all") return true;
    if (statusFilter === "pending") return !st || st.status === "pending";
    if (statusFilter === "pass") return st?.status === "pass";
    if (statusFilter === "na") return st?.status === "na";
    return st?.status === "defect";
  };

  const batchPass = (spaceName: string, items: ItemDef[]) => {
    for (const i of items) if (!isChecked(spaceName, i.id)) setItem(i.id, { status: "pass" }, spaceName);
  };

  // Structural edits can move or remove recorded data → refresh inspection state.
  const withReload =
    <A extends unknown[]>(fn: (...args: A) => Promise<void> | void) =>
    async (...args: A) => {
      await fn(...args);
      await reloadInspection();
    };

  const done = overall.done >= overall.total && overall.total > 0;

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 pt-3">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
            {view.page === "dir" ? (
              <Link
                to="/project/$projectId"
                params={{ projectId }}
                aria-label="返回案場總覽"
                className="grid h-10 w-10 place-items-center rounded-lg border border-border"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            ) : (
              <button
                type="button"
                aria-label="返回分類目錄"
                onClick={() => setView({ page: "dir" })}
                className="grid h-10 w-10 place-items-center rounded-lg border border-border"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 shrink-0 text-primary" />
                <h1 className="truncate font-display text-lg font-bold tracking-tight">
                  {view.page === "items"
                    ? (view.cat === "all" ? "全部項目" : view.cat)
                    : view.page === "module"
                      ? (openModule?.name ?? "空間模組")
                      : (project?.name ?? "載入中…")}
                </h1>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center rounded-full bg-recheck-soft px-2 py-0.5 font-bold text-recheck">
                  {roundLabel(currentRound)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {project?.client_name || "—"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {project?.inspection_date || "未排定"}
                </span>
                <span className="inline-flex items-center gap-1">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Cloud className="h-3.5 w-3.5" />}
                  {saving ? "儲存中" : "已同步"}
                </span>
              </div>
            </div>
            <div className="shrink-0 rounded-lg bg-muted px-3 py-2 text-center">
              <p className="field-label">全案缺失</p>
              <p className="font-display text-lg font-bold text-defect">{allDefects}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 py-3">
            <div
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold",
                done ? "bg-pass-soft text-pass" : "bg-muted text-muted-foreground",
              )}
            >
              {done ? (
                <>
                  <CheckSquare className="h-4 w-4 shrink-0" />
                  完成檢驗，目前為修改模式
                </>
              ) : (
                <>
                  <ClipboardList className="h-4 w-4 shrink-0" />
                  尚有 {Math.max(overall.total - overall.done, 0)} 項未檢驗
                </>
              )}
            </div>
            <button
              type="button"
              aria-label="搜尋檢驗項目"
              onClick={() => {
                setSearchOpen((v) => !v);
                setSearch("");
              }}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>

          {searchOpen && (
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋所有空間與分類中的檢驗項目"
              className="mb-3 h-11 w-full rounded-lg border border-input bg-surface px-3 text-[15px] outline-none focus:border-ring"
            />
          )}

          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-3">
            {[ALL_ROLES, ...ROLE_OPTIONS].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                aria-pressed={roleFilter === r}
                className={cn(
                  "h-9 shrink-0 rounded-lg border px-4 text-[13px] font-bold transition-colors",
                  roleFilter === r
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-surface text-muted-foreground hover:bg-muted",
                )}
              >
                {r}
              </button>
            ))}
          </div>

          {view.page !== "module" && !query && (
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-3">
              {(
                [
                  ["all", "全部", ClipboardList],
                  ["pending", "未檢驗", Clock],
                  ["pass", "無異常", CheckSquare],
                  ["defect", "缺失補驗", TriangleAlert],
                  ["na", "不適用", CircleSlash],
                ] as const
              ).map(([key, label, Icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  aria-pressed={statusFilter === key}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[13px] font-bold transition-colors",
                    statusFilter === key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-4">
        {saveError && (
          <div className="flex items-start justify-between gap-3 rounded-2xl border border-defect/30 bg-defect-soft p-4 text-sm text-defect">
            <span>{saveError}</span>
            <button type="button" onClick={clearSaveError} className="shrink-0 font-bold underline">
              關閉
            </button>
          </div>
        )}
        {(loading || checklist.loading) && (
          <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
            載入現場紀錄中…
          </p>
        )}

        {/* ---------- Search results (any page) ---------- */}
        {query && (
          <div className="space-y-4">
            {searchGroups.map((g) => (
              <section key={g.name} className="rounded-2xl border border-border bg-surface p-3 shadow-card">
                <h2 className="mb-3 px-1 font-display text-base font-bold tracking-tight">{g.name}</h2>
                <div className="space-y-4">
                  {g.entries.map((e) => (
                    <div key={e.cat.id} className="space-y-2">
                      <p className="px-1 text-xs font-bold text-muted-foreground">{e.space.name}</p>
                      {e.items.map((item) => (
                        <ChecklistItem
                          key={item.id}
                          title={item.title}
                          fields={item.fields}
                          stamp={inspectedBy[`${e.space.name}:${item.id}`]}
                          state={stateOf(e.space.name, item.id) ?? blankItem()}
                          onChange={(patch) => setItem(item.id, patch, e.space.name)}
                          onAddPhotos={(files) => void addPhotos(item.id, files, e.space.name)}
                          onRemovePhoto={(photo) => void removePhoto(item.id, photo, e.space.name)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            ))}
            {searchGroups.length === 0 && (
              <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
                查無符合「{search}」的檢驗項目。
              </p>
            )}
          </div>
        )}

        {/* ---------- Page 3: category directory ---------- */}
        {!query && view.page === "dir" && (
          <div className="space-y-2">
            <CategoryCard
              name="全部項目"
              done={overall.done}
              total={overall.total}
              defects={allDefects}
              onClick={() => setView({ page: "items", cat: "all" })}
            />
            {groups.map((g) => {
              const c = countOf(g.entries);
              return (
                <CategoryCard
                  key={g.name}
                  name={g.name}
                  done={c.done}
                  total={c.total}
                  defects={c.defects}
                  onClick={() => setView({ page: "items", cat: g.name })}
                />
              );
            })}
            {spatialCards.map((c) => (
              <CategoryCard
                key={c.kind}
                name={c.name}
                done={c.entries.length}
                total={c.entries.length}
                onClick={() => setView({ page: "module", mod: c.kind })}
              />
            ))}
            {groups.length === 0 && spatialCards.length === 0 && !checklist.loading && (
              <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
                目前沒有符合「{roleFilter}」的檢驗分類。
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSpaceMgrOpen(true)}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold"
              >
                <LayoutGrid className="h-4 w-4 text-primary" />
                空間管理
              </button>
              <button
                type="button"
                onClick={() => setItemMgrOpen(true)}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold"
              >
                <ListChecks className="h-4 w-4 text-primary" />
                檢驗項目管理
              </button>
            </div>
          </div>
        )}

        {/* ---------- Page 4: room-grouped checklist ---------- */}
        {!query &&
          view.page === "items" &&
          openEntries.map(({ space, items }) => {
            const shown = items.filter((i) => passStatus(space.name, i.id));
            const doneCount = items.filter((i) => isChecked(space.name, i.id)).length;
            return (
              <section key={space.id} className="rounded-2xl border border-border bg-surface p-3 shadow-card">
                <div className="mb-3 flex items-center justify-between gap-3 px-1">
                  <h2 className="inline-flex min-w-0 items-center gap-2 font-display text-base font-bold tracking-tight">
                    <span
                      className={cn(
                        "h-2.5 w-2.5 shrink-0 rounded-full",
                        doneCount >= items.length ? "bg-pass" : "bg-muted-foreground",
                      )}
                    />
                    <span className="truncate">{space.name}</span>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-muted-foreground">
                      {doneCount}/{items.length}
                    </span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => batchPass(space.name, items)}
                    className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-border px-3 text-[13px] font-bold text-primary"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    批次
                  </button>
                </div>
                <div className="space-y-2">
                  {shown.map((item) => (
                    <ChecklistItem
                      key={item.id}
                      title={item.title}
                      fields={item.fields}
                      stamp={inspectedBy[`${space.name}:${item.id}`]}
                      state={stateOf(space.name, item.id) ?? blankItem()}
                      onChange={(patch) => setItem(item.id, patch, space.name)}
                      onAddPhotos={(files) => void addPhotos(item.id, files, space.name)}
                      onRemovePhoto={(photo) => void removePhoto(item.id, photo, space.name)}
                    />
                  ))}
                  {shown.length === 0 && (
                    <p className="p-3 text-sm text-muted-foreground">此空間沒有符合目前狀態篩選的項目。</p>
                  )}
                </div>
              </section>
            );
          })}

        {!query && view.page === "items" && openEntries.length === 0 && (
          <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
            此分類目前沒有可檢驗的項目。
          </p>
        )}

        {/* ---------- Page 4: spatial module, grouped by room ---------- */}
        {!query && view.page === "module" && openModule && (
          <>
            {openModule.entries.map(({ space, settings: s }) => (
                <section key={space.id} className="rounded-2xl border border-border bg-surface p-3 shadow-card">
                  <h2 className="mb-3 inline-flex items-center gap-2 px-1 font-display text-base font-bold tracking-tight">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    {space.name}
                  </h2>
                  <SpaceModulePanel
                    projectId={projectId}
                    spaceName={space.name}
                    settings={s}
                    kind={openModule.kind === "dim" ? "dim" : "win"}
                  />
                </section>
              ))}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSpaceMgrOpen(true)}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold"
              >
                <LayoutGrid className="h-4 w-4 text-primary" />
                空間管理
              </button>
            </div>
          </>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 shadow-bar backdrop-blur">
        <div className="mx-auto grid max-w-4xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <div className="flex min-w-0 gap-4">
            <Stat label="項目" value={overall.total} />
            <Stat label="已檢驗" value={overall.done} tone="pass" />
            <Stat label="缺失" value={overall.defects} tone="defect" />
          </div>
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
          >
            <FileText className="h-4 w-4" />
            產出報告
          </button>
        </div>
      </div>

      <SpaceManager
        open={spaceMgrOpen}
        onOpenChange={setSpaceMgrOpen}
        spaces={checklist.spaces}
        onAdd={checklist.addSpace}
        onRename={withReload((s: SpaceDef, name: string) => checklist.renameSpace(s, name))}
        onDelete={withReload((s: SpaceDef) => checklist.deleteSpace(s))}
        onMove={checklist.moveSpace}
        onDuplicate={withReload((s: SpaceDef, name: string) => checklist.duplicateSpace(s, name))}
        onSettings={checklist.updateSpaceSettings}
      />

      <ChecklistManager
        open={itemMgrOpen}
        onOpenChange={setItemMgrOpen}
        spaceName={activeSpace}
        categories={spaceCategories}
        library={templateLibrary}
        onAddFromTemplate={withReload((catName: string, item: { title: string; roles?: InspectRole[]; fields?: ItemField[] }, catRoles?: InspectRole[]) =>
          checklist.addFromTemplate(activeSpaceDef?.id ?? "", catName, item, catRoles, currentRound)
        )}
        onAddCategory={(name: string) => checklist.addCategory(activeSpaceDef?.id ?? "", name)}
        onRenameCategory={checklist.renameCategory}
        onDeleteCategory={withReload((id: string) => checklist.deleteCategory(id))}
        onMoveCategory={(id: string, dir: -1 | 1) => checklist.moveCategory(activeSpaceDef?.id ?? "", id, dir)}
        onAddItem={withReload((categoryId: string, title: string) =>
          checklist.addItem(activeSpaceDef?.id ?? "", categoryId, title, currentRound)
        )}
        onUpdateItem={checklist.updateItem}
        onSetCategoryRoles={checklist.setCategoryRoles}
        onDeleteItem={withReload((id: string) => checklist.deleteItem(id))}
        onMoveItem={(categoryId: string, id: string, dir: -1 | 1) =>
          checklist.moveItem(activeSpaceDef?.id ?? "", categoryId, id, dir)
        }
      />

      <ReportPreview
        open={reportOpen}
        onOpenChange={setReportOpen}
        projectId={projectId}
        project={project?.name ?? ""}
        customer={project?.client_name ?? ""}
        clientPhone={project?.client_phone}
        address={project?.address}
        unit={project?.unit}
        developer={project?.developer}
        layout={project?.layout}
        totalPing={project?.total_ping}
        date={project?.inspection_date ?? ""}
        round={currentRound}
        spaces={spaces}
        reportSpaces={reportSpaces}
      />
    </div>
  );
}

function CategoryCard({
  name,
  done,
  total,
  defects = 0,
  onClick,
}: {
  name: string;
  done: number;
  total: number;
  defects?: number;
  onClick: () => void;
}) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-border bg-surface p-4 text-left shadow-card transition-colors hover:bg-muted/50"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate font-display text-base font-bold tracking-tight">{name}</span>
        <span className="shrink-0 text-sm font-bold tabular-nums text-muted-foreground">
          {done} / {total}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", defects ? "bg-defect" : "bg-pass")}
          style={{ width: `${pct}%` }}
        />
      </div>
      {defects > 0 && <p className="mt-2 text-xs font-bold text-defect">{defects} 項缺失</p>}
    </button>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "pass" | "defect" }) {
  return (
    <div className="min-w-0">
      <p className="field-label">{label}</p>
      <p
        className={cn(
          "font-display text-xl font-bold leading-tight",
          tone === "pass" && "text-pass",
          tone === "defect" && "text-defect",
        )}
      >
        {value}
      </p>
    </div>
  );
}
