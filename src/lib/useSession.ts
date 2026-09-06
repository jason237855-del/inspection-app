import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "inspector";

const DEV_ROLE_KEY = "dev-role-override";

export function getDevRoleOverride(): Role | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(DEV_ROLE_KEY);
  return v === "admin" || v === "inspector" ? v : null;
}

export function setDevRoleOverride(role: Role | null) {
  if (typeof window === "undefined") return;
  if (role) window.localStorage.setItem(DEV_ROLE_KEY, role);
  else window.localStorage.removeItem(DEV_ROLE_KEY);
  window.dispatchEvent(new Event("dev-role-change"));
}

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [realRole, setRealRole] = useState<Role | null>(null);
  const [override, setOverride] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  const syncOverride = useCallback(() => setOverride(getDevRoleOverride()), []);

  useEffect(() => {
    syncOverride();
    window.addEventListener("dev-role-change", syncOverride);
    return () => window.removeEventListener("dev-role-change", syncOverride);
  }, [syncOverride]);

  useEffect(() => {
    let alive = true;

    const loadRole = async (uid: string) => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid).limit(1);
      if (alive) setRealRole((data?.[0]?.role as Role) ?? null);
    };

    supabase.auth.getUser().then(async ({ data }) => {
      if (!alive) return;
      setUser(data.user ?? null);
      if (data.user) {
        await loadRole(data.user.id);
      } else {
        setRealRole(null);
      }
      if (alive) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!alive) return;
      setUser(session?.user ?? null);
      if (session?.user) void loadRole(session.user.id);
      else setRealRole(null);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Dev override can only narrow an admin's view (never grant real privileges;
  // the database still enforces RLS by the account's actual role).
  const role: Role | null = realRole === "admin" && override ? override : realRole;

  return { user, role, realRole, devRole: override, loading };
}
