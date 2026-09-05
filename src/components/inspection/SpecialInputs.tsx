import { Droplets, Plus, Ruler, Trash2 } from "lucide-react";
import type { WindowRecord } from "@/lib/windows-db";
import type { DimensionEntry, DimensionPatch } from "@/lib/dimensions-db";
import { entryArea, totalArea } from "@/lib/dimensions-db";
import type { Photo } from "@/lib/inspection-store";
import type { SpaceSettings } from "@/lib/checklist-db";
import { PhotoField } from "./PhotoField";

function NumField({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <div className="mt-1 flex items-center rounded-lg border border-input bg-surface focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25">
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="h-12 w-full min-w-0 rounded-lg bg-transparent px-3 text-[16px] font-semibold outline-none"
        />
        <span className="px-3 text-xs font-medium text-muted-foreground">{unit}</span>
      </div>
    </label>
  );
}

function DimToggle({
  label,
  on,
  onToggle,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className={
        on
          ? "h-9 rounded-lg border border-primary bg-primary px-3 text-[13px] font-bold text-primary-foreground"
          : "h-9 rounded-lg border border-border bg-surface px-3 text-[13px] font-semibold text-muted-foreground"
      }
    >
      {label}
    </button>
  );
}

function DimensionCard({
  entry,
  onUpdate,
  onRemove,
  onAddPhotos,
  onRemovePhoto,
}: {
  entry: DimensionEntry;
  onUpdate: (patch: DimensionPatch) => void;
  onRemove: () => void;
  onAddPhotos: (files: File[]) => void;
  onRemovePhoto: (photo: Photo) => void;
}) {
  const area = entryArea(entry);
  const activeDims = [entry.useLength, entry.useWidth, entry.useHeight].filter(Boolean).length;

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="mb-2 flex items-center gap-2">
        <input
          value={entry.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="區域名稱（例：主空間、車位 B1-102）"
          className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-surface px-3 text-sm font-semibold outline-none focus:border-ring"
        />
        <button
          type="button"
          aria-label={`刪除${entry.name}`}
          onClick={() => {
            if (window.confirm(`確定刪除「${entry.name}」的丈量紀錄？`)) onRemove();
          }}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border text-defect"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-2 flex flex-wrap gap-2">
        <DimToggle label="長" on={entry.useLength} onToggle={() => onUpdate({ useLength: !entry.useLength })} />
        <DimToggle label="寬" on={entry.useWidth} onToggle={() => onUpdate({ useWidth: !entry.useWidth })} />
        <DimToggle label="高" on={entry.useHeight} onToggle={() => onUpdate({ useHeight: !entry.useHeight })} />
      </div>

      {activeDims === 0 ? (
        <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">此丈量區域已關閉所有欄位。</p>
      ) : (
        <div className={`grid gap-2 ${activeDims === 3 ? "grid-cols-3" : activeDims === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
          {entry.useLength && (
            <NumField label="長" unit="cm" value={entry.length} onChange={(v) => onUpdate({ length: v })} />
          )}
          {entry.useWidth && (
            <NumField label="寬" unit="cm" value={entry.width} onChange={(v) => onUpdate({ width: v })} />
          )}
          {entry.useHeight && (
            <NumField label="高" unit="cm" value={entry.height} onChange={(v) => onUpdate({ height: v })} />
          )}
        </div>
      )}

      {entry.useLength && entry.useWidth && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted p-3">
            <p className="field-label">面積</p>
            <p className="font-display text-xl font-bold">{area ? area.sqm.toFixed(2) : "—"} ㎡</p>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <p className="field-label">坪數</p>
            <p className="font-display text-xl font-bold">{area ? area.ping.toFixed(2) : "—"} 坪</p>
          </div>
        </div>
      )}

      <textarea
        value={entry.note}
        onChange={(e) => onUpdate({ note: e.target.value })}
        rows={2}
        placeholder="尺寸備註（例：樑下淨高不足、量測位置說明）"
        className="mt-3 w-full resize-y rounded-lg border border-input bg-surface p-3 text-[15px] outline-none placeholder:text-muted-foreground focus:border-ring"
      />
      <div className="mt-2">
        <PhotoField photos={entry.photos} onAdd={onAddPhotos} onRemove={onRemovePhoto} label="尺寸照片" compact />
      </div>
    </div>
  );
}

export function SpecialInputs({
  settings,
  showDimensions = true,
  showWindows = true,
  dimensionEntries,
  onAddDimensionEntry,
  onRemoveDimensionEntry,
  onUpdateDimensionEntry,
  onAddDimensionPhotos,
  onRemoveDimensionPhoto,
  windows,
  onAddWindow,
  onRemoveWindow,
  onUpdateWindow,
  onAddWindowPhotos,
  onRemoveWindowPhoto,
}: {
  settings: SpaceSettings;
  showDimensions?: boolean;
  showWindows?: boolean;
  dimensionEntries: DimensionEntry[];
  onAddDimensionEntry: () => void;
  onRemoveDimensionEntry: (id: string) => void;
  onUpdateDimensionEntry: (id: string, patch: DimensionPatch) => void;
  onAddDimensionPhotos: (id: string, files: File[]) => void;
  onRemoveDimensionPhoto: (id: string, photo: Photo) => void;
  windows: WindowRecord[];
  onAddWindow: () => void;
  onRemoveWindow: (id: string) => void;
  onUpdateWindow: (
    id: string,
    patch: Partial<Pick<WindowRecord, "name" | "preLeft" | "preRight" | "postLeft" | "postRight" | "note">>,
  ) => void;
  onAddWindowPhotos: (id: string, files: File[]) => void;
  onRemoveWindowPhoto: (id: string, photo: Photo) => void;
}) {
  const total = totalArea(dimensionEntries);

  return (
    <div className="grid gap-3">
      {settings.show_dimensions && showDimensions && (
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 font-display text-sm font-bold tracking-wide">
              <Ruler className="h-4 w-4 text-primary" />
              空間尺寸
            </h3>
            <button
              type="button"
              onClick={onAddDimensionEntry}
              className="inline-flex h-10 items-center gap-1 rounded-lg bg-primary px-3 text-[13px] font-bold text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              新增丈量區域
            </button>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-muted p-3">
              <p className="field-label">總面積</p>
              <p className="font-display text-xl font-bold">{total.sqm.toFixed(2)} ㎡</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="field-label">總坪數</p>
              <p className="font-display text-xl font-bold">{total.ping.toFixed(2)} 坪</p>
            </div>
          </div>

          {dimensionEntries.length === 0 ? (
            <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              尚未新增丈量區域，點選「新增丈量區域」開始記錄尺寸、照片與備註。
            </p>
          ) : (
            <div className="space-y-3">
              {dimensionEntries.map((entry) => (
                <DimensionCard
                  key={entry.id}
                  entry={entry}
                  onUpdate={(patch) => onUpdateDimensionEntry(entry.id, patch)}
                  onRemove={() => onRemoveDimensionEntry(entry.id)}
                  onAddPhotos={(files) => onAddDimensionPhotos(entry.id, files)}
                  onRemovePhoto={(photo) => onRemoveDimensionPhoto(entry.id, photo)}
                />
              ))}
            </div>
          )}
        </section>
      )}


      {showWindows && (
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-display text-sm font-bold tracking-wide">
            <Droplets className="h-4 w-4 text-primary" />
            窗框含水率檢測
          </h3>
          <button
            type="button"
            onClick={onAddWindow}
            className="inline-flex h-10 items-center gap-1 rounded-lg bg-primary px-3 text-[13px] font-bold text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            新增窗戶
          </button>
        </div>

        {windows.length === 0 ? (
          <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            尚未新增窗戶，點選「新增窗戶」開始記錄含水率、照片與備註。
          </p>
        ) : (
          <div className="space-y-3">
            {windows.map((w) => (
              <div key={w.id} className="rounded-xl border border-border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <input
                    value={w.name}
                    onChange={(e) => onUpdateWindow(w.id, { name: e.target.value })}
                    className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-surface px-3 text-sm font-semibold outline-none focus:border-ring"
                  />
                  <button
                    type="button"
                    aria-label={`刪除${w.name}`}
                    onClick={() => {
                      if (window.confirm(`確定刪除「${w.name}」的紀錄？`)) onRemoveWindow(w.id);
                    }}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border text-defect"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <p className="field-label mb-1">測前含水率 (%)</p>
                <div className="grid grid-cols-2 gap-2">
                  <NumField
                    label="左側"
                    unit="%"
                    value={w.preLeft}
                    onChange={(v) => onUpdateWindow(w.id, { preLeft: v })}
                  />
                  <NumField
                    label="右側"
                    unit="%"
                    value={w.preRight}
                    onChange={(v) => onUpdateWindow(w.id, { preRight: v })}
                  />
                </div>

                <p className="field-label mb-1 mt-3">測後含水率 (%)</p>
                <div className="grid grid-cols-2 gap-2">
                  <NumField
                    label="左側"
                    unit="%"
                    value={w.postLeft}
                    onChange={(v) => onUpdateWindow(w.id, { postLeft: v })}
                  />
                  <NumField
                    label="右側"
                    unit="%"
                    value={w.postRight}
                    onChange={(v) => onUpdateWindow(w.id, { postRight: v })}
                  />
                </div>

                <textarea
                  value={w.note}
                  onChange={(e) => onUpdateWindow(w.id, { note: e.target.value })}
                  rows={2}
                  placeholder="備註（例：雨後複驗、窗角滲水）"
                  className="mt-2 w-full resize-y rounded-lg border border-input bg-surface p-3 text-[15px] outline-none placeholder:text-muted-foreground focus:border-ring"
                />

                <div className="mt-2">
                  <PhotoField
                    photos={w.photos}
                    onAdd={(files) => onAddWindowPhotos(w.id, files)}
                    onRemove={(photo) => onRemoveWindowPhoto(w.id, photo)}
                    label="檢測照片（必附）"
                    compact
                  />
                  {w.photos.length === 0 && (
                    <p className="mt-1 text-[11px] font-medium text-defect">尚未附上檢測照片</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      )}
    </div>
  );
}
