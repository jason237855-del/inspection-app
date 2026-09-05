import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Mail, ShieldCheck, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/useSession";
import { BottomNav } from "@/components/BottomNav";
import { DevRoleToggle } from "@/components/DevRoleToggle";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "個人設定 | 驗屋現場紀錄系統" },
      { name: "description", content: "檢視帳號資訊與角色權限，並可安全登出驗屋現場紀錄系統。" },
      { property: "og:title", content: "個人設定 | 驗屋現場紀錄系統" },
      { property: "og:description", content: "檢視帳號資訊與角色權限，並可安全登出驗屋現場紀錄系統。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, role, realRole, devRole } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-4">
          <UserCog className="h-5 w-5 text-primary" />
          <h1 className="font-display text-lg font-bold tracking-tight">個人設定</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-4">
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
          <p className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            {user?.email ?? "—"}
          </p>
          <p className="mt-3 flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            角色：{role === "admin" ? "管理者 Admin" : role === "inspector" ? "檢查員 Inspector" : "尚未指派"}
          </p>
        </section>

        <button
          type="button"
          onClick={signOut}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface text-sm font-bold"
        >
          <LogOut className="h-4 w-4" />
          登出
        </button>
      </main>

      <DevRoleToggle realRole={realRole} devRole={devRole} />
      <BottomNav isAdmin={realRole === "admin"} />
    </div>
  );
}
