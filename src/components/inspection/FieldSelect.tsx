import { FIELD_OPTIONS, type ItemField } from "@/lib/item-fields";
import { cn } from "@/lib/utils";

type Props = {
  value: ItemField[] | undefined;
  onChange: (fields: ItemField[]) => void;
};

/** Backend picker for the input blocks an inspection item renders on site. */
export function FieldSelect({ value, onChange }: Props) {
  const selected = value ?? [];
  const toggle = (key: ItemField) =>
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-bold text-muted-foreground">輸入欄位</span>
      {FIELD_OPTIONS.map((f) => {
        const on = selected.includes(f.key);
        return (
          <button
            key={f.key}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(f.key)}
            className={cn(
              "h-8 rounded-full border px-3 text-[12px] font-semibold transition-colors",
              on
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-muted-foreground hover:bg-muted",
            )}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
