import { ROLE_OPTIONS, type InspectRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

/** Multi-select chips mapping a category / item / module to work roles. */
export function RoleSelect({
  value,
  onChange,
  label = "對應角色",
}: {
  value: InspectRole[];
  onChange: (roles: InspectRole[]) => void;
  label?: string;
}) {
  const toggle = (role: InspectRole) =>
    onChange(value.includes(role) ? value.filter((r) => r !== role) : [...value, role]);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="field-label mr-1">{label}</span>
      {ROLE_OPTIONS.map((role) => {
        const on = value.includes(role);
        return (
          <button
            key={role}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(role)}
            className={cn(
              "h-8 rounded-full border px-3 text-xs font-bold transition-colors",
              on
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-muted-foreground hover:bg-muted",
            )}
          >
            {role}
          </button>
        );
      })}
      {value.length === 0 && <span className="text-[11px] text-muted-foreground">未指定＝所有角色可見</span>}
    </div>
  );
}
