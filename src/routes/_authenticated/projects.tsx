import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  ClipboardList,
  FileText,
  Loader2,
  LogOut,
  Plus,
  ShieldCheck,
  Upload,
  User,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/useSession";
import { DevRoleToggle } from "@/components/DevRoleToggle";
import { BottomNav } from "@/components/BottomNav";
import { STATUS_META, STATUS_ORDER, statusKey } from "@/lib/project-status";
import { ProjectActions } from "@/components/ProjectActions";
import { useTemplateSets } from "@/lib/checklist-db";

const PROPERTY_TYPES = ["大樓", "透天", "華廈", "公寓", "別墅"] as const;
const BUCKET = "project-files";

const emptyForm = {
  name: "",
  client_name: "",
  client_phone: "",
  address: "",
  inspection_date: "",
  inspection_time: "",
  assigned_inspector: "",
  property_type: "",
  total_ping: "",
  template_set_id: "",
  notes: "",
};


export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({
    meta: [
      { title: "驗屋案件列表 | 驗屋現場紀錄系統" },
      { name: "description", content: "檢視指派給你的驗屋案件，管理者可新增案件並指派檢查員。" },
      { property: "og:title", content: "驗屋案件列表" },
      { property: "og:description", content: "檢視指派給你的驗屋案件，管理者可新增案件並指派檢查員。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProjectsPage,
});

type Project = {
  id: string;
  name: string;
  client_name: string;
  client_phone: string;
  address: string;
  inspection_date: string | null;
  assigned_inspector: string | null;
  team_members?: string[] | null;
  status: string;
};

type Profile = { id: string; full_name: string; email: string };

function ProjectsPage() {
  const { user, role, realRole, devRole } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | (typeof STATUS_ORDER)[number]>("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [team, setTeam] = useState<string[]>([]);
  const [plans, setPlans] = useState<File[]>([]);
  const { sets } = useTemplateSets();

  useEffect(() => {
    if (!form.template_set_id && sets[0]) setForm((f) => ({ ...f, template_set_id: sets[0]!.id }));
  }, [form.template_set_id, sets]);

  const load = async () => {
    const [p, pr] = await Promise.all([
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, email"),
    ]);
    setProjects((p.data as Project[]) ?? []);
    setProfiles((pr.data as Profile[]) ?? []);
  };

  useEffect(() => {
    if (user) void load();
  }, [user]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { data: created, error: err } = await supabase
      .from("projects")
      .insert({
        name: form.name,
        client_name: form.client_name,
        client_phone: form.client_phone,
        address: form.address,
        inspection_date: form.inspection_date || null,
        inspection_time: form.inspection_time,
        assigned_inspector: form.assigned_inspector || null,
        property_type: form.property_type,
        total_ping: form.total_ping ? Number(form.total_ping) : null,
        team_members: team,
        template_set_id: form.template_set_id || null,
        notes: form.notes,
      })
      .select("id")
      .single();

    if (err || !created) {
      setBusy(false);
      setError(err?.message ?? "建立失敗");
      return;
    }

    // Pre-upload floor plans / cadastral drawings for this project.
    const failed: string[] = [];
    for (const file of plans) {
      const safe = file.name.replace(/[^\w.-]/g, "_") || "file";
      const path = `${created.id}/${crypto.randomUUID()}-${safe}`;
      const up = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });
      if (up.error) {
        failed.push(file.name);
        continue;
      }
      const ins = await supabase.from("project_files").insert({
        project_id: created.id,
        kind: "floor_plan",
        name: file.name,
        path,
        mime: file.type,
      });
      if (ins.error) failed.push(file.name);
    }
    if (failed.length) setError(`案件已建立，但以下圖資上傳失敗：${failed.join("、")}`);


    setBusy(false);
    setOpen(failed.length > 0);
    setForm({ ...emptyForm, template_set_id: sets[0]?.id ?? "" });
    setTeam([]);
    setPlans([]);
    void load();
  };

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  };

  const visible = projects.filter((p) => filter === "all" || statusKey(p.status) === filter);

  const inspectorName = (id: string | null) =>
    profiles.find((p) => p.id === id)?.full_name || (id ? "（未命名）" : "未指派");

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <ClipboardList className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg font-bold tracking-tight">驗屋案件</h1>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email} · {role === "admin" ? "管理者" : role === "inspector" ? "檢查員" : "—"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {realRole === "admin" && (
              <Link
                to="/admin"
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold"
              >
                <ShieldCheck className="h-4 w-4" />
                系統後台
              </Link>
            )}
            <button
              type="button"
              onClick={signOut}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold"
            >
              <LogOut className="h-4 w-4" />
              登出
            </button>
          </div>
        </div>
      </header>


      <main className="mx-auto max-w-4xl space-y-4 px-4 py-4">
        {role === "admin" && (
          <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              新建驗屋案件
            </button>

            {open && (
              <form onSubmit={create} className="mt-4 grid gap-3 md:grid-cols-2">
                <p className="section-head md:col-span-2">案件與客戶基本資料</p>
                <Field
                  label="案件名稱"
                  value={form.name}
                  onChange={(v) => setForm({ ...form, name: v })}
                  required
                />
                <Field label="客戶姓名" value={form.client_name} onChange={(v) => setForm({ ...form, client_name: v })} />
                <Field
                  label="聯絡電話"
                  type="tel"
                  value={form.client_phone}
                  onChange={(v) => setForm({ ...form, client_phone: v })}
                />
                <Field
                  label="案場地址"
                  value={form.address}
                  onChange={(v) => setForm({ ...form, address: v })}
                />
                <Field
                  label="預約驗屋日期"
                  type="date"
                  value={form.inspection_date}
                  onChange={(v) => setForm({ ...form, inspection_date: v })}
                />
                <Field
                  label="預約時間"
                  type="time"
                  value={form.inspection_time}
                  onChange={(v) => setForm({ ...form, inspection_time: v })}
                />

                <p className="section-head md:col-span-2">建案資訊</p>
                <label className="block">
                  <span className="field-label">建案類型</span>
                  <select
                    value={form.property_type}
                    onChange={(e) => setForm({ ...form, property_type: e.target.value })}
                    className="mt-1 h-12 w-full rounded-lg border border-input bg-surface px-3 text-[16px] outline-none focus:border-ring"
                  >
                    <option value="">未選擇</option>
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  label="總坪數"
                  type="number"
                  value={form.total_ping}
                  onChange={(v) => setForm({ ...form, total_ping: v })}
                />

                <p className="section-head md:col-span-2">人員與範本設定</p>
                <label className="block">
                  <span className="field-label">主驗官</span>
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
                <label className="block">
                  <span className="field-label">預設檢驗範本</span>
                  <select
                    value={form.template_set_id}
                    onChange={(e) => setForm({ ...form, template_set_id: e.target.value })}
                    className="mt-1 h-12 w-full rounded-lg border border-input bg-surface px-3 text-[16px] outline-none focus:border-ring"
                  >
                    {sets.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="md:col-span-2">
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
                    {profiles.length <= 1 && (
                      <span className="text-xs text-muted-foreground">尚無其他團隊成員</span>
                    )}
                  </div>
                </div>

                <p className="section-head md:col-span-2">預先上傳圖資與備註</p>
                <div className="md:col-span-2">
                  <span className="field-label">格局圖上傳（圖片或 PDF）</span>
                  <label
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      setPlans((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
                    }}
                    className="mt-1 flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground"
                  >
                    <Upload className="h-5 w-5" />
                    拖曳檔案到此，或點擊從相簿／檔案選擇
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      className="sr-only"
                      onChange={(e) => {
                        const picked = e.target.files ? Array.from(e.target.files) : [];
                        e.target.value = "";
                        if (picked.length) setPlans((prev) => [...prev, ...picked]);
                      }}
                    />
                  </label>
                  {plans.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {plans.map((f, i) => (
                        <li
                          key={`${f.name}-${i}`}
                          className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 text-xs"
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate">{f.name}</span>
                          <button
                            type="button"
                            aria-label={`移除 ${f.name}`}
                            onClick={() => setPlans((prev) => prev.filter((_, idx) => idx !== i))}
                            className="shrink-0 text-defect"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <label className="block md:col-span-2">
                  <span className="field-label">合約／圖資備註</span>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-input bg-surface p-3 text-[16px] leading-relaxed outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
                  />
                </label>

                {error && <p className="rounded-lg bg-defect-soft p-3 text-sm text-defect md:col-span-2">{error}</p>}
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-60 md:col-span-2"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  建立案件
                </button>
              </form>
            )}
          </section>
        )}

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {(["all", ...STATUS_ORDER] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={
                "h-10 shrink-0 rounded-full border border-border px-4 text-sm font-semibold transition-colors " +
                (filter === k ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground")
              }
            >
              {k === "all" ? "全部" : STATUS_META[k].label}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            目前沒有案件{role === "admin" ? "，請點上方新建。" : "，請等待管理者指派。"}
          </p>
        ) : (
          <ul className="space-y-3">
            {visible.map((p) => (
              <li key={p.id} className="rounded-2xl border border-border bg-surface p-4 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <h2 className="truncate font-display text-base font-bold">{p.name}</h2>
                    <span
                      className={
                        "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold " +
                        STATUS_META[statusKey(p.status)].className
                      }
                    >
                      {STATUS_META[statusKey(p.status)].label}
                    </span>
                  </div>
                  <ProjectActions
                    project={p}
                    profiles={profiles}
                    canDelete={realRole === "admin"}
                    onChanged={() => void load()}
                  />
                </div>
                <Link
                  to="/project/$projectId"
                  params={{ projectId: p.id }}
                  className="block rounded-xl transition-colors hover:bg-muted"
                >
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {p.client_name || "—"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {p.inspection_date || "未排定"}
                    </span>
                    <span>檢查員：{inspectorName(p.assigned_inspector)}</span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-primary">開始 / 繼續檢查 →</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>

      <DevRoleToggle realRole={realRole} devRole={devRole} />
      <BottomNav isAdmin={realRole === "admin"} />
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
