import { useEffect, useRef, useState } from "react";
import { MoreVertical, Pencil, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_META, STATUS_ORDER, statusKey } from "@/lib/project-status";

export type EditableProject = {
  id: string;
  name: string;
  client_name: string;
  client_phone?: string;
  address: string;
  inspection_date: string | null;
  assigned_inspector: string | null;
  team_members?: string[] | null;
  status: string;
};

type Profile = { id: string; full_name: string; email: string };

export function ProjectActions({
  project,
  profiles,
  canDelete,
  onChanged,
}: {
  project: EditableProject;
  profiles: Profile[];
  canDelete: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const [form, setForm] = useState({
    name: project.name,
    client_name: project.client_name ?? "",
    client_phone: project.client_phone ?? "",
    address: project.address ?? "",
    inspection_date: project.inspection_date ?? "",
    assigned_inspector: project.assigned_inspector ?? "",
  });
  const [team, setTeam] = useState<string[]>(project.team_members ?? []);

  const openEdit = () => {
    setForm({
      name: project.name,
      client_name: project.client_name ?? "",
      client_phone: project.client_phone ?? "",
      address: project.address ?? "",
      inspection_date: project.inspection_date ?? "",
      assigned_inspector: project.assigned_inspector ?? "",
    });
    setTeam(project.team_members ?? []);
    setError("");
    setOpen(false);
    setEdit(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error: err } = await supabase
      .from("projects")
      .update({
        name: form.name,
        client_name: form.client_name,
        client_phone: form.client_phone,
        address: form.address,
        inspection_date: form.inspection_date || null,
        assigned_inspector: form.assigned_inspector || null,
        team_members: team.filter((id) => id !== form.assigned_inspector),
        updated_at: new Date().toISOString(),
      })
      .eq("id", project.id);
    setBusy(false);
    if (err) return setError(err.message);
    setEdit(false);
    onChanged();
  };

  const changeStatus = async (value: string) => {
    setOpen(false);
    await supabase
      .from("projects")
      .update({ status: value, updated_at: new Date().toISOString() })
      .eq("id", project.id);
    onChanged();
  };

  const remove = async () => {
    setBusy(true);
    await supabase.from("inspection_photos").delete().eq("project_id", project.id);
    await supabase.from("inspection_items").delete().eq("project_id", project.id);
    await supabase.from("space_measurements").delete().eq("project_id", project.id);
    await supabase.from("project_files").delete().eq("project_id", project.id);
    const { error: err } = await supabase.from("projects").delete().eq("id", project.id);
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setConfirm(false);
    onChanged();
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        aria-label="案件操作選單"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-surface text-muted-foreground active:bg-muted"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-40 w-52 overflow-hidden rounded-xl border border-border bg-surface shadow-bar">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              openEdit();
            }}
            className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm font-semibold hover:bg-muted"
          >
            <Pencil className="h-4 w-4" />
            編輯案件
          </button>
          <div className="border-t border-border px-3 py-2">
            <p className="field-label">變更狀態</p>
            <div className="mt-1 grid gap-1">
              {STATUS_ORDER.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    void changeStatus(k);
                  }}
                  className={
                    "rounded-lg px-2 py-2 text-left text-sm font-semibold " +
                    (statusKey(project.status) === k ? STATUS_META[k].className : "hover:bg-muted")
                  }
                >
                  {STATUS_META[k].label}
                </button>
              ))}
            </div>
          </div>
          {canDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setOpen(false);
                setConfirm(true);
              }}
              className="flex w-full items-center gap-2 border-t border-border px-3 py-3 text-left text-sm font-semibold text-defect hover:bg-defect-soft"
            >
              <Trash2 className="h-4 w-4" />
              刪除案件
            </button>
          )}
        </div>
      )}

      {edit && (
        <Modal title="編輯案件" onClose={() => setEdit(false)}>
          <form onSubmit={save} className="grid gap-3">
            <Field label="案場名稱" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <Field label="客戶姓名" value={form.client_name} onChange={(v) => setForm({ ...form, client_name: v })} />
            <Field label="客戶電話" value={form.client_phone} onChange={(v) => setForm({ ...form, client_phone: v })} />
            <Field label="地址" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
            <Field
              label="驗屋日期"
              type="date"
              value={form.inspection_date}
              onChange={(v) => setForm({ ...form, inspection_date: v })}
            />
            <label className="block">
              <span className="field-label">指派檢查員</span>
              <select
                value={form.assigned_inspector}
                onChange={(e) => setForm({ ...form, assigned_inspector: e.target.value })}
                className="mt-1 h-12 w-full rounded-lg border border-input bg-surface px-3 text-[16px] outline-none focus:border-ring"
              >
                <option value="">未指派</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.email}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <span className="field-label">隨行人員（可多選）</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {profiles
                  .filter((p) => p.id !== form.assigned_inspector)
                  .map((p) => {
                    const on = team.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          setTeam((prev) => (on ? prev.filter((x) => x !== p.id) : [...prev, p.id]))
                        }
                        className={
                          "h-10 rounded-full border border-border px-3 text-sm font-semibold transition-colors " +
                          (on ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground")
                        }
                      >
                        {p.full_name || p.email}
                      </button>
                    );
                  })}
                {profiles.length <= 1 && <span className="text-xs text-muted-foreground">尚無其他團隊成員</span>}
              </div>
            </div>
            {error && <p className="rounded-lg bg-defect-soft p-3 text-sm text-defect">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="h-12 rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              儲存變更
            </button>
          </form>
        </Modal>
      )}

      {confirm && (
        <Modal title="刪除案件" onClose={() => setConfirm(false)}>
          <p className="text-sm text-muted-foreground">
            確定要刪除「{project.name}」嗎？此動作會一併移除該案件的檢查紀錄、照片與圖資，且無法復原。
          </p>
          {error && <p className="mt-3 rounded-lg bg-defect-soft p-3 text-sm text-defect">{error}</p>}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setConfirm(false)}
              className="h-12 rounded-xl border border-border text-sm font-bold"
            >
              取消
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void remove()}
              className="h-12 rounded-xl bg-defect text-sm font-bold text-defect-foreground disabled:opacity-60"
            >
              確認刪除
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 p-0 sm:items-center sm:p-4"
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-surface p-4 sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-bold">{title}</h2>
          <button
            type="button"
            aria-label="關閉"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg border border-border"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-12 w-full rounded-lg border border-input bg-surface px-3 text-[16px] outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
      />
    </label>
  );
}
