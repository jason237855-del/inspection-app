import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  blankItem,
  emptySpace,
  type Dimensions,
  type ItemState,
  type Moisture,
  type Photo,
  type SpaceState,
} from "./inspection-store";

const BUCKET = "inspection-photos";

const num = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};
const str = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));

const statusOf = (v: string): ItemState["status"] =>
  v === "defect" ? "defect" : v === "na" ? "na" : v === "pending" ? "pending" : "pass";

const asValues = (v: unknown): Record<string, string> => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  return Object.fromEntries(
    Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, val == null ? "" : String(val)]),
  );
};

export function useProjectInspection(projectId: string, round: number, stamp?: string) {
  const [spaces, setSpaces] = useState<Record<string, SpaceState>>({});
  const [activeSpace, setActiveSpace] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const stampRef = useRef(stamp ?? "");
  stampRef.current = stamp ?? "";
  const [inspectedBy, setInspectedBy] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [items, meas, photos] = await Promise.all([
      supabase.from("inspection_items").select("*").eq("project_id", projectId).eq("round", round),
      supabase.from("space_measurements").select("*").eq("project_id", projectId),
      supabase.from("inspection_photos").select("*").eq("project_id", projectId).eq("round", round),
    ]);

    const next: Record<string, SpaceState> = {};
    const space = (name: string) => (next[name] ??= emptySpace());

    const stamps: Record<string, string> = {};
    for (const row of items.data ?? []) {
      const by = (row as { inspected_by?: string }).inspected_by ?? "";
      if (by) stamps[`${row.space}:${row.item_key}`] = by;
      space(row.space).items[row.item_key] = {
        status: statusOf(row.status),
        note: row.note ?? "",
        photos: [],
        values: asValues((row as { values?: unknown }).values),
        carriedNote: (row as { carried_note?: string | null }).carried_note ?? undefined,
      };
    }
    for (const row of meas.data ?? []) {
      const s = space(row.space);
      s.dimensions = { length: str(row.length_cm), width: str(row.width_cm), height: str(row.height_cm) };
      s.moisture = { left: str(row.moisture_left), right: str(row.moisture_right) };
    }

    // window photos are handled separately by useSpaceWindows
    const rows = (photos.data ?? []).filter((r) => !r.item_key.startsWith("window:") && !r.item_key.startsWith("dim:"));
    const signed = rows.length
      ? (await supabase.storage.from(BUCKET).createSignedUrls(rows.map((r) => r.path), 3600)).data ?? []
      : [];
    rows.forEach((row, i) => {
      const s = space(row.space);
      const item = (s.items[row.item_key] ??= blankItem());
      item.photos = [
        ...item.photos,
        { id: row.id, url: signed[i]?.signedUrl ?? "", name: row.name, path: row.path },
      ];
    });

    setSpaces(next);
    setInspectedBy(stamps);
    setLoading(false);
  }, [projectId, round]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  // Multiple inspectors work on the same project from separate devices: apply
  // remote row changes without clobbering fields the local user is editing.
  useEffect(() => {
    const channel = supabase
      .channel(`inspection:${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inspection_items", filter: `project_id=eq.${projectId}` },
        (payload) => {
          const row = (payload.eventType === "DELETE" ? payload.old : payload.new) as
            | { space?: string; item_key?: string; status?: string; note?: string; inspected_by?: string; round?: number }
            | undefined;
          if (!row?.space || !row.item_key) return;
          if ((row.round ?? 1) !== round) return; // change belongs to a different re-inspection round
          const key = `${row.space}:${row.item_key}`;
          if (timers.current[key]) return; // a local edit is still pending for this item
          if (payload.eventType === "DELETE") {
            setSpaces((prev) => {
              const current = prev[row.space!];
              if (!current) return prev;
              const items = { ...current.items };
              delete items[row.item_key!];
              return { ...prev, [row.space!]: { ...current, items } };
            });
            return;
          }
          setSpaces((prev) => {
            const current = prev[row.space!] ?? emptySpace();
            const existing = current.items[row.item_key!] ?? blankItem();
            return {
              ...prev,
              [row.space!]: {
                ...current,
                items: {
                  ...current.items,
                  [row.item_key!]: {
                    ...existing,
                    status: statusOf(row.status ?? ""),
                    note: row.note ?? "",
                    values: asValues((row as { values?: unknown }).values),
                  },
                },
              },
            };
          });
          setInspectedBy((prev) => ({ ...prev, [key]: row.inspected_by ?? "" }));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, round]);

  const spaceState = useCallback((name: string) => spaces[name] ?? emptySpace(), [spaces]);

  const patchLocal = useCallback((name: string, fn: (s: SpaceState) => SpaceState) => {
    setSpaces((prev) => ({ ...prev, [name]: fn(prev[name] ?? emptySpace()) }));
  }, []);

  const saveItem = useCallback(
    async (space: string, itemId: string, state: ItemState) => {
      setSaving(true);
      const { error } = await supabase.from("inspection_items").upsert(
        {
          project_id: projectId,
          space,
          item_key: itemId,
          round,
          status: state.status,
          note: state.note,
          values: state.values ?? {},
          inspected_by: stampRef.current,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "project_id,space,item_key,round" },
      );
      if (error) {
        setSaveError(`儲存失敗，請重新整理頁面後再試一次（${error.message}）`);
      } else {
        setSaveError("");
        if (stampRef.current) {
          setInspectedBy((prev) => ({ ...prev, [`${space}:${itemId}`]: stampRef.current }));
        }
      }
      setSaving(false);
    },
    [projectId, round],
  );

  const setItem = useCallback(
    (itemId: string, patch: Partial<ItemState>, inSpace?: string) => {
      const space = inSpace || activeSpace;

      setSpaces((prev) => {
        const current = prev[space] ?? emptySpace();
        const nextItem = { ...(current.items[itemId] ?? blankItem()), ...patch };
        const key = `${space}:${itemId}`;
        clearTimeout(timers.current[key]);
        timers.current[key] = setTimeout(() => {
          delete timers.current[key];
          void saveItem(space, itemId, nextItem);
        }, 400);
        return { ...prev, [space]: { ...current, items: { ...current.items, [itemId]: nextItem } } };
      });
    },
    [activeSpace, saveItem],
  );

  const saveMeasurement = useCallback(
    async (space: string, dimensions: Dimensions, moisture: Moisture) => {
      setSaving(true);
      const { error } = await supabase.from("space_measurements").upsert(
        {
          project_id: projectId,
          space,
          length_cm: num(dimensions.length),
          width_cm: num(dimensions.width),
          height_cm: num(dimensions.height),
          moisture_left: num(moisture.left),
          moisture_right: num(moisture.right),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "project_id,space" },
      );
      setSaveError(error ? `儲存失敗，請重新整理頁面後再試一次（${error.message}）` : "");
      setSaving(false);
    },
    [projectId],
  );

  const queueMeasurement = useCallback(
    (space: string, next: SpaceState) => {
      const key = `${space}:measure`;
      clearTimeout(timers.current[key]);
      timers.current[key] = setTimeout(
        () => void saveMeasurement(space, next.dimensions, next.moisture),
        400,
      );
    },
    [saveMeasurement],
  );

  const setDimensions = useCallback(
    (patch: Partial<Dimensions>) => {
      const space = activeSpace;
      setSpaces((prev) => {
        const base = prev[space] ?? emptySpace();
        const next = { ...base, dimensions: { ...base.dimensions, ...patch } };
        queueMeasurement(space, next);
        return { ...prev, [space]: next };
      });
    },
    [activeSpace, queueMeasurement],
  );

  const setMoisture = useCallback(
    (patch: Partial<Moisture>) => {
      const space = activeSpace;
      setSpaces((prev) => {
        const base = prev[space] ?? emptySpace();
        const next = { ...base, moisture: { ...base.moisture, ...patch } };
        queueMeasurement(space, next);
        return { ...prev, [space]: next };
      });
    },
    [activeSpace, queueMeasurement],
  );

  const addPhotos = useCallback(
    async (itemId: string, files: File[], inSpace?: string) => {
      const space = inSpace || activeSpace;
      setSaving(true);
      const added: Photo[] = [];
      let failed = 0;
      for (const file of files) {
        const path = `${projectId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const up = await supabase.storage.from(BUCKET).upload(path, file);
        if (up.error) {
          failed += 1;
          continue;
        }
        const { data, error } = await supabase
          .from("inspection_photos")
          .insert({ project_id: projectId, space, item_key: itemId, round, name: file.name, path })
          .select()
          .single();
        if (error) {
          failed += 1;
          continue;
        }
        const signed = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
        added.push({
          id: data?.id ?? path,
          url: signed.data?.signedUrl ?? URL.createObjectURL(file),
          name: file.name,
          path,
        });
      }
      setSaveError(failed > 0 ? `有 ${failed} 張照片上傳失敗，請重新整理頁面後再試一次` : "");
      patchLocal(space, (s) => ({
        ...s,
        items: {
          ...s.items,
          [itemId]: {
            ...(s.items[itemId] ?? blankItem()),
            photos: [...(s.items[itemId]?.photos ?? []), ...added],
          },
        },
      }));
      setSaving(false);
    },
    [activeSpace, patchLocal, projectId, round],
  );

  const removePhoto = useCallback(
    async (itemId: string, photo: Photo, inSpace?: string) => {
      const space = inSpace || activeSpace;
      patchLocal(space, (s) => ({
        ...s,
        items: {
          ...s.items,
          [itemId]: {
            ...(s.items[itemId] ?? blankItem()),
            photos: (s.items[itemId]?.photos ?? []).filter((p) => p.id !== photo.id),
          },
        },
      }));
      await supabase.from("inspection_photos").delete().eq("id", photo.id);
      if (photo.path) await supabase.storage.from(BUCKET).remove([photo.path]);
    },
    [activeSpace, patchLocal],
  );

  return {
    spaces,
    spaceState,
    current: spaces[activeSpace] ?? emptySpace(),
    activeSpace,
    setActiveSpace,
    setItem,
    setDimensions,
    setMoisture,
    addPhotos,
    removePhoto,
    inspectedBy,
    reloadInspection: load,
    saveError,
    clearSaveError: () => setSaveError(""),
    loading,
    saving,
  };
}
