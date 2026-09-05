import { cn } from "@/lib/utils";

/** Multi-select chips mapping a template category / item to applicable spaces. */
export function SpaceTagSelect({
  value,
  options,
  onChange,
  label = "適用空間",
}: {
  value: string[];
  options: string[];
  onChange: (spaces: string[]) => void;
  label?: string;
}) {
  const toggle = (name: string) =>
    onChange(value.includes(name) ? value.filter((s) => s !== name) : [...value, name]);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="field-label mr-1">{label}</span>
      <button
        type="button"
        aria-pressed={value.length === 0}
        onClick={() => onChange([])}
        className={cn(
          "h-8 rounded-full border px-3 text-xs font-bold transition-colors",
          value.length === 0
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-surface text-muted-foreground hover:bg-muted",
        )}
      >
        所有空間
      </button>
      {options.map((name) => {
        const on = value.includes(name);
        return (
          <button
            key={name}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(name)}
            className={cn(
              "h-8 rounded-full border px-3 text-xs font-bold transition-colors",
              on
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-muted-foreground hover:bg-muted",
            )}
          >
            {name}
          </button>
        );
      })}
      {options.length === 0 && <span className="text-[11px] text-muted-foreground">尚未建立預設空間</span>}
    </div>
  );
}
