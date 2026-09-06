import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden: admin only");
}

export type Member = {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "inspector" | null;
  created_at: string;
  last_sign_in_at: string | null;
  confirmed: boolean;
};

export const adminListMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Member[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: users }, { data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
      supabaseAdmin.from("profiles").select("id, full_name, email"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    return (users?.users ?? []).map((u) => {
      const p = profiles?.find((x) => x.id === u.id);
      const r = roles?.find((x) => x.user_id === u.id);
      return {
        id: u.id,
        email: u.email ?? p?.email ?? "",
        full_name: p?.full_name ?? "",
        role: (r?.role as Member["role"]) ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        confirmed: Boolean(u.email_confirmed_at ?? u.confirmed_at),
      };
    });
  });

export const adminSetRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; role: "admin" | "inspector" | "none" }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId && data.role !== "admin") {
      throw new Error("不可移除自己的管理者權限");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    if (data.role !== "none") {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.userId, role: data.role });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminSetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; password: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.password.length < 6) throw new Error("密碼至少需要 6 碼");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("不可刪除自己的帳號");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin
      .from("projects")
      .update({ assigned_inspector: null })
      .eq("assigned_inspector", data.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminExportData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [projects, items, measurements, photos] = await Promise.all([
      supabaseAdmin.from("projects").select("*"),
      supabaseAdmin.from("inspection_items").select("*"),
      supabaseAdmin.from("space_measurements").select("*"),
      supabaseAdmin.from("inspection_photos").select("*"),
    ]);
    return {
      projects: projects.data ?? [],
      inspection_items: items.data ?? [],
      space_measurements: measurements.data ?? [],
      inspection_photos: photos.data ?? [],
    };
  });
