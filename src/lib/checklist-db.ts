import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { asFields, type ItemField } from "./item-fields";
import { asRoles, type InspectRole } from "./roles";

export type SpaceSettings = {
  show_brief: boolean;
  show_dimensions: boolean;
  dim_length: boolean;
  dim_width: boolean;
  dim_height: boolean;
  brief_roles: InspectRole[];
  dim_roles: InspectRole[];
  window_roles: InspectRole[];
};
export type SpaceDef = { id: string; name: string; sort: number } & Partial<SpaceSettings>;

export const spaceSettings = (s: SpaceDef | null | undefined): SpaceSettings => ({
  show_brief: s?.show_brief ?? false,
  show_dimensions: s?.show_dimensions ?? true,
  dim_length: s?.dim_length ?? true,
  dim_width: s?.dim_width ?? true,
  dim_height: s?.dim_height ?? true,
  brief_roles: asRoles(s?.brief_roles ?? ["業務"]),
  dim_roles: asRoles(s?.dim_roles ?? ["業務"]),
  window_roles: asRoles(s?.window_roles ?? ["水電"]),
});
export type ItemDef = {
  id: string;
  category_id: string;
  space_id: string;
  title: string;
  sort: number;
  hidden: boolean;
  roles: InspectRole[];
  /** Optional input blocks rendered on site (photo/note/dim/moisture). */
  fields: ItemField[];
  /** Template only: applicable space names. Empty = all spaces. */
  spaces?: string[];
};
export type CatDef = {
  id: string;
  space_id: string;
  name: string;
  sort: number;
  roles: InspectRole[];
  /** Template only: applicable space names. Empty = all spaces. */
  spaces?: string[];
  items: ItemDef[];
};

export const asSpaceTags = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "") : [];

/** Empty tag list = 通用於所有空間. */
export const appliesToSpace = (tags: string[] | undefined, spaceName: string) =>
  !tags || tags.length === 0 || tags.includes(spaceName);


const bySort = <T extends { sort: number }>(a: T, b: T) => a.sort - b.sort;

export type TemplateSet = { id: string; name: string; description: string; sort: number };

/** Which named checklist template a project was created with. */
async function projectTemplateSet(projectId: string): Promise<string | null> {
  const { data } = await supabase.from("projects").select("template_set_id").eq("id", projectId).maybeSingle();
  return data?.template_set_id ?? null;
}

/** Copy the selected template's categories/items that apply to this space. */
async function seedSpaceFromTemplate(
  projectId: string,
  spaceId: string,
  spaceName: string,
  setId?: string | null,
) {
  const set = setId === undefined ? await projectTemplateSet(projectId) : setId;
  const catQuery = supabase.from("template_categories").select("*").order("sort");
  const [tCats, tItems] = await Promise.all([
    set ? catQuery.eq("set_id", set) : catQuery.is("set_id", null),
    supabase.from("template_items").select("*").order("sort"),
  ]);
  const allItems = (tItems.data ?? []).filter((i) =>
    appliesToSpace(asSpaceTags((i as { spaces?: unknown }).spaces), spaceName),
  );
  const cats = (tCats.data ?? []).filter(
    (c) =>
      appliesToSpace(asSpaceTags((c as { spaces?: unknown }).spaces), spaceName) &&
      allItems.some((i) => i.category_id === c.id),
  );
  if (!cats.length) return;

  const { data: inserted } = await supabase
    .from("project_categories")
    .insert(
      cats.map((c) => ({
        project_id: projectId,
        space_id: spaceId,
        name: c.name,
        sort: c.sort,
        roles: asRoles(c.roles),
      })),
    )
    .select("id, name");

  const byName = new Map((inserted ?? []).map((c) => [c.name, c.id]));
  const map = new Map<string, string>();
  for (const c of cats) {
    const id = byName.get(c.name);
    if (id) map.set(c.id, id);
  }
  const itemRows = allItems
    .filter((i) => map.has(i.category_id))
    .map((i) => ({
      project_id: projectId,
      space_id: spaceId,
      category_id: map.get(i.category_id)!,
      title: i.title,
      sort: i.sort,
      roles: asRoles(i.roles),
      fields: asFields((i as { fields?: unknown }).fields),
    }));
  if (itemRows.length) await supabase.from("project_items").insert(itemRows);
}


async function seedSpacesFromTemplate(projectId: string, setId: string | null) {
  const q = supabase.from("template_spaces").select("*").order("sort");
  const { data } = await (setId ? q.eq("set_id", setId) : q.is("set_id", null));
  const rows = (data ?? []).map((s) => ({
    project_id: projectId,
    name: s.name,
    sort: s.sort,
    show_brief: s.name.includes("客廳"),
  }));
  if (!rows.length) return;
  await supabase.from("project_spaces").upsert(rows, { onConflict: "project_id,name", ignoreDuplicates: true });
}

export type LibraryItem = { title: string; roles: InspectRole[]; fields: ItemField[] };
export type LibraryCat = { name: string; roles: InspectRole[]; items: LibraryItem[] };

/** All template categories/items of the project's template set, ignoring space tags. */
export function useTemplateLibrary(projectId: string) {
  const [library, setLibrary] = useState<LibraryCat[]>([]);

  useEffect(() => {
    void (async () => {
      const set = await projectTemplateSet(projectId);
      const cq = supabase.from("template_categories").select("*").order("sort");
      const [c, i] = await Promise.all([
        set ? cq.eq("set_id", set) : cq.is("set_id", null),
        supabase.from("template_items").select("*").order("sort"),
      ]);
      setLibrary(
        (c.data ?? []).map((cat) => ({
          name: cat.name,
          roles: asRoles((cat as { roles?: unknown }).roles),
          items: (i.data ?? [])
            .filter((it) => it.category_id === cat.id)
            .map((it) => ({
              title: it.title,
              roles: asRoles((it as { roles?: unknown }).roles),
              fields: asFields((it as { fields?: unknown }).fields),
            })),
        })),
      );
    })();
  }, [projectId]);

  return library;
}


export function useProjectChecklist(projectId: string) {
  const [spaces, setSpaces] = useState<SpaceDef[]>([]);
  const [catsBySpace, setCatsBySpace] = useState<Record<string, CatDef[]>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (allowSeed = true): Promise<void> => {
      const [s, c, i] = await Promise.all([
        supabase.from("project_spaces").select("*").eq("project_id", projectId).order("sort"),
        supabase.from("project_categories").select("*").eq("project_id", projectId).order("sort"),
        supabase.from("project_items").select("*").eq("project_id", projectId).order("sort"),
      ]);

      const spaceRows = ((s.data ?? []) as SpaceDef[]).slice().sort(bySort);
      const catRows = (c.data ?? []).map((cat) => ({
        id: cat.id,
        space_id: cat.space_id,
        name: cat.name,
        sort: cat.sort,
        roles: asRoles((cat as { roles?: unknown }).roles),
      }));
      const itemRows: ItemDef[] = (i.data ?? []).map((it) => ({
        id: it.id,
        category_id: it.category_id,
        space_id: it.space_id,
        title: it.title,
        sort: it.sort,
        hidden: it.hidden,
        roles: asRoles((it as { roles?: unknown }).roles),
        fields: asFields((it as { fields?: unknown }).fields),
      }));

      if (allowSeed && !spaceRows.length) {
        await seedSpacesFromTemplate(projectId, await projectTemplateSet(projectId));
        return load(false);
      }

      // Each space keeps its own independent category/item structure.
      const missing = spaceRows.filter((sp) => !catRows.some((cat) => cat.space_id === sp.id));
      if (allowSeed && missing.length) {
        const set = await projectTemplateSet(projectId);
        for (const sp of missing) await seedSpaceFromTemplate(projectId, sp.id, sp.name, set);
        return load(false);
      }

      const grouped: Record<string, CatDef[]> = {};
      for (const sp of spaceRows) {
        grouped[sp.id] = catRows
          .filter((cat) => cat.space_id === sp.id)
          .slice()
          .sort(bySort)
          .map((cat) => ({ ...cat, items: itemRows.filter((it) => it.category_id === cat.id).sort(bySort) }));
      }

      setSpaces(spaceRows);
      setCatsBySpace(grouped);
      setLoading(false);
    },
    [projectId],
  );

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const categoriesFor = useCallback((spaceId: string) => catsBySpace[spaceId] ?? [], [catsBySpace]);

  /* ---------------- spaces ---------------- */

  const addSpace = useCallback(
    async (name: string) => {
      const clean = name.trim();
      if (!clean) return;
      const { data } = await supabase
        .from("project_spaces")
        .insert({
          project_id: projectId,
          name: clean,
          sort: spaces.length,
          show_brief: clean.includes("客廳"),
        })
        .select("id")
        .single();
      if (data?.id) await seedSpaceFromTemplate(projectId, data.id, clean);
      await load(false);
    },
    [load, projectId, spaces.length],
  );

  /** Per-space module toggles: floor plan/notes, dimensions block and each field. */
  const updateSpaceSettings = useCallback(
    async (spaceId: string, patch: Partial<SpaceSettings>) => {
      setSpaces((prev) => prev.map((s) => (s.id === spaceId ? { ...s, ...patch } : s)));
      await supabase.from("project_spaces").update(patch).eq("id", spaceId);
      await load(false);
    },
    [load],
  );

  const renameSpace = useCallback(
    async (space: SpaceDef, name: string) => {
      const clean = name.trim();
      if (!clean || clean === space.name) return;
      await supabase.from("project_spaces").update({ name: clean }).eq("id", space.id);
      await Promise.all([
        supabase.from("inspection_items").update({ space: clean }).eq("project_id", projectId).eq("space", space.name),
        supabase.from("inspection_photos").update({ space: clean }).eq("project_id", projectId).eq("space", space.name),
        supabase
          .from("space_measurements")
          .update({ space: clean })
          .eq("project_id", projectId)
          .eq("space", space.name),
        supabase.from("space_windows").update({ space: clean }).eq("project_id", projectId).eq("space", space.name),
      ]);
      await load(false);
    },
    [load, projectId],
  );

  const deleteSpace = useCallback(
    async (space: SpaceDef) => {
      await supabase.from("project_spaces").delete().eq("id", space.id);
      await Promise.all([
        supabase.from("inspection_items").delete().eq("project_id", projectId).eq("space", space.name),
        supabase.from("inspection_photos").delete().eq("project_id", projectId).eq("space", space.name),
        supabase.from("space_measurements").delete().eq("project_id", projectId).eq("space", space.name),
        supabase.from("space_windows").delete().eq("project_id", projectId).eq("space", space.name),
      ]);
      await load(false);
    },
    [load, projectId],
  );

  const moveSpace = useCallback(
    async (space: SpaceDef, dir: -1 | 1) => {
      const idx = spaces.findIndex((s) => s.id === space.id);
      const swap = spaces[idx + dir];
      if (!swap) return;
      await Promise.all([
        supabase.from("project_spaces").update({ sort: idx + dir }).eq("id", space.id),
        supabase.from("project_spaces").update({ sort: idx }).eq("id", swap.id),
      ]);
      await load(false);
    },
    [load, spaces],
  );

  /** Copy a space's structure and recorded results into a brand-new space. */
  const duplicateSpace = useCallback(
    async (space: SpaceDef, name: string) => {
      const clean = name.trim();
      if (!clean) return;
      const { data: created, error } = await supabase
        .from("project_spaces")
        .insert({ project_id: projectId, name: clean, sort: spaces.length })
        .select("id")
        .single();
      if (error || !created) return;

      const source = catsBySpace[space.id] ?? [];
      const itemMap = new Map<string, string>();
      for (const cat of source) {
        const { data: newCat } = await supabase
          .from("project_categories")
          .insert({ project_id: projectId, space_id: created.id, name: cat.name, sort: cat.sort, roles: cat.roles })
          .select("id")
          .single();
        if (!newCat) continue;
        if (cat.items.length) {
          const { data: newItems } = await supabase
            .from("project_items")
            .insert(
              cat.items.map((it) => ({
                project_id: projectId,
                space_id: created.id,
                category_id: newCat.id,
                title: it.title,
                sort: it.sort,
                hidden: it.hidden,
                roles: it.roles,
                fields: it.fields,
              })),
            )
            .select("id, title, sort");
          for (const it of cat.items) {
            const match = (newItems ?? []).find((n) => n.title === it.title && n.sort === it.sort);
            if (match) itemMap.set(it.id, match.id);
          }
        }
      }

      const [items, meas] = await Promise.all([
        supabase.from("inspection_items").select("*").eq("project_id", projectId).eq("space", space.name),
        supabase
          .from("space_measurements")
          .select("*")
          .eq("project_id", projectId)
          .eq("space", space.name)
          .maybeSingle(),
      ]);
      const rows = (items.data ?? [])
        .filter((r) => itemMap.has(r.item_key))
        .map((r) => ({
          project_id: projectId,
          space: clean,
          item_key: itemMap.get(r.item_key)!,
          status: r.status,
          note: r.note,
        }));
      if (rows.length) await supabase.from("inspection_items").insert(rows);
      if (meas.data) {
        await supabase.from("space_measurements").insert({
          project_id: projectId,
          space: clean,
          length_cm: meas.data.length_cm,
          width_cm: meas.data.width_cm,
          height_cm: meas.data.height_cm,
        });
      }
      await load(false);
    },
    [catsBySpace, load, projectId, spaces.length],
  );

  /* ---------------- categories & items (scoped to one space) ---------------- */

  const addCategory = useCallback(
    async (spaceId: string, name: string) => {
      const clean = name.trim();
      if (!clean) return;
      await supabase.from("project_categories").insert({
        project_id: projectId,
        space_id: spaceId,
        name: clean,
        sort: (catsBySpace[spaceId] ?? []).length,
      });
      await load(false);
    },
    [catsBySpace, load, projectId],
  );

  const renameCategory = useCallback(
    async (id: string, name: string) => {
      const clean = name.trim();
      if (!clean) return;
      await supabase.from("project_categories").update({ name: clean }).eq("id", id);
      await load(false);
    },
    [load],
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      await supabase.from("project_categories").delete().eq("id", id);
      await load(false);
    },
    [load],
  );

  const moveCategory = useCallback(
    async (spaceId: string, id: string, dir: -1 | 1) => {
      const list = catsBySpace[spaceId] ?? [];
      const idx = list.findIndex((c) => c.id === id);
      const swap = list[idx + dir];
      if (!swap) return;
      await Promise.all([
        supabase.from("project_categories").update({ sort: idx + dir }).eq("id", id),
        supabase.from("project_categories").update({ sort: idx }).eq("id", swap.id),
      ]);
      await load(false);
    },
    [catsBySpace, load],
  );

  const addItem = useCallback(
    async (spaceId: string, categoryId: string, title: string) => {
      const clean = title.trim();
      if (!clean) return;
      const cat = (catsBySpace[spaceId] ?? []).find((c) => c.id === categoryId);
      await supabase.from("project_items").insert({
        project_id: projectId,
        space_id: spaceId,
        category_id: categoryId,
        title: clean,
        sort: cat?.items.length ?? 0,
      });
      await load(false);
    },
    [catsBySpace, load, projectId],
  );

  /** Pull a template item into this space only (creates its category if needed). */
  const addFromTemplate = useCallback(
    async (
      spaceId: string,
      catName: string,
      item: { title: string; roles?: InspectRole[]; fields?: ItemField[] },
      catRoles?: InspectRole[],
    ) => {
      const list = catsBySpace[spaceId] ?? [];
      let cat = list.find((c) => c.name === catName);
      if (!cat) {
        const { data } = await supabase
          .from("project_categories")
          .insert({
            project_id: projectId,
            space_id: spaceId,
            name: catName,
            sort: list.length,
            roles: catRoles ?? [],
          })
          .select("id")
          .single();
        if (!data) return;
        cat = { id: data.id, space_id: spaceId, name: catName, sort: list.length, roles: catRoles ?? [], items: [] };
      }
      await supabase.from("project_items").insert({
        project_id: projectId,
        space_id: spaceId,
        category_id: cat.id,
        title: item.title,
        sort: cat.items.length,
        roles: item.roles ?? [],
        ...(item.fields ? { fields: item.fields } : {}),
      });
      await load(false);
    },
    [catsBySpace, load, projectId],
  );


  const setCategoryRoles = useCallback(
    async (id: string, roles: InspectRole[]) => {
      await supabase.from("project_categories").update({ roles }).eq("id", id);
      await load(false);
    },
    [load],
  );

  const updateItem = useCallback(
    async (id: string, patch: { title?: string; hidden?: boolean; roles?: InspectRole[]; fields?: ItemField[] }) => {
      await supabase.from("project_items").update(patch).eq("id", id);
      await load(false);
    },
    [load],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      await supabase.from("project_items").delete().eq("id", id);
      await supabase.from("inspection_items").delete().eq("project_id", projectId).eq("item_key", id);
      await load(false);
    },
    [load, projectId],
  );

  const moveItem = useCallback(
    async (spaceId: string, categoryId: string, id: string, dir: -1 | 1) => {
      const cat = (catsBySpace[spaceId] ?? []).find((c) => c.id === categoryId);
      if (!cat) return;
      const idx = cat.items.findIndex((i) => i.id === id);
      const swap = cat.items[idx + dir];
      if (!swap) return;
      await Promise.all([
        supabase.from("project_items").update({ sort: idx + dir }).eq("id", id),
        supabase.from("project_items").update({ sort: idx }).eq("id", swap.id),
      ]);
      await load(false);
    },
    [catsBySpace, load],
  );

  return {
    spaces,
    catsBySpace,
    categoriesFor,
    loading,
    reloadChecklist: () => load(false),
    addSpace,
    updateSpaceSettings,
    renameSpace,
    deleteSpace,
    moveSpace,
    duplicateSpace,
    addCategory,
    setCategoryRoles,
    renameCategory,
    deleteCategory,
    moveCategory,
    addItem,
    addFromTemplate,
    updateItem,
    deleteItem,
    moveItem,
  };
}

/* ------------------------------------------------------------------ */
/* Default template (admin-managed)                                    */
/* ------------------------------------------------------------------ */

/** Named checklist templates, e.g. 標準新成屋範本 / 客變複驗範本 / 中古屋範本. */
export function useTemplateSets() {
  const [sets, setSets] = useState<TemplateSet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("template_sets").select("id, name, description, sort").order("sort");
      setSets((data ?? []) as TemplateSet[]);
      setLoading(false);
    })();
  }, []);

  return { sets, loading };
}

export function useTemplateChecklist(setId?: string | null) {
  const [spaces, setSpaces] = useState<SpaceDef[]>([]);
  const [categories, setCategories] = useState<CatDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const sq = supabase.from("template_spaces").select("*").order("sort");
    const cq = supabase.from("template_categories").select("*").order("sort");
    const [s, c, i] = await Promise.all([
      setId ? sq.eq("set_id", setId) : sq,
      setId ? cq.eq("set_id", setId) : cq,
      supabase.from("template_items").select("*").order("sort"),
    ]);
    const items: ItemDef[] = (i.data ?? []).map((it) => ({
      id: it.id,
      category_id: it.category_id,
      space_id: "",
      title: it.title,
      sort: it.sort,
      hidden: false,
      roles: asRoles((it as { roles?: unknown }).roles),
      fields: asFields((it as { fields?: unknown }).fields),
      spaces: asSpaceTags((it as { spaces?: unknown }).spaces),
    }));
    setSpaces(((s.data ?? []) as SpaceDef[]).slice().sort(bySort));
    setCategories(
      (c.data ?? [])
        .map((cat) => ({
          id: cat.id,
          name: cat.name,
          sort: cat.sort,
          roles: asRoles((cat as { roles?: unknown }).roles),
          spaces: asSpaceTags((cat as { spaces?: unknown }).spaces),
        }))
        .sort(bySort)
        .map((cat) => ({
          ...cat,
          space_id: "",
          items: items.filter((it) => it.category_id === cat.id).sort(bySort),
        })),
    );
    setLoading(false);
  }, [setId]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = useCallback(
    async (p: PromiseLike<{ error: { message: string } | null }>) => {
      const { error: err } = await p;
      setError(err?.message ?? "");
      await load();
    },
    [load],
  );

  return {
    spaces,
    categories,
    loading,
    error,
    reload: load,
    addSpace: (name: string) =>
      run(
        supabase
          .from("template_spaces")
          .insert({ name: name.trim(), sort: spaces.length, set_id: setId ?? null }),
      ),
    renameSpace: (id: string, name: string) =>
      run(supabase.from("template_spaces").update({ name: name.trim() }).eq("id", id)),
    deleteSpace: (id: string) => run(supabase.from("template_spaces").delete().eq("id", id)),
    moveSpace: async (id: string, dir: -1 | 1) => {
      const idx = spaces.findIndex((s) => s.id === id);
      const swap = spaces[idx + dir];
      if (!swap) return;
      await supabase.from("template_spaces").update({ sort: idx + dir }).eq("id", id);
      await run(supabase.from("template_spaces").update({ sort: idx }).eq("id", swap.id));
    },
    addCategory: (name: string) =>
      run(
        supabase
          .from("template_categories")
          .insert({ name: name.trim(), sort: categories.length, set_id: setId ?? null }),
      ),
    renameCategory: (id: string, name: string) =>
      run(supabase.from("template_categories").update({ name: name.trim() }).eq("id", id)),
    deleteCategory: (id: string) => run(supabase.from("template_categories").delete().eq("id", id)),
    setCategoryRoles: (id: string, roles: InspectRole[]) =>
      run(supabase.from("template_categories").update({ roles }).eq("id", id)),
    setItemRoles: (id: string, roles: InspectRole[]) =>
      run(supabase.from("template_items").update({ roles }).eq("id", id)),
    setCategorySpaces: (id: string, spaces: string[]) =>
      run(supabase.from("template_categories").update({ spaces }).eq("id", id)),
    setItemFields: (id: string, fields: ItemField[]) =>
      run(supabase.from("template_items").update({ fields }).eq("id", id)),
    setItemSpaces: (id: string, spaces: string[]) =>
      run(supabase.from("template_items").update({ spaces }).eq("id", id)),
    addItem: (categoryId: string, title: string) =>
      run(
        supabase.from("template_items").insert({
          category_id: categoryId,
          title: title.trim(),
          sort: categories.find((c) => c.id === categoryId)?.items.length ?? 0,
        }),
      ),
    renameItem: (id: string, title: string) =>
      run(supabase.from("template_items").update({ title: title.trim() }).eq("id", id)),
    deleteItem: (id: string) => run(supabase.from("template_items").delete().eq("id", id)),
    moveCategory: async (id: string, dir: -1 | 1) => {
      const idx = categories.findIndex((c) => c.id === id);
      const swap = categories[idx + dir];
      if (!swap) return;
      await supabase.from("template_categories").update({ sort: idx + dir }).eq("id", id);
      await run(supabase.from("template_categories").update({ sort: idx }).eq("id", swap.id));
    },
    moveItem: async (categoryId: string, id: string, dir: -1 | 1) => {
      const list = categories.find((c) => c.id === categoryId)?.items ?? [];
      const idx = list.findIndex((i) => i.id === id);
      const swap = list[idx + dir];
      if (!swap) return;
      await supabase.from("template_items").update({ sort: idx + dir }).eq("id", id);
      await run(supabase.from("template_items").update({ sort: idx }).eq("id", swap.id));
    },
  };
}
