import { Ban, Check, TriangleAlert } from "lucide-react";
import { QUICK_CHIPS } from "@/lib/inspection-data";
import { DEFAULT_FIELDS, NUMERIC_INPUTS, type ItemField } from "@/lib/item-fields";
import type { ItemState, ItemStatus, Photo } from "@/lib/inspection-store";
import { cn } from "@/lib/utils";
import { PhotoField } from "./PhotoField";

type Props = {
  title: string;
  stamp?: string | undefined;
  /** Input blocks configured for this item in the backend. */
  fields?: ItemField[] | undefined;
  state: ItemState;
  onChange: (patch: Partial<ItemState>) => void;
  onAddPhotos: (files: File[]) => void;
  onRemovePhoto: (photo: Photo) => void;
};

export function ChecklistItem({ title, stamp, fields, state, onChange, onAddPhotos, onRemovePhoto }: Props) {
  const isDefect = state.status === "defect";
  const isNa = state.status === "na";
  const activeFields = fields && fields.length ? fields : DEFAULT_FIELDS;
  const numeric = activeFields.flatMap((f) => NUMERIC_INPUTS[f] ?? []);
  const values = state.values ?? {};
  const setValue = (key: string, v: string) => onChange({ values: { ...values, [key]: v } });

  const addChip = (chip: string) => {
    const note = state.note.trim();
    if (note.includes(chip)) return;
    onChange({ note: note ? `${note}、${chip}` : chip });
  };

  const toggleBtn = (status: ItemStatus, label: string, Icon: typeof Check, active: boolean, tone: string) => (
    <button
      type="button"
      onClick={() => onChange({ status })}
      aria-pressed={active}
      className={cn(
        "flex h-11 w-[62px] items-center justify-center gap-1 border-l border-border text-[13px] font-semibold transition-colors first:border-l-0",
        active ? tone : "bg-surface text-muted-foreground hover:bg-muted",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );

  return (
    <div
      className={cn(
        "rounded-xl border bg-surface transition-colors",
        isDefect ? "border-defect/40" : "border-border",
        isNa && "opacity-80",
      )}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3">
        <div className="min-w-0">
          <p className={cn("text-[15px] font-medium leading-snug", isNa && "line-through")}>{title}</p>
          {stamp && <p className="mt-0.5 text-[11px] text-muted-foreground">檢驗人：{stamp}</p>}
        </div>
        <div className="flex shrink-0 overflow-hidden rounded-lg border border-border">
          {toggleBtn("pass", "正常", Check, state.status === "pass", "bg-pass text-pass-foreground")}
          {toggleBtn("defect", "缺失", TriangleAlert, isDefect, "bg-defect text-defect-foreground")}
          {toggleBtn("na", "不適用", Ban, isNa, "bg-muted-foreground text-background")}
        </div>
      </div>

      <div
        className={cn(
          "space-y-3 border-t p-3",
          isDefect ? "border-defect/25 bg-defect-soft/60" : "border-border bg-muted/30",
        )}
      >
        {state.carriedNote && (
          <div className="rounded-lg border border-recheck/30 bg-recheck-soft/60 p-3 text-sm">
            <p className="font-semibold text-recheck">上一輪記錄</p>
            <p className="mt-0.5 text-muted-foreground">{state.carriedNote}</p>
          </div>
        )}

        {isDefect && (
          <div className="flex flex-wrap gap-2">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => addChip(chip)}
                className="rounded-full border border-defect/30 bg-surface px-3 py-2 text-[13px] font-medium text-defect transition-colors hover:bg-defect hover:text-defect-foreground"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {numeric.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {numeric.map((f) => (
              <label key={f.key} className="block">
                <span className="field-label">
                  {f.label}（{f.unit}）
                </span>
                <input
                  inputMode="decimal"
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValue(f.key, e.target.value)}
                  className="mt-1 h-12 w-full rounded-lg border border-input bg-surface px-3 text-[16px] tabular-nums outline-none focus:border-ring"
                />
              </label>
            ))}
          </div>
        )}

        {activeFields.includes("note") && (
        <textarea
          value={state.note}
          onChange={(e) => onChange({ note: e.target.value })}
          rows={isDefect ? 3 : 2}
          placeholder={isDefect ? "缺失描述（可點選上方快速標籤，或直接輸入）" : "備註（選填）"}
          className="w-full resize-y rounded-lg border border-input bg-surface p-3 text-[15px] outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/25"
        />
        )}

        {activeFields.includes("photo") && (
        <PhotoField
          photos={state.photos}
          onAdd={onAddPhotos}
          onRemove={onRemovePhoto}
          compact={!isDefect}
          label={isDefect ? "拍照 / 從相簿選擇" : "附加照片"}
        />
        )}
      </div>
    </div>
  );
}
