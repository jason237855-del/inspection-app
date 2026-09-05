import { useCallback, useEffect, useRef, useState } from "react";
import {
  Cloud,
  FileText,
  Image as ImageIcon,
  Loader2,
  Minus,
  NotebookPen,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "project-files";

type FileRow = { id: string; name: string; path: string; mime: string; url: string };

export function ProjectBrief({ projectId, initialNotes }: { projectId: string; initialNotes: string }) {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewer, setViewer] = useState<FileRow | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dirty = useRef(false);

  useEffect(() => {
    if (!dirty.current) setNotes(initialNotes);
  }, [initialNotes]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("project_files")
      .select("id, name, path, mime")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    const rows = data ?? [];
    const signed = rows.length
      ? (await supabase.storage.from(BUCKET).createSignedUrls(rows.map((r) => r.path), 3600)).data ?? []
      : [];
    setFiles(rows.map((r, i) => ({ ...r, url: signed[i]?.signedUrl ?? "" })));
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = async (list: FileList | null) => {
    if (!list?.length) return;
    setUploading(true);
    for (const file of Array.from(list)) {
      const path = `${projectId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const up = await supabase.storage.from(BUCKET).upload(path, file);
      if (up.error) continue;
      await supabase.from("project_files").insert({
        project_id: projectId,
        kind: "floor_plan",
        name: file.name,
        path,
        mime: file.type,
      });
    }
    await load();
    setUploading(false);
  };

  const remove = async (row: FileRow) => {
    setFiles((prev) => prev.filter((f) => f.id !== row.id));
    await supabase.from("project_files").delete().eq("id", row.id);
    await supabase.storage.from(BUCKET).remove([row.path]);
  };

  const onNotes = (value: string) => {
    dirty.current = true;
    setNotes(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSaving(true);
      await supabase
        .from("projects")
        .update({ notes: value, updated_at: new Date().toISOString() })
        .eq("id", projectId);
      setSaving(false);
    }, 600);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="inline-flex items-center gap-2 font-display text-base font-bold tracking-tight">
            <ImageIcon className="h-4 w-4 text-primary" />
            格局圖與圖資
          </h2>
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-primary px-3 text-sm font-bold text-primary-foreground">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            上傳
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="sr-only"
              onChange={(e) => {
                void upload(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {files.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            尚未上傳格局圖／客變圖（支援圖片與 PDF）
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {files.map((f) => {
              const isPdf = f.mime.includes("pdf") || f.name.toLowerCase().endsWith(".pdf");
              return (
                <li key={f.id} className="overflow-hidden rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => (isPdf ? window.open(f.url, "_blank", "noopener") : setViewer(f))}
                    className="block w-full"
                  >
                    {isPdf ? (
                      <div className="grid h-28 place-items-center bg-muted">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      </div>
                    ) : (
                      <img src={f.url} alt={f.name} className="h-28 w-full object-cover" loading="lazy" />
                    )}
                  </button>
                  <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                    <span className="truncate text-[11px] text-muted-foreground">{f.name}</span>
                    <button
                      type="button"
                      aria-label={`刪除 ${f.name}`}
                      onClick={() => void remove(f)}
                      className="shrink-0 text-defect"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="inline-flex items-center gap-2 font-display text-base font-bold tracking-tight">
            <NotebookPen className="h-4 w-4 text-primary" />
            案場注意事項備註
          </h2>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Cloud className="h-3.5 w-3.5" />}
            {saving ? "儲存中" : "已同步"}
          </span>
        </div>
        <textarea
          value={notes}
          onChange={(e) => onNotes(e.target.value)}
          rows={4}
          placeholder="例：建商規定現場禁止灑水試水／社區管委會停車限高 2.1m"
          className="w-full rounded-xl border border-input bg-background p-3 text-[16px] leading-relaxed outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
        />
      </section>

      {viewer && <ImageViewer file={viewer} onClose={() => setViewer(null)} />}
    </div>
  );
}

function ImageViewer({ file, onClose }: { file: FileRow; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-foreground/90">
      <div className="flex items-center justify-between gap-3 p-3">
        <p className="truncate text-sm font-semibold text-background">{file.name}</p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label="縮小"
            onClick={() => setScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)))}
            className="grid h-10 w-10 place-items-center rounded-lg bg-surface"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-12 text-center text-sm font-bold text-background">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            aria-label="放大"
            onClick={() => setScale((s) => Math.min(5, +(s + 0.25).toFixed(2)))}
            className="grid h-10 w-10 place-items-center rounded-lg bg-surface"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="關閉檢視"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-lg bg-surface"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <img
          src={file.url}
          alt={file.name}
          style={{ width: `${scale * 100}%` }}
          className="mx-auto max-w-none rounded-lg"
        />
      </div>
    </div>
  );
}
