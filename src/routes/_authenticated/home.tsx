import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ClipboardList, MapPin, Search, TriangleAlert, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/useSession";
import { BottomNav } from "@/components/BottomNav";
import { DevRoleToggle } from "@/components/DevRoleToggle";
import { STATUS_META, statusKey } from "@/lib/project-status";
import { ProjectActions } from "@/components/ProjectActions";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "首頁儀表板 | 驗屋現場紀錄系統" },
      { name: "description", content: "依日期分組檢視驗屋案件、搜尋客戶或案場，掌握進度與缺失數量。" },
      { property: "og:title", content: "首頁儀表板 | 驗屋現場紀錄系統" },
      { property: "og:description", content: "依日期分組檢視驗屋案件、搜尋客戶或案場，掌握進度與缺失數量。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
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

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function pretty(dateStr: string) {
  return dateStr.replaceAll("-", "/");
}

function HomePage() {
  const { user, role, realRole, devRole } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [defects, setDefects] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    const [p, pr, it] = await Promise.all([
      supabase.from("projects").select("*").order("inspection_date", { ascending: true }),
      supabase.from("profiles").select("id, full_name, email"),
      supabase.from("inspection_items").select("project_id, status").eq("status", "defect"),
    ]);
    setProjects((p.data as Project[]) ?? []);
    setProfiles((pr.data as Profile[]) ?? []);
    const counts: Record<string, number> = {};
    for (const row of (it.data as { project_id: string }[]) ?? []) {
      counts[row.project_id] = (counts[row.project_id] ?? 0) + 1;
    }
    setDefects(counts);
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  const inspectorName = (id: string | null) =>
    profiles.find((p) => p.id === id)?.full_name || profiles.find((p) => p.id === id)?.email || "未指派";

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = projects.filter((p) =>
      term
        ? [p.name, p.client_name, p.address].some((v) => (v ?? "").toLowerCase().includes(term))
        : true,
    );

    const today = ymd(new Date());
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    const tomorrow = ymd(tmr);

    const buckets: { key: string; title: string; items: Project[] }[] = [
      { key: "today", title: `今日 Today · ${pretty(today)}`, items: [] },
      { key: "tomorrow", title: `明日 Tomorrow · ${pretty(tomorrow)}`, items: [] },
      { key: "upcoming", title: "即將到來 Upcoming", items: [] },
      { key: "past", title: "已過期 Past", items: [] },
      { key: "none", title: "尚未排定 Unscheduled", items: [] },
    ];
    const find = (k: string) => buckets.find((b) => b.key === k)!;

    for (const p of filtered) {
      const d = p.inspection_date;
      if (!d) find("none").items.push(p);
      else if (d === today) find("today").items.push(p);
      else if (d === tomorrow) find("tomorrow").items.push(p);
      else if (d > today) find("upcoming").items.push(p);
      else find("past").items.push(p);
    }
    return buckets.filter((b) => b.items.length > 0);
  }, [projects, q]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 border-b border-border bg-surface">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg font-bold tracking-tight">今日驗屋</h1>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email} · {role === "admin" ? "管理者" : role === "inspector" ? "檢查員" : "—"}
              </p>
            </div>
          </div>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜尋客戶、案場名稱或地址"
              aria-label="搜尋案件"
              className="h-12 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-[16px] outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-4">
        {groups.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {q ? "找不到符合的案件。" : "目前沒有案件。"}
          </p>
        ) : (
          groups.map((g) => (
            <section key={g.key}>
              <h2 className="mb-2 font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {g.title}
              </h2>
              <ul className="space-y-3">
                {g.items.map((p) => {
                  const meta = STATUS_META[statusKey(p.status)];
                  const count = defects[p.id] ?? 0;
                  return (
                    <li key={p.id} className="rounded-2xl border border-border bg-surface p-4 shadow-card">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <h3 className="truncate font-display text-base font-bold">{p.name}</h3>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${meta.className}`}
                          >
                            {meta.label}
                          </span>
                        </div>
                        <ProjectActions
                          project={p}
                          profiles={profiles}
                          canDelete={realRole === "admin"}
                          onChanged={load}
                        />
                      </div>
                      <Link
                        to="/project/$projectId"
                        params={{ projectId: p.id }}
                        className="block rounded-xl transition-colors active:bg-muted"
                      >
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          <p className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 shrink-0" />
                            {p.client_name || "—"} · 檢查員：{inspectorName(p.assigned_inspector)}
                          </p>
                          <p className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{p.address || "未填地址"}</span>
                          </p>
                          <p className="flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                            {p.inspection_date ? pretty(p.inspection_date) : "未排定"}
                          </p>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${
                              count > 0 ? "bg-defect-soft text-defect" : "bg-pass-soft text-pass"
                            }`}
                          >
                            <TriangleAlert className="h-3.5 w-3.5" />
                            缺失 {count}
                          </span>
                          <span className="text-xs font-bold text-primary">開始 / 繼續檢查 →</span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </main>

      <DevRoleToggle realRole={realRole} devRole={devRole} />
      <BottomNav isAdmin={realRole === "admin"} />
    </div>
  );
}
