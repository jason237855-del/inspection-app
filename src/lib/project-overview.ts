import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { InspectRole } from "./roles";

export const FILE_BUCKET = "project-files";

export type ProjectRow = {
  id: string;
  name: string;
  status: string;
  client_name: string;
  client_phone: string;
  address: string;
  inspection_date: string | null;
  inspection_time: string;
  property_type: string;
  total_ping: number | null;
  notes: string;
  builder_notes: string;
  notes_important: boolean;
  inspection_package: string;
  unit: string;
  developer: string;
  vehicle: string;
  video_pre_url: string;
  video_post_url: string;
  assigned_inspector: string | null;
  team_members: string[];
};

export type FileRow = { id: string; name: string; path: string; mime: string; url: string };
export type PanelRow = {
  id: string;
  name: string;
  amperage: string;
  wire_spec: string;
  circuits: number | null;
  note: string;
};
export type SignatureRow = { kind: string; signer_name: string; data_url: string; signed_at: string };
export type StaffRow = { user_id: string; name: string; email: string; role: InspectRole | string; lead: boolean };
export type Metrics = { pending: number; pass: number; defect: number; na: number; total: number };
export type WindowCount = { space: string; count: number };

const PROJECT_COLUMNS =
  "id, name, status, client_name, client_phone, address, inspection_date, inspection_time, property_type, total_ping, notes, builder_notes, notes_important, inspection_package, unit, developer, vehicle, video_pre_url, video_post_url, assigned_inspector, team_members";

export function useProjectOverview(projectId: string) {
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [panels, setPanels] = useState<PanelRow[]>([]);
  const [signatures, setSignatures] = useState<Record<string, SignatureRow>>({});
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [windows, setWindows] = useState<WindowCount[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({ pending: 0, pass: 0, defect: 0, na: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  const loadFiles = useCallback(async () => {
    const { data } = await supabase
      .from("project_files")
      .select("id, name, path, mime")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    const rows = data ?? [];
    const signed = rows.length
      ? (await supabase.storage.from(FILE_BUCKET).createSignedUrls(rows.map((r) => r.path), 3600)).data ?? []
      : [];
    setFiles(rows.map((r, i) => ({ ...r, url: signed[i]?.signedUrl ?? "" })));
  }, [projectId]);

  const loadPanels = useCallback(async () => {
    const { data } = await supabase
      .from("project_panels")
      .select("id, name, amperage, wire_spec, circuits, note")
      .eq("project_id", projectId)
      .order("sort")
      .order("created_at");
    setPanels((data as PanelRow[]) ?? []);
  }, [projectId]);

  const loadSignatures = useCallback(async () => {
    const { data } = await supabase
      .from("project_signatures")
      .select("kind, signer_name, data_url, signed_at")
      .eq("project_id", projectId);
    setSignatures(Object.fromEntries(((data as SignatureRow[]) ?? []).map((r) => [r.kind, r])));
  }, [projectId]);

  const loadStaff = useCallback(
    async (row: ProjectRow | null) => {
      if (!row) return;
      const ids = [row.assigned_inspector, ...(row.team_members ?? [])].filter(Boolean) as string[];
      const unique = Array.from(new Set(ids));
      if (!unique.length) return setStaff([]);
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").in("id", unique),
        supabase.from("project_staff").select("user_id, role").eq("project_id", projectId),
      ]);
      const roleMap = Object.fromEntries((roles ?? []).map((r) => [r.user_id, r.role]));
      setStaff(
        unique.map((id) => {
          const p = (profiles ?? []).find((x) => x.id === id);
          return {
            user_id: id,
            name: p?.full_name || p?.email || "未命名成員",
            email: p?.email ?? "",
            role: roleMap[id] ?? "業務",
            lead: id === row.assigned_inspector,
          };
        }),
      );
    },
    [projectId],
  );

  const loadMetrics = useCallback(async () => {
    const [{ data: configured }, { data: recorded }] = await Promise.all([
      supabase.from("project_items").select("id").eq("project_id", projectId).eq("hidden", false),
      supabase.from("inspection_items").select("status").eq("project_id", projectId),
    ]);
    const total = configured?.length ?? 0;
    let pass = 0;
    let defect = 0;
    let na = 0;
    for (const r of recorded ?? []) {
      if (r.status === "defect") defect += 1;
      else if (r.status === "na") na += 1;
      else pass += 1;
    }
    setMetrics({ total, pass, defect, na, pending: Math.max(total - pass - defect - na, 0) });
  }, [projectId]);

  const loadWindows = useCallback(async () => {
    const { data } = await supabase.from("space_windows").select("space").eq("project_id", projectId);
    const counts = new Map<string, number>();
    for (const r of data ?? []) counts.set(r.space, (counts.get(r.space) ?? 0) + 1);
    setWindows([...counts].map(([space, count]) => ({ space, count })).sort((a, b) => a.space.localeCompare(b.space)));
  }, [projectId]);

  const loadProject = useCallback(async () => {
    const { data } = await supabase.from("projects").select(PROJECT_COLUMNS).eq("id", projectId).maybeSingle();
    const row = (data as ProjectRow) ?? null;
    setProject(row);
    await loadStaff(row);
    return row;
  }, [loadStaff, projectId]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void Promise.all([loadProject(), loadFiles(), loadPanels(), loadSignatures(), loadMetrics(), loadWindows()]).then(
      () => alive && setLoading(false),
    );
    return () => {
      alive = false;
    };
  }, [loadFiles, loadMetrics, loadPanels, loadProject, loadSignatures, loadWindows]);

  const patchProject = async (patch: Partial<ProjectRow>) => {
    setProject((prev) => (prev ? { ...prev, ...patch } : prev));
    await supabase
      .from("projects")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", projectId);
  };

  const uploadFiles = async (list: File[], kind = "attachment") => {
    for (const file of list) {
      const path = `${projectId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const up = await supabase.storage.from(FILE_BUCKET).upload(path, file);
      if (up.error) continue;
      await supabase
        .from("project_files")
        .insert({ project_id: projectId, kind, name: file.name, path, mime: file.type });
    }
    await loadFiles();
  };

  const removeFile = async (row: FileRow) => {
    setFiles((prev) => prev.filter((f) => f.id !== row.id));
    await supabase.from("project_files").delete().eq("id", row.id);
    await supabase.storage.from(FILE_BUCKET).remove([row.path]);
  };

  const addPanel = async () => {
    await supabase.from("project_panels").insert({ project_id: projectId, sort: panels.length });
    await loadPanels();
  };

  const updatePanel = async (id: string, patch: Partial<PanelRow>) => {
    setPanels((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    await supabase.from("project_panels").update(patch).eq("id", id);
  };

  const removePanel = async (id: string) => {
    setPanels((prev) => prev.filter((p) => p.id !== id));
    await supabase.from("project_panels").delete().eq("id", id);
  };

  const saveSignature = async (kind: string, dataUrl: string, signerName: string) => {
    await supabase
      .from("project_signatures")
      .upsert(
        { project_id: projectId, kind, data_url: dataUrl, signer_name: signerName, signed_at: new Date().toISOString() },
        { onConflict: "project_id,kind" },
      );
    await loadSignatures();
  };

  const setStaffRole = async (userId: string, role: string) => {
    setStaff((prev) => prev.map((s) => (s.user_id === userId ? { ...s, role } : s)));
    await supabase
      .from("project_staff")
      .upsert({ project_id: projectId, user_id: userId, role }, { onConflict: "project_id,user_id" });
  };

  return {
    project,
    files,
    panels,
    signatures,
    staff,
    windows,
    metrics,
    loading,
    patchProject,
    uploadFiles,
    removeFile,
    addPanel,
    updatePanel,
    removePanel,
    saveSignature,
    setStaffRole,
    reloadMetrics: loadMetrics,
  };
}
