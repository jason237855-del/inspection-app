import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { areaFromDimensions, defectCount, emptySpace, type ItemState, type SpaceState } from "@/lib/inspection-store";
import { FILE_BUCKET } from "@/lib/project-overview";
import { roundLabel } from "@/lib/rounds-db";

export type ReportItem = { id: string; title: string };
export type ReportCategory = { id: string; name: string; items: ReportItem[] };
export type ReportSpace = { id: string; name: string; categories: ReportCategory[] };

type PanelRow = { id: string; name: string; amperage: string; wire_spec: string; circuits: number | null; note: string };
type SignatureRow = { kind: string; signer_name: string; data_url: string };
type PlanImage = { id: string; name: string; url: string };
type MeasurementRow = { space: string; length_cm: number | null; width_cm: number | null; height_cm: number | null };

const RESULT_LABEL: Record<ItemState["status"], string> = {
  pass: "無異常",
  defect: "缺失",
  na: "不適用",
  pending: "待複驗",
};

/** Chapters merge same-type spaces together (客廳/臥室/衛浴/廚房/陽台), matching
 * how the reference report is organized — not one chapter per literal space. */
const SPACE_TYPE_RULES: [pattern: string, label: string][] = [
  ["客廳", "客廳空間"],
  ["臥室", "臥室空間"],
  ["衛浴", "衛浴空間"],
  ["廚房", "廚房空間"],
  ["陽台", "陽台空間"],
];
function spaceTypeOf(name: string): string {
  return SPACE_TYPE_RULES.find(([kw]) => name.includes(kw))?.[1] ?? name;
}

function rowClassFor(state: ItemState | undefined) {
  const status = state?.status ?? "pass";
  if (status === "defect") return "bg-defect-soft";
  if (status === "na") return "bg-muted";
  if (status === "pending") return "bg-warn-soft";
  if (state?.note || (state?.photos.length ?? 0) > 0) return "bg-pass-soft/40";
  return "";
}

function resultTextFor(state: ItemState | undefined) {
  const status = state?.status ?? "pass";
  const base = RESULT_LABEL[status];
  if (status === "pass") return state?.note ? `${base}（${state.note}）` : base;
  return state?.note || base;
}

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
  assignedInspector,
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
  assignedInspector?: string | null | undefined;
  round?: number;
  spaces: Record<string, SpaceState>;
  reportSpaces: ReportSpace[];
}) {
  const [panels, setPanels] = useState<PanelRow[]>([]);
  const [signatures, setSignatures] = useState<Record<string, SignatureRow>>({});
  const [inspectorName, setInspectorName] = useState("");
  const [planImages, setPlanImages] = useState<PlanImage[]>([]);
  const [measurements, setMeasurements] = useState<MeasurementRow[]>([]);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const [{ data: panelRows }, { data: sigRows }, { data: planFiles }, { data: measureRows }, profile] =
        await Promise.all([
          supabase
            .from("project_panels")
            .select("id, name, amperage, wire_spec, circuits, note")
            .eq("project_id", projectId)
            .order("sort")
            .order("created_at"),
          supabase.from("project_signatures").select("kind, signer_name, data_url").eq("project_id", projectId),
          supabase
            .from("project_files")
            .select("id, name, path, mime")
            .eq("project_id", projectId)
            .eq("kind", "floor_plan")
            .like("mime", "image/%"),
          supabase
            .from("space_measurements")
            .select("space, length_cm, width_cm, height_cm")
            .eq("project_id", projectId),
          assignedInspector
            ? supabase.from("profiles").select("full_name").eq("id", assignedInspector).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
      setPanels((panelRows as PanelRow[]) ?? []);
      setSignatures(Object.fromEntries(((sigRows as SignatureRow[]) ?? []).map((r) => [r.kind, r])));
      setMeasurements((measureRows as MeasurementRow[]) ?? []);
      setInspectorName((profile.data as { full_name?: string } | null)?.full_name ?? "");

      const files = planFiles ?? [];
      const signed = files.length
        ? (await supabase.storage.from(FILE_BUCKET).createSignedUrls(files.map((f) => f.path), 3600)).data ?? []
        : [];
      setPlanImages(files.map((f, i) => ({ id: f.id, name: f.name, url: signed[i]?.signedUrl ?? "" })));
    })();
  }, [open, projectId, assignedInspector]);

  const spaceNames = reportSpaces.map((s) => s.name);
  const totalDefects = spaceNames.reduce((n, s) => n + defectCount(spaces[s]), 0);

  const chapters = useMemo(() => {
    const order: string[] = [];
    const byType = new Map<string, ReportSpace[]>();
    for (const sp of reportSpaces) {
      const type = spaceTypeOf(sp.name);
      if (!byType.has(type)) {
        byType.set(type, []);
        order.push(type);
      }
      byType.get(type)!.push(sp);
    }
    return order.map((type) => ({ type, spaces: byType.get(type)! }));
  }, [reportSpaces]);

  const measurementRows = measurements
    .filter((m) => m.length_cm || m.width_cm)
    .map((m) => ({
      space: m.space,
      length: m.length_cm,
      width: m.width_cm,
      area: areaFromDimensions({
        length: String(m.length_cm ?? ""),
        width: String(m.width_cm ?? ""),
        height: String(m.height_cm ?? ""),
      }),
    }));

  const tocEntries = [
    "封面",
    ...(planImages.length ? ["格局圖"] : []),
    ...chapters.map((c) => c.type),
    ...(panels.length ? ["配電箱明細"] : []),
    ...(signatures["owner"] || signatures["inspector"] ? ["雙方簽名"] : []),
    ...(measurementRows.length ? ["空間尺寸總結"] : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto print:static print:m-0 print:max-h-none print:w-full print:max-w-none print:translate-x-0 print:translate-y-0 print:overflow-visible print:border-none print:p-0 print:shadow-none">
        <div id="report-print-area">
          {/* ---------- 封面 ---------- */}
          <section className="-m-6 mb-6 rounded-t-xl bg-primary p-8 text-primary-foreground print:m-0 print:break-after-page print:rounded-none">
            {/* logo <img> 版位：待使用者提供 logo 檔案後補上 */}
            <h1 className="font-display text-2xl font-bold tracking-tight">驗屋紀錄報告</h1>
            {inspectorName && <p className="mt-1 text-sm opacity-90">驗屋師：{inspectorName}</p>}
            <div className="mt-6 space-y-2 rounded-xl bg-white/10 p-4 text-sm">
              <Row label="建案／案場" value={project} />
              <Row label="客戶" value={customer} />
              <Row label="戶別" value={unit} />
              <Row label="格局" value={layout} />
              <Row label="總坪數" value={totalPing ? `${totalPing} 坪` : ""} />
              <Row label="建商" value={developer} />
              <Row label="地址" value={address} />
              <Row label="聯絡電話" value={clientPhone} />
              <Row label="驗屋日期" value={date} />
              <Row label="輪次" value={roundLabel(round)} />
            </div>
          </section>

          {/* ---------- 目錄 ---------- */}
          <section className="mb-6 print:break-after-page">
            <ChapterTitle>目錄</ChapterTitle>
            <ol className="space-y-1.5 text-sm">
              {tocEntries.map((t, i) => (
                <li key={t} className="flex items-baseline gap-2">
                  <span className="w-6 shrink-0 text-muted-foreground">{i + 1}.</span>
                  <span className="font-semibold">{t}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4 flex justify-between rounded-xl border border-border bg-muted p-3 text-sm">
              <span className="text-muted-foreground">缺失總數</span>
              <span className="font-bold text-defect">{totalDefects} 項</span>
            </div>
          </section>

          {/* ---------- 格局圖 ---------- */}
          {planImages.length > 0 && (
            <section className="mb-6 print:break-after-page">
              <ChapterTitle>格局圖</ChapterTitle>
              <div className="space-y-3">
                {planImages.map((img) => (
                  <img key={img.id} src={img.url} alt={img.name} className="w-full rounded-xl border border-border" />
                ))}
              </div>
            </section>
          )}

          {/* ---------- 依空間類型分章節的檢查清單 ---------- */}
          {chapters.map(({ type, spaces: chapterSpaces }) => {
            const rows = buildChapterRows(chapterSpaces, spaces);
            return (
              <section key={type} className="mb-6 print:break-before-page">
                <ChapterTitle>{type}缺失報告</ChapterTitle>
                <table className="w-full border-collapse overflow-hidden rounded-xl border border-border text-sm">
                  <thead>
                    <tr className="bg-muted text-left text-xs font-bold text-muted-foreground">
                      <th className="w-10 border-b border-border p-2">編號</th>
                      <th className="w-20 border-b border-border p-2">空間</th>
                      <th className="w-28 border-b border-border p-2">部位</th>
                      <th className="border-b border-border p-2">檢測項目</th>
                      <th className="w-40 border-b border-border p-2">結果</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      if (row.kind === "section") {
                        return (
                          <tr key={row.key}>
                            <td colSpan={5} className={`border-b border-border p-2 text-sm font-bold ${row.className}`}>
                              {row.label}
                            </td>
                          </tr>
                        );
                      }
                      if (row.kind === "divider") {
                        return (
                          <tr key={row.key}>
                            <td colSpan={5} className="border-b border-border bg-muted/60 p-2 text-xs font-bold text-muted-foreground">
                              {row.spaceName}
                            </td>
                          </tr>
                        );
                      }
                      if (row.kind === "photos") {
                        return (
                          <tr key={row.key} className={row.rowClass}>
                            <td colSpan={5} className="border-b border-border p-2">
                              <div className="flex flex-wrap gap-2">
                                {row.photos.map((p) => (
                                  <img key={p.id} src={p.url} alt={p.name} className="h-20 w-20 rounded-md border border-border object-cover" />
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      return (
                        <tr key={row.key} className={`${row.rowClass} ${row.textClass}`}>
                          <td className="border-b border-border p-2 align-top">{row.index}.</td>
                          <td className="border-b border-border p-2 align-top">{row.spaceName}</td>
                          <td className="border-b border-border p-2 align-top">{row.categoryName}</td>
                          <td className="border-b border-border p-2 align-top">{row.title}</td>
                          <td className="border-b border-border p-2 align-top">{row.result}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            );
          })}
          {chapters.length === 0 && (
            <p className="mb-6 rounded-xl border border-border p-4 text-sm text-muted-foreground">
              這一輪目前沒有檢驗項目可列入報告。
            </p>
          )}

          {/* ---------- 配電箱明細 ---------- */}
          {panels.length > 0 && (
            <section className="mb-6 print:break-inside-avoid">
              <ChapterTitle>配電箱明細</ChapterTitle>
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

          {/* ---------- 雙方簽名 ---------- */}
          {(signatures["owner"] || signatures["inspector"]) && (
            <section className="mb-6 print:break-inside-avoid">
              <ChapterTitle>雙方簽名</ChapterTitle>
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

          {/* ---------- 空間尺寸總結 ---------- */}
          {measurementRows.length > 0 && (
            <section className="mb-6 print:break-before-page">
              <ChapterTitle>空間尺寸總結</ChapterTitle>
              <table className="w-full border-collapse overflow-hidden rounded-xl border border-border text-sm">
                <thead>
                  <tr className="bg-muted text-left text-xs font-bold text-muted-foreground">
                    <th className="border-b border-border p-2">空間名稱</th>
                    <th className="border-b border-border p-2">長度 (cm)</th>
                    <th className="border-b border-border p-2">寬度 (cm)</th>
                    <th className="border-b border-border p-2">面積 (㎡)</th>
                    <th className="border-b border-border p-2">坪數</th>
                  </tr>
                </thead>
                <tbody>
                  {measurementRows.map((m) => (
                    <tr key={m.space}>
                      <td className="border-b border-border p-2 font-semibold">{m.space}</td>
                      <td className="border-b border-border p-2">{m.length ?? "—"}</td>
                      <td className="border-b border-border p-2">{m.width ?? "—"}</td>
                      <td className="border-b border-border p-2">{m.area ? m.area.sqm.toFixed(2) : "—"}</td>
                      <td className="border-b border-border p-2">{m.area ? m.area.ping.toFixed(2) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

function Row({ label, value }: { label: string; value?: string | null | undefined }) {
  return (
    <p>
      <span className="opacity-80">{label}：</span>
      {value || "—"}
    </p>
  );
}

function ChapterTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 border-b-2 border-primary pb-2 font-display text-lg font-bold">{children}</h2>;
}

type ChapterRow =
  | { kind: "section"; key: string; label: string; className: string }
  | { kind: "divider"; key: string; spaceName: string }
  | {
      kind: "item";
      key: string;
      index: number;
      spaceName: string;
      categoryName: string;
      title: string;
      result: string;
      rowClass: string;
      textClass: string;
    }
  | { kind: "photos"; key: string; rowClass: string; photos: SpaceState["items"][string]["photos"] };

/** Flattens a chapter's spaces into table rows, in two passes: defect/na/
 * pending items first (grouped by space), then pass items (also grouped by
 * space) — so problems are never buried among "無異常" rows. Numbering runs
 * continuously across both passes for the whole chapter. */
function buildChapterRows(chapterSpaces: ReportSpace[], spaces: Record<string, SpaceState>): ChapterRow[] {
  const rows: ChapterRow[] = [];
  let n = 0;

  const addGroup = (label: string, className: string, matches: (status: ItemState["status"]) => boolean) => {
    const groupRows: ChapterRow[] = [];
    for (const sp of chapterSpaces) {
      const spaceState = spaces[sp.name] ?? emptySpace();
      const entries: { cat: ReportCategory; item: ReportItem; state: ItemState | undefined }[] = [];
      for (const cat of sp.categories) {
        for (const item of cat.items) {
          const state = spaceState.items[item.id];
          if (matches(state?.status ?? "pass")) entries.push({ cat, item, state });
        }
      }
      if (!entries.length) continue;
      groupRows.push({ kind: "divider", key: `${sp.id}-${label}-divider`, spaceName: sp.name });
      for (const { cat, item, state } of entries) {
        n += 1;
        groupRows.push({
          kind: "item",
          key: item.id,
          index: n,
          spaceName: sp.name,
          categoryName: cat.name,
          title: item.title,
          result: resultTextFor(state),
          rowClass: rowClassFor(state),
          textClass: state?.status === "defect" ? "text-defect font-semibold" : "",
        });
        if ((state?.photos.length ?? 0) > 0) {
          groupRows.push({ kind: "photos", key: `${item.id}-photos`, rowClass: rowClassFor(state), photos: state!.photos });
        }
      }
    }
    if (groupRows.length) {
      rows.push({ kind: "section", key: `section-${label}`, label, className }, ...groupRows);
    }
  };

  addGroup("缺失／不適用項目", "bg-defect-soft text-defect", (s) => s === "defect" || s === "na" || s === "pending");
  addGroup("正常項目", "bg-pass-soft text-pass", (s) => s === "pass");

  return rows;
}
