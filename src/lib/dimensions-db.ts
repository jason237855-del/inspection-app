import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Photo } from "./inspection-store";

const BUCKET = "inspection-photos";

export type DimensionEntry = {
  id: string;
  name: string;
  sort: number;
  length: string;
  width: string;
  height: string;
  useLength: boolean;
  useWidth: boolean;
  useHeight: boolean;
  note: string;
  photos: Photo[];
};

export type DimensionPatch = Partial<
  Pick<DimensionEntry, "name" | "length" | "width" | "height" | "useLength" | "useWidth" | "useHeight" | "note">
>;

const str = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));
const num = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

export const keyOfDimension = (id: string) => `dim:${id}`;

/** Area of a single entry (needs both length and width enabled + filled). */
export function entryArea(e: DimensionEntry) {
  if (!e.useLength || !e.useWidth) return null;
  const l = parseFloat(e.length);
  const w = parseFloat(e.width);
  if (!l || !w) return null;
  const sqm = (l * w) / 10000;
  return { sqm, ping: sqm * 0.3025 };
}

export function totalArea(entries: DimensionEntry[]) {
  const sqm = entries.reduce((n, e) => n + (entryArea(e)?.sqm ?? 0), 0);
  return { sqm, ping: sqm * 0.3025 };
}

/** Per-space dynamic dimension entries with own toggles, notes and photos. */
export function useSpaceDimensions(projectId: string, space: string) {
  const [entries, setEntries] = useState<DimensionEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const load = useCallback(async () => {
    if (!space) {
      setEntries([]);
      return;
    }
    const [rows, photos] = await Promise.all([
      supabase
        .from("space_dimensions")
        .select("*")
        .eq("project_id", projectId)
        .eq("space", space)
        .order("sort"),
      supabase
        .from("inspection_photos")
        .select("*")
        .eq("project_id", projectId)
        .eq("space", space)
        .like("item_key", "dim:%"),
    ]);

    const photoRows = photos.data ?? [];
    const signed = photoRows.length
      ? (await supabase.storage.from(BUCKET).createSignedUrls(photoRows.map((p) => p.path), 3600)).data ?? []
      : [];

    setEntries(
      (rows.data ?? []).map((d) => ({
        id: d.id,
        name: d.name,
        sort: d.sort,
        length: str(d.length_cm),
        width: str(d.width_cm),
        height: str(d.height_cm),
        useLength: d.use_length,
        useWidth: d.use_width,
        useHeight: d.use_height,
        note: d.note ?? "",
        photos: photoRows
          .map((p, i) => ({ p, url: signed[i]?.signedUrl ?? "" }))
          .filter(({ p }) => p.item_key === keyOfDimension(d.id))
          .map(({ p, url }) => ({ id: p.id, url, name: p.name, path: p.path })),
      })),
    );
  }, [projectId, space]);

  useEffect(() => {
    void load();
  }, [load]);

  const addEntry = useCallback(async () => {
    if (!space) return;
    const sort = entries.length;
    await supabase
      .from("space_dimensions")
      .insert({ project_id: projectId, space, name: `區域 ${sort + 1}`, sort });
    await load();
  }, [entries.length, load, projectId, space]);

  const removeEntry = useCallback(
    async (id: string) => {
      const target = entries.find((e) => e.id === id);
      await supabase.from("space_dimensions").delete().eq("id", id);
      await supabase
        .from("inspection_photos")
        .delete()
        .eq("project_id", projectId)
        .eq("item_key", keyOfDimension(id));
      const paths = (target?.photos ?? []).map((p) => p.path).filter(Boolean) as string[];
      if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
      await load();
    },
    [entries, load, projectId],
  );

  const updateEntry = useCallback((id: string, patch: DimensionPatch) => {
    setEntries((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...patch } : e));
      const target = next.find((e) => e.id === id);
      if (target) {
        clearTimeout(timers.current[id]);
        timers.current[id] = setTimeout(() => {
          setSaving(true);
          void supabase
            .from("space_dimensions")
            .update({
              name: target.name,
              length_cm: num(target.length),
              width_cm: num(target.width),
              height_cm: num(target.height),
              use_length: target.useLength,
              use_width: target.useWidth,
              use_height: target.useHeight,
              note: target.note,
              updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .then(() => setSaving(false));
        }, 400);
      }
      return next;
    });
  }, []);

  const addPhotos = useCallback(
    async (id: string, files: File[]) => {
      setSaving(true);
      for (const file of files) {
        const path = `${projectId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const up = await supabase.storage.from(BUCKET).upload(path, file);
        if (up.error) continue;
        await supabase
          .from("inspection_photos")
          .insert({ project_id: projectId, space, item_key: keyOfDimension(id), name: file.name, path });
      }
      await load();
      setSaving(false);
    },
    [load, projectId, space],
  );

  const removePhoto = useCallback(
    async (photo: Photo) => {
      await supabase.from("inspection_photos").delete().eq("id", photo.id);
      if (photo.path) await supabase.storage.from(BUCKET).remove([photo.path]);
      await load();
    },
    [load],
  );

  return {
    entries,
    saving,
    addEntry,
    removeEntry,
    updateEntry,
    addPhotos,
    removePhoto,
    reloadDimensions: load,
  };
}
