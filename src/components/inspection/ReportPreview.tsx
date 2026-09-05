import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { areaFromDimensions, defectCount, emptySpace, type SpaceState } from "@/lib/inspection-store";

export function ReportPreview({
  open,
  onOpenChange,
  project,
  customer,
  date,
  spaces,
  spaceNames,
  itemTitles,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project: string;
  customer: string;
  date: string;
  spaces: Record<string, SpaceState>;
  spaceNames: string[];
  itemTitles: Record<string, string>;
}) {
  const totalDefects = spaceNames.reduce((n, s) => n + defectCount(spaces[s]), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">驗屋紀錄報告</DialogTitle>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-muted p-4 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <p><span className="text-muted-foreground">案場：</span>{project}</p>
            <p><span className="text-muted-foreground">客戶：</span>{customer}</p>
            <p><span className="text-muted-foreground">驗屋日期：</span>{date}</p>
            <p><span className="text-muted-foreground">缺失總數：</span>
              <span className="font-bold text-defect">{totalDefects}</span> 項
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {spaceNames.map((name) => {
            const space = spaces[name] ?? emptySpace();
            const defects = Object.entries(space.items).filter(
              ([id, i]) => i.status === "defect" && !id.startsWith("__"),
            );
            const area = areaFromDimensions(space.dimensions);
            if (!defects.length && !area && !space.moisture.left && !space.moisture.right) return null;
            return (
              <section key={name} className="rounded-xl border border-border p-4">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-base font-bold">{name}</h3>
                  <span className="text-xs text-muted-foreground">
                    {area ? `${area.sqm.toFixed(2)} ㎡ / ${area.ping.toFixed(2)} 坪` : "未量測"}
                    {space.moisture.left || space.moisture.right
                      ? ` · 含水率 ${space.moisture.left || "—"}% / ${space.moisture.right || "—"}%`
                      : ""}
                  </span>
                </div>
                {defects.length === 0 ? (
                  <p className="text-sm text-pass">本空間無缺失紀錄</p>
                ) : (
                  <ol className="space-y-3">
                    {defects.map(([id, item], idx) => (
                      <li key={id} className="rounded-lg bg-defect-soft p-3">
                        <p className="text-sm font-semibold">
                          {idx + 1}. {itemTitles[id] ?? id}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.note || "（未填寫描述）"}
                        </p>
                        {item.photos.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {item.photos.map((p) => (
                              <img
                                key={p.id}
                                src={p.url}
                                alt={p.name}
                                className="h-20 w-20 rounded-md border border-border object-cover"
                              />
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="h-12 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
        >
          列印 / 匯出 PDF
        </button>
      </DialogContent>
    </Dialog>
  );
}
