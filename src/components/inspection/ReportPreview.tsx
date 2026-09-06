import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { areaFromDimensions, defectCount, emptySpace, type ItemStatus, type SpaceState } from "@/lib/inspection-store";
import { roundLabel } from "@/lib/rounds-db";

export type ReportItem = { id: string; title: string };
export type ReportCategory = { id: string; name: string; items: ReportItem[] };
export type ReportSpace = { id: string; name: string; categories: ReportCategory[] };

type PanelRow = { id: string; name: string; amperage: string; wire_spec: string; circuits: number | null; note: string };
type SignatureRow = { kind: string; signer_name: string; data_url: string };

const STATUS_META: Record<ItemStatus, { label: string; className: string }> = {
  pass: { label: "正常", className: "bg-pass-soft text-pass" },
  defect: { label: "缺失", className: "bg-defect-soft text-defect" },
  na: { label: "不適用", className: "bg-muted text-muted-foreground" },
  pending: { label: "待複驗", className: "bg-warn-soft text-warn" },
};

export function ReportPreview({
  open,
  onOpenChange,
  projectId,
  project,
  customer,
  clientPhone,
  address,
  unit,
  developer,
  layout,
  totalPing,
  date,
  round = 1,
  spaces,
  reportSpaces,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  project: string;
  customer: string;
  clientPhone?: string | undefined;
  address?: string | undefined;
  unit?: string | undefined;
  developer?: string | undefined;
  layout?: string | undefined;
  totalPing?: number | null | undefined;
  date: string;
  round?: number;
  spaces: Record<string, SpaceState>;
  reportSpaces: ReportSpace[];
}) {
  const [panels, setPanels] = useState<PanelRow[]>([]);
  const [signatures, setSignatures] = useState<Record<string, SignatureRow>>({});

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const [{ data: panelRows }, { data: sigRows }] = await Promise.all([
        supabase
          .from("project_panels")
          .select("id, name, amperage, wire_spec, circuits, note")
          .eq("project_id", projectId)
          .order("sort")
          .order("created_at"),
        supabase.from("project_signatures").select("kind, signer_name, data_url").eq("project_id", projectId),
      ]);
      setPanels((panelRows as PanelRow[]) ?? []);
      setSignatures(Object.fromEntries(((sigRows as SignatureRow[]) ?? []).map((r) => [r.kind, r])));
    })();
  }, [open, projectId]);

  const spaceNames = reportSpaces.map((s) => s.name);
  const totalDefects = spaceNames.reduce((n, s) => n + defectCount(spaces[s]), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto print:static print:m-0 print:max-h-none print:w-full print:max-w-none print:translate-x-0 print:translate-y-0 print:overflow-visible print:border-none print:p-0 print:shadow-none">
        <DialogHeader className="no-print">
          <DialogTitle className="font-display text-xl">驗屋紀錄報告</DialogTitle>
        </DialogHeader>

        <div id="report-print-area" className="space-y-4">
          <h1 className="hidden font-display text-xl font-bold print:block">驗屋紀錄報告</h1>

          <div className="rounded-xl border border-border bg-muted p-4 text-sm print:border-none print:bg-transparent print:p-0">
            <div className="grid grid-cols-2 gap-2">
              <p><span className="text-muted-foreground">建案／案場：</span>{project}</p>
              <p><span className="text-muted-foreground">戶別：</span>{unit || "—"}</p>
              <p><span className="text-muted-foreground">格局：</span>{layout || "—"}</p>
              <p><span className="text-muted-foreground">總坪數：</span>{totalPing ? `${totalPing} 坪` : "—"}</p>
              <p><span className="text-muted-foreground">建商：</span>{developer || "—"}</p>
              <p><span className="text-muted-foreground">客戶：</span>{customer}</p>
              <p><span className="text-muted-foreground">聯絡電話：</span>{clientPhone || "—"}</p>
              <p className="col-span-2"><span className="text-muted-foreground">地址：</span>{address || "—"}</p>
              <p><span className="text-muted-foreground">驗屋日期：</span>{date}</p>
              <p><span className="text-muted-foreground">輪次：</span>{roundLabel(round)}</p>
              <p><span className="text-muted-foreground">缺失總數：</span>
                <span className="font-bold text-defect">{totalDefects}</span> 項
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {reportSpaces.map(({ id: spaceId, name, categories }) => {
              const space = spaces[name] ?? emptySpace();
              const area = areaFromDimensions(space.dimensions);
              return (
                <section key={spaceId} className="rounded-xl border border-border p-4 print:break-inside-avoid">
                  <div className="mb-3 flex items-baseline justify-between gap-2">
                    <h3 className="font-display text-base font-bold">{name}</h3>
                    <span className="text-xs text-muted-foreground">
                      {area ? `${area.sqm.toFixed(2)} ㎡ / ${area.ping.toFixed(2)} 坪` : "未量測"}
                      {space.moisture.left || space.moisture.right
                        ? ` · 含水率 ${space.moisture.left || "—"}% / ${space.moisture.right || "—"}%`
                        : ""}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {categories.map((cat) => (
                      <div key={cat.id}>
                        <p className="mb-1.5 text-xs font-bold text-muted-foreground">{cat.name}</p>
                        <ol className="space-y-2">
                          {cat.items.map((item, idx) => {
                            const state = space.items[item.id];
                            const meta = STATUS_META[state?.status ?? "pass"];
                            return (
                              <li
                                key={item.id}
                                className={`rounded-lg p-3 ${state?.status === "defect" ? "bg-defect-soft" : "bg-muted/40"}`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-semibold">
                                    {idx + 1}. {item.title}
                                  </p>
                                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${meta.className}`}>
                                    {meta.label}
                                  </span>
                                </div>
                                {state?.note && <p className="mt-1 text-sm text-muted-foreground">{state.note}</p>}
                                {(state?.photos.length ?? 0) > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {state!.photos.map((p) => (
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
                            );
                          })}
                        </ol>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
            {reportSpaces.length === 0 && (
              <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
                這一輪目前沒有檢驗項目可列入報告。
              </p>
            )}
          </div>

          {panels.length > 0 && (
            <section className="rounded-xl border border-border p-4 print:break-inside-avoid">
              <h3 className="mb-3 font-display text-base font-bold">配電箱明細</h3>
              <div className="space-y-2">
                {panels.map((p) => (
                  <div key={p.id} className="rounded-lg bg-muted/40 p-3 text-sm">
                    <p className="font-semibold">{p.name}</p>
                    <p className="mt-1 text-muted-foreground">
                      {p.amperage ? `額定電流 ${p.amperage}A` : ""}
                      {p.wire_spec ? ` · 線徑 ${p.wire_spec}` : ""}
                      {p.circuits != null ? ` · 迴路數 ${p.circuits}` : ""}
                    </p>
                    {p.note && <p className="mt-1 text-muted-foreground">{p.note}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {(signatures["owner"] || signatures["inspector"]) && (
            <section className="rounded-xl border border-border p-4 print:break-inside-avoid">
              <h3 className="mb-3 font-display text-base font-bold">雙方簽名</h3>
              <div className="grid grid-cols-2 gap-3">
                {(["owner", "inspector"] as const).map((kind) => {
                  const sig = signatures[kind];
                  return (
                    <div key={kind} className="rounded-lg border border-border p-3 text-center">
                      <p className="mb-2 text-xs font-bold text-muted-foreground">
                        {kind === "owner" ? "業主簽名" : "檢查員簽名"}
                      </p>
                      {sig ? (
                        <>
                          <img src={sig.data_url} alt={`${kind} signature`} className="mx-auto h-20 object-contain" />
                          <p className="mt-1 text-xs text-muted-foreground">{sig.signer_name}</p>
                        </>
                      ) : (
                        <p className="py-6 text-xs text-muted-foreground">尚未簽名</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="no-print h-12 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
        >
          列印 / 匯出 PDF
        </button>
      </DialogContent>
    </Dialog>
  );
}
