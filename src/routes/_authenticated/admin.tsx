import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Download, Loader2, ShieldCheck, Trash2, Users } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { DashboardLayoutSettings } from "@/components/admin/DashboardLayoutSettings";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/useSession";
import {
  adminDeleteUser,
  adminExportData,
  adminListMembers,
  adminSetRole,
  type Member,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "系統後台 | 驗屋現場紀錄系統" },
      { name: "description", content: "管理者後台：管理團隊成員角色、指派檢查員、檢視所有驗屋案件並匯出原始資料。" },
      { property: "og:title", content: "系統後台 | 驗屋現場紀錄系統" },
      { property: "og:description", content: "管理團隊成員角色、指派檢查員與匯出驗屋資料。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

type Project = {
  id: string;
  name: string;
  client_name: string;
  inspection_date: string | null;
  assigned_inspector: string | null;
  status: string;
};

function AdminPage() {
  const { realRole, loading } = useSession();
  const navigate = useNavigate();
  const listMembers = useServerFn(adminListMembers);
  const setRole = useServerFn(adminSetRole);
  const deleteUser = useServerFn(adminDeleteUser);
  const exportData = useServerFn(adminExportData);

  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);

  const load = async () => {
    setBusy(true);
    try {
      const [m, p] = await Promise.all([
        listMembers({ data: undefined }),
        supabase.from("projects").select("*").order("created_at", { ascending: false }),
      ]);
      setMembers(m);
      setProjects((p.data as Project[]) ?? []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "載入失敗");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (loading) return;
    if (realRole !== "admin") {
      void navigate({ to: "/projects", replace: true });
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, realRole]);

  const changeRole = async (userId: string, role: "admin" | "inspector" | "none") => {
    try {
      await setRole({ data: { userId, role } });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新角色失敗");
    }
  };

  const removeUser = async (m: Member) => {
    if (!window.confirm(`確定刪除帳號 ${m.email}？此動作無法復原。`)) return;
    try {
      await deleteUser({ data: { userId: m.id } });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "刪除失敗");
    }
  };

  const reassign = async (projectId: string, inspector: string) => {
    const { error: err } = await supabase
      .from("projects")
      .update({ assigned_inspector: inspector || null })
      .eq("id", projectId);
    if (err) setError(err.message);
    else await load();
  };

  const download = async () => {
    try {
      const data = await exportData({ data: undefined });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inspection-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "匯出失敗");
    }
  };

  const nameOf = (id: string | null) => {
    const m = members.find((x) => x.id === id);
    return m ? m.full_name || m.email : "未指派";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
            <h1 className="truncate font-display text-lg font-bold tracking-tight">系統後台</h1>
          </div>
          <Link
            to="/templates"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold"
          >
            檢查範本
          </Link>
          <Link
            to="/projects"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold"
          >
            <ArrowLeft className="h-4 w-4" />
            回案件列表
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-4 pb-24">
        {error && <p className="rounded-lg bg-defect-soft p-3 text-sm text-defect">{error}</p>}
        {busy && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />載入中…
          </p>
        )}

        <DashboardLayoutSettings />

        <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
          <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold">
            <Users className="h-4 w-4 text-primary" />
            團隊成員（{members.length}）
          </h2>
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-3 font-semibold">姓名</th>
                  <th className="py-2 pr-3 font-semibold">Email</th>
                  <th className="py-2 pr-3 font-semibold">角色</th>
                  <th className="py-2 pr-3 font-semibold">建立日期</th>
                  <th className="py-2 pr-3 font-semibold">狀態</th>
                  <th className="py-2 font-semibold">操作</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-border/60">
                    <td className="py-3 pr-3 font-semibold">{m.full_name || "—"}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{m.email}</td>
                    <td className="py-3 pr-3">
                      <select
                        value={m.role ?? "none"}
                        onChange={(e) => void changeRole(m.id, e.target.value as "admin" | "inspector" | "none")}
                        className="h-10 rounded-lg border border-input bg-surface px-2 text-sm outline-none focus:border-ring"
                      >
                        <option value="admin">管理者</option>
                        <option value="inspector">檢查員</option>
                        <option value="none">停用（無權限）</option>
                      </select>
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground">{m.created_at.slice(0, 10)}</td>
                    <td className="py-3 pr-3">
                      <span
                        className={
                          "rounded-full px-2.5 py-1 text-xs font-semibold " +
                          (m.last_sign_in_at ? "bg-pass-soft text-pass" : "bg-muted text-muted-foreground")
                        }
                      >
                        {m.last_sign_in_at ? "已啟用" : "未曾登入"}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => void removeUser(m)}
                        className="inline-flex h-10 items-center gap-1 rounded-lg border border-border px-3 text-xs font-semibold text-defect"
                      >
                        <Trash2 className="h-4 w-4" />刪除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold">所有驗屋案件（{projects.length}）</h2>
            <button
              type="button"
              onClick={() => void download()}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-bold text-primary-foreground"
            >
              <Download className="h-4 w-4" />匯出原始資料
            </button>
          </div>
          <ul className="space-y-3">
            {projects.map((p) => (
              <li key={p.id} className="rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link
                    to="/project/$projectId"
                    params={{ projectId: p.id }}
                    className="font-display text-base font-bold hover:underline"
                  >
                    {p.name}
                  </Link>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{p.status}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.client_name || "—"} · {p.inspection_date || "未排定"} · 目前檢查員：{nameOf(p.assigned_inspector)}
                </p>
                <select
                  value={p.assigned_inspector ?? ""}
                  onChange={(e) => void reassign(p.id, e.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-input bg-surface px-3 text-sm outline-none focus:border-ring sm:w-64"
                >
                  <option value="">未指派</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name || m.email}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
          {projects.length === 0 && !busy && (
            <p className="text-sm text-muted-foreground">目前沒有案件。</p>
          )}
        </section>
      </main>

      <BottomNav isAdmin />
    </div>
  );
}
