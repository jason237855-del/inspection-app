import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Photo } from "./inspection-store";

const BUCKET = "inspection-photos";

export type WindowRecord = {
  id: string;
  name: string;
  sort: number;
  preLeft: string;
  preRight: string;
  postLeft: string;
  postRight: string;
  note: string;
  photos: Photo[];
};

const str = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));
const num = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

const keyOf = (windowId: string) => `window:${windowId}`;

/** Per-space window moisture records: values, notes and photos. */
export function useSpaceWindows(projectId: string, space: string) {
  const [windows, setWindows] = useState<WindowRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const load = useCallback(async () => {
    if (!space) {
      setWindows([]);
      return;
    }
    const [rows, photos] = await Promise.all([
      supabase
        .from("space_windows")
        .select("*")
        .eq("project_id", projectId)
        .eq("space", space)
        .order("sort"),
      supabase
        .from("inspection_photos")
        .select("*")
        .eq("project_id", projectId)
        .eq("space", space)
        .like("item_key", "window:%"),
    ]);

    const photoRows = photos.data ?? [];
    const signed = photoRows.length
      ? (await supabase.storage.from(BUCKET).createSignedUrls(photoRows.map((p) => p.path), 3600)).data ?? []
      : [];

    setWindows(
      (rows.data ?? []).map((w) => ({
        id: w.id,
        name: w.name,
        sort: w.sort,
        preLeft: str(w.moisture_left),
        preRight: str(w.moisture_right),
        postLeft: str(w.moisture_post_left),
        postRight: str(w.moisture_post_right),
        note: w.note ?? "",
        photos: photoRows
          .map((p, i) => ({ p, url: signed[i]?.signedUrl ?? "" }))
          .filter(({ p }) => p.item_key === keyOf(w.id))
          .map(({ p, url }) => ({ id: p.id, url, name: p.name, path: p.path })),
      })),
    );
  }, [projectId, space]);

  useEffect(() => {
    void load();
  }, [load]);

  const addWindow = useCallback(async () => {
    if (!space) return;
    const sort = windows.length;
    await supabase
      .from("space_windows")
      .insert({ project_id: projectId, space, name: `窗戶 ${sort + 1}`, sort });
    await load();
  }, [load, projectId, space, windows.length]);

  const removeWindow = useCallback(
    async (id: string) => {
      const target = windows.find((w) => w.id === id);
      await supabase.from("space_windows").delete().eq("id", id);
      await supabase
        .from("inspection_photos")
        .delete()
        .eq("project_id", projectId)
        .eq("item_key", keyOf(id));
      const paths = (target?.photos ?? []).map((p) => p.path).filter(Boolean) as string[];
      if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
      await load();
    },
    [load, projectId, windows],
  );

  const updateWindow = useCallback(
    (id: string, patch: Partial<Pick<WindowRecord, "name" | "preLeft" | "preRight" | "postLeft" | "postRight" | "note">>) => {
      setWindows((prev) => {
        const next = prev.map((w) => (w.id === id ? { ...w, ...patch } : w));
        const target = next.find((w) => w.id === id);
        if (target) {
          clearTimeout(timers.current[id]);
          timers.current[id] = setTimeout(() => {
            setSaving(true);
            void supabase
              .from("space_windows")
              .update({
                name: target.name,
                moisture_left: num(target.preLeft),
                moisture_right: num(target.preRight),
                moisture_post_left: num(target.postLeft),
                moisture_post_right: num(target.postRight),
                note: target.note,
                updated_at: new Date().toISOString(),
              })
              .eq("id", id)
              .then(() => setSaving(false));
          }, 400);
        }
        return next;
      });
    },
    [],
  );

  const addPhotos = useCallback(
    async (id: string, files: File[]) => {
      setSaving(true);
      for (const file of files) {
        const path = `${projectId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const up = await supabase.storage.from(BUCKET).upload(path, file);
        if (up.error) continue;
        await supabase
          .from("inspection_photos")
          .insert({ project_id: projectId, space, item_key: keyOf(id), name: file.name, path });
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

  return { windows, saving, addWindow, removeWindow, updateWindow, addPhotos, removePhoto, reloadWindows: load };
}
