import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PanelRecord = {
  id: string;
  name: string;
  amperage: string;
  wire_spec: string;
  note: string;
  sort: number;
};

export type CircuitRecord = {
  id: string;
  panel_id: string;
  poles: number;
  amperage: number;
  wire_spec: string;
  elcb: boolean;
  description: string;
  sort: number;
};

/** Data layer for the distribution-board (電箱) module: panels + their circuits. */
export function usePanels(projectId: string) {
  const [panels, setPanels] = useState<PanelRecord[]>([]);
  const [circuits, setCircuits] = useState<CircuitRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase
        .from("project_panels")
        .select("id, name, amperage, wire_spec, note, sort")
        .eq("project_id", projectId)
        .order("sort")
        .order("created_at"),
      supabase
        .from("panel_circuits")
        .select("id, panel_id, poles, amperage, wire_spec, elcb, description, sort")
        .eq("project_id", projectId)
        .order("sort")
        .order("created_at"),
    ]);
    setPanels((p as PanelRecord[]) ?? []);
    setCircuits((c as CircuitRecord[]) ?? []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addPanel = async () => {
    const { data } = await supabase
      .from("project_panels")
      .insert({ project_id: projectId, name: `電箱 ${panels.length + 1}`, sort: panels.length })
      .select("id, name, amperage, wire_spec, note, sort")
      .maybeSingle();
    if (data) setPanels((prev) => [...prev, data as PanelRecord]);
    return (data as PanelRecord | null)?.id ?? null;
  };

  const updatePanel = async (id: string, patch: Partial<PanelRecord>) => {
    setPanels((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    await supabase.from("project_panels").update(patch).eq("id", id);
  };

  const removePanel = async (id: string) => {
    setPanels((prev) => prev.filter((p) => p.id !== id));
    setCircuits((prev) => prev.filter((c) => c.panel_id !== id));
    await supabase.from("project_panels").delete().eq("id", id);
  };

  const addCircuit = async (panelId: string, patch: Partial<CircuitRecord> = {}) => {
    const sort = circuits.filter((c) => c.panel_id === panelId).length;
    const { data } = await supabase
      .from("panel_circuits")
      .insert({ project_id: projectId, panel_id: panelId, sort, ...patch })
      .select("id, panel_id, poles, amperage, wire_spec, elcb, description, sort")
      .maybeSingle();
    if (data) setCircuits((prev) => [...prev, data as CircuitRecord]);
    return (data as CircuitRecord | null) ?? null;
  };

  const updateCircuit = async (id: string, patch: Partial<CircuitRecord>) => {
    setCircuits((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    await supabase
      .from("panel_circuits")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
  };

  const removeCircuit = async (id: string) => {
    setCircuits((prev) => prev.filter((c) => c.id !== id));
    await supabase.from("panel_circuits").delete().eq("id", id);
  };

  const reorderCircuits = async (panelId: string, ids: string[]) => {
    setCircuits((prev) => {
      const map = new Map(prev.map((c) => [c.id, c]));
      const next = prev.filter((c) => c.panel_id !== panelId);
      ids.forEach((id, i) => {
        const row = map.get(id);
        if (row) next.push({ ...row, sort: i });
      });
      return next.sort((a, b) => a.sort - b.sort);
    });
    await Promise.all(
      ids.map((id, i) => supabase.from("panel_circuits").update({ sort: i }).eq("id", id)),
    );
  };

  return {
    panels,
    circuits,
    loading,
    reload: load,
    addPanel,
    updatePanel,
    removePanel,
    addCircuit,
    updateCircuit,
    removeCircuit,
    reorderCircuits,
  };
}
