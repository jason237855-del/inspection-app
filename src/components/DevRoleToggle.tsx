import { FlaskConical } from "lucide-react";
import { setDevRoleOverride, type Role } from "@/lib/useSession";

/**
 * Preview-only helper: lets an admin instantly view the app as an inspector.
 * It never grants privileges — the database still enforces the real role.
 */
export function DevRoleToggle({ realRole, devRole }: { realRole: Role | null; devRole: Role | null }) {
  if (!import.meta.env.DEV || realRole !== "admin") return null;

  const options: { key: Role | null; label: string }[] = [
    { key: null, label: "實際角色" },
    { key: "admin", label: "管理者" },
    { key: "inspector", label: "檢查員" },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border border-border bg-surface px-2 py-1.5 shadow-card">
      <div className="flex items-center gap-1">
        <FlaskConical className="mx-1 h-4 w-4 text-primary" />
        {options.map((o) => (
          <button
            key={o.label}
            type="button"
            onClick={() => setDevRoleOverride(o.key)}
            className={
              "h-8 rounded-full px-3 text-xs font-bold transition-colors " +
              ((devRole ?? null) === o.key ? "bg-primary text-primary-foreground" : "text-muted-foreground")
            }
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
