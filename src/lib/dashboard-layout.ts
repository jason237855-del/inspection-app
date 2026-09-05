import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DashboardSection = {
  id: string;
  key: string;
  label: string;
  sort: number;
  tab_visible: boolean;
  block_visible: boolean;
};

const TABLE = "dashboard_sections";

/** Shared layout config for the project dashboard (Page 2): order + visibility. */
export function useDashboardLayout() {
  const [sections, setSections] = useState<DashboardSection[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from(TABLE).select("*").order("sort", { ascending: true });
    setSections((data as DashboardSection[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const update = useCallback(async (id: string, patch: Partial<DashboardSection>) => {
    setSections((prev) =>
      [...prev.map((s) => (s.id === id ? { ...s, ...patch } : s))].sort((a, b) => a.sort - b.sort),
    );
    await supabase
      .from(TABLE)
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
  }, []);

  /** Swap sort weights with the neighbour above/below. */
  const move = useCallback(
    async (id: string, dir: -1 | 1) => {
      const ordered = [...sections].sort((a, b) => a.sort - b.sort);
      const i = ordered.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ordered.length) return;
      const a = ordered[i]!;
      const b = ordered[j]!;
      ordered[i] = b;
      ordered[j] = a;
      const renumbered = ordered.map((s, idx) => ({ ...s, sort: idx }));
      setSections(renumbered);
      await Promise.all(
        renumbered.map((s) =>
          supabase.from(TABLE).update({ sort: s.sort, updated_at: new Date().toISOString() }).eq("id", s.id),
        ),
      );
    },
    [sections],
  );

  /** Persist an explicit order (drag & drop result). */
  const reorder = useCallback(async (ids: string[]) => {
    let next: DashboardSection[] = [];
    setSections((prev) => {
      const byId = new Map(prev.map((s) => [s.id, s]));
      next = ids.map((id, idx) => ({ ...byId.get(id)!, sort: idx })).filter(Boolean);
      return next;
    });
    await Promise.all(
      ids.map((id, idx) =>
        supabase.from(TABLE).update({ sort: idx, updated_at: new Date().toISOString() }).eq("id", id),
      ),
    );
    return next;
  }, []);

  return { sections, loading, update, move, reorder, reload: load };
}
