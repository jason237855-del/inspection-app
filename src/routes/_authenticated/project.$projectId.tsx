import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { Fragment, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Building2,
  ClipboardList,
  FileText,
  Image as ImageIcon,
  Info,
  MapPin,
  NotebookPen,
  PenLine,
  Phone,
  Plug,
  Plus,
  RefreshCw,
  Trash2,
  TriangleAlert,
  Upload,
  Users,
  Video,
  Wifi,
  Blinds,
} from "lucide-react";
import { PanelSummaryCard } from "@/components/project/PanelSummaryCard";
import { SignaturePad } from "@/components/project/SignaturePad";
import { useDashboardLayout } from "@/lib/dashboard-layout";
import { useProjectOverview, type FileRow } from "@/lib/project-overview";
import { STATUS_META, statusKey } from "@/lib/project-status";
import { ROLE_OPTIONS } from "@/lib/roles";
import { roundLabel, startNextRound } from "@/lib/rounds-db";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/project/$projectId")({
  head: () => ({
    meta: [
      { title: "案場總覽 | 驗屋現場紀錄系統" },
      { name: "description", content: "案場摘要儀表板：檢驗統計、基本資料、簽名、檔案、門窗與電箱管理。" },
      { property: "og:title", content: "案場總覽" },
      { property: "og:description", content: "案場摘要儀表板：檢驗統計、簽名與現場管理資訊。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProjectOverviewPage,
});

function ProjectOverviewPage() {
  const { projectId } = useParams({ from: "/_authenticated/project/$projectId" });
  const o = useProjectOverview(projectId);
  const layout = useDashboardLayout();
  const [signing, setSigning] = useState<"owner" | "inspector" | null>(null);
  const [viewer, setViewer] = useState<FileRow | null>(null);
  const [cachedAt, setCachedAt] = useState<string>(() =>
    typeof window === "undefined" ? "" : window.localStorage.getItem(`cache:${projectId}`) ?? "",
  );
  const fileInput = useRef<HTMLInputElement>(null);
  const planInput = useRef<HTMLInputElement>(null);
  const plans = o.files.filter((f) => f.mime.startsWith("image/") || f.mime.includes("pdf"));
  const [startingRound, setStartingRound] = useState(false);

  const p = o.project;
  const status = STATUS_META[statusKey(p?.status)];
  const badge = p?.inspection_package || status.label;
  const currentRound = p?.current_round ?? 1;
  const canStartNextRound = o.metrics.pending === 0 && o.metrics.defect > 0;
  const canForceStartNextRound = o.metrics.pending > 0;

  const handleNextRound = async (force = false) => {
    const confirmMsg = force
      ? `目前還有 ${o.metrics.pending} 項未檢驗，這些項目不會帶入「${roundLabel(currentRound + 1)}」（之後也不會再出現在複驗清單上）。確定要跳過並強制開始嗎？`
      : `確定要開始「${roundLabel(currentRound + 1)}」嗎？會把目前所有缺失項目複製進下一輪複驗清單。`;
    if (!window.confirm(confirmMsg)) return;
    setStartingRound(true);
    try {
      await startNextRound(projectId, currentRound);
      await o.reloadProject();
      await o.reloadMetrics(currentRound + 1);
    } finally {
      setStartingRound(false);
    }
  };

  const tabs = useMemo(() => layout.sections.filter((x) => x.tab_visible), [layout.sections]);
  const orderedBlocks = useMemo(
    () => layout.sections.filter((x) => x.block_visible).map((x) => x.key),
    [layout.sections],
  );

  const goTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const blocks: Record<string, ReactNode> = {
    "metrics": (
      <Card id="metrics" title="檢驗狀態總覽" icon={<ClipboardList className="h-4 w-4 text-primary" />}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric projectId={projectId} status="pending" label="未檢驗" value={o.metrics.pending} className="bg-warn-soft text-warn" />
          <Metric projectId={projectId} status="pass" label="無異常" value={o.metrics.pass} className="bg-pass-soft text-pass" />
          <Metric projectId={projectId} status="defect" label="缺失補驗" value={o.metrics.defect} className="bg-defect-soft text-defect" />
          <Metric projectId={projectId} status="na" label="不適用" value={o.metrics.na} className="bg-recheck-soft text-recheck" />
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            目前輪次：<span className="font-bold text-foreground">{roundLabel(currentRound)}</span>
          </span>
          {canStartNextRound && (
            <button
              type="button"
              onClick={() => void handleNextRound()}
              disabled={startingRound}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-recheck/30 bg-recheck-soft px-3 text-xs font-bold text-recheck disabled:opacity-60"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              開始{roundLabel(currentRound + 1)}
            </button>
          )}
          {canForceStartNextRound && (
            <button
              type="button"
              onClick={() => void handleNextRound(true)}
              disabled={startingRound}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-warn/30 bg-warn-soft px-3 text-xs font-bold text-warn disabled:opacity-60"
            >
              <TriangleAlert className="h-3.5 w-3.5" />
              強制開始{roundLabel(currentRound + 1)}（{o.metrics.pending} 項未驗）
            </button>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            to="/inspect/$projectId"
            params={{ projectId }}
            search={{ report: undefined, status: undefined }}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground"
          >
            <ClipboardList className="h-4 w-4" />
            全部項目
          </Link>
          <Link
            to="/inspect/$projectId"
            params={{ projectId }}
            search={{ report: "1", status: undefined }}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface text-sm font-bold"
          >
            <FileText className="h-4 w-4 text-primary" />
            審查報告
          </Link>
        </div>
      </Card>
    ),
    "plan": (
        <Card
          id="plan"
          title="格局圖與圖資"
          icon={<ImageIcon className="h-4 w-4 text-primary" />}
          action={
            <button
              type="button"
              onClick={() => planInput.current?.click()}
              className="inline-flex h-9 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground"
            >
              <Upload className="h-3.5 w-3.5" />
              上傳
            </button>
          }
        >
          <input
            ref={planInput}
            type="file"
            multiple
            accept="image/*,application/pdf"
            className="sr-only"
            onChange={(e) => {
              const list = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (list.length) void o.uploadFiles(list, "floor_plan");
            }}
          />
          {plans.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              尚未上傳格局圖／客變圖（支援圖片與 PDF）
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {plans.map((f) => {
                const isPdf = f.mime.includes("pdf") || f.name.toLowerCase().endsWith(".pdf");
                return (
                  <li key={f.id} className="overflow-hidden rounded-xl border border-border">
                    <button
                      type="button"
                      onClick={() => (isPdf ? window.open(f.url, "_blank", "noopener") : setViewer(f))}
                      className="block w-full"
                    >
                      {isPdf ? (
                        <div className="grid h-28 place-items-center bg-muted">
                          <FileText className="h-7 w-7 text-muted-foreground" />
                        </div>
                      ) : (
                        <img src={f.url} alt={f.name} className="h-28 w-full object-cover" loading="lazy" />
                      )}
                    </button>
                    <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                      <span className="truncate text-[11px] text-muted-foreground">{f.name}</span>
                      <button
                        type="button"
                        aria-label={`刪除 ${f.name}`}
                        onClick={() => void o.removeFile(f)}
                        className="shrink-0 text-defect"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
    ),
    "basic": (
        <Card id="basic" title="基本資料" icon={<Info className="h-4 w-4 text-primary" />}>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Field label="檢驗套餐" value={p?.inspection_package} />
            <Field label="總坪數" value={p?.total_ping ? `${p.total_ping} 坪` : ""} />
            <Field label="驗屋日期" value={p?.inspection_date ?? ""} />
            <Field label="時間" value={p?.inspection_time} />
            <Field label="主驗人員" value={o.staff.find((s) => s.lead)?.name ?? ""} />
            <Field label="出勤車輛" value={p?.vehicle} />
            <Field label="客戶姓名" value={p?.client_name} />
            <Field label="戶別" value={p?.unit} />
            <div>
              <dt className="field-label">聯絡電話</dt>
              <dd className="mt-0.5">
                {p?.client_phone ? (
                  <a href={`tel:${p.client_phone}`} className="inline-flex items-center gap-1 font-semibold text-primary">
                    <Phone className="h-3.5 w-3.5" />
                    {p.client_phone}
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </dd>
            </div>
            <Field label="建商" value={p?.developer} />
            <div className="col-span-2">
              <dt className="field-label">案場地址</dt>
              <dd className="mt-0.5">
                {p?.address ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-primary"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    {p.address}
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </dd>
            </div>
          </dl>
        </Card>
    ),
    "signatures": (
        <Card id="signatures" title="簽名狀態" icon={<PenLine className="h-4 w-4 text-primary" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["owner", "inspector"] as const).map((kind) => {
              const sig = o.signatures[kind];
              const label = kind === "owner" ? "屋主簽名" : "驗屋師簽名";
              return (
                <div key={kind} className="rounded-xl border border-border p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-bold">{label}</p>
                    <button
                      type="button"
                      onClick={() => setSigning(kind)}
                      className="h-9 rounded-lg border border-border px-3 text-xs font-bold"
                    >
                      {sig ? "重新簽名" : "簽名"}
                    </button>
                  </div>
                  {sig ? (
                    <>
                      <img src={sig.data_url} alt={label} className="h-24 w-full rounded-lg bg-background object-contain" />
                      <p className="mt-2 text-xs text-muted-foreground">
                        {sig.signer_name || "—"}．{new Date(sig.signed_at).toLocaleString("zh-TW")}
                      </p>
                    </>
                  ) : (
                    <p className="grid h-24 place-items-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                      尚未簽名
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
    ),
    "files": (
        <Card
          id="files"
          title="相關檔案"
          icon={<Upload className="h-4 w-4 text-primary" />}
          action={
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="inline-flex h-9 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              新增檔案
            </button>
          }
        >
          <input
            ref={fileInput}
            type="file"
            multiple
            accept="image/*,application/pdf"
            className="sr-only"
            onChange={(e) => {
              const list = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (list.length) void o.uploadFiles(list);
            }}
          />
          {o.files.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              尚未上傳相關檔案或合約文件
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {o.files.map((f) => {
                const isPdf = f.mime.includes("pdf") || f.name.toLowerCase().endsWith(".pdf");
                return (
                  <li key={f.id} className="overflow-hidden rounded-xl border border-border">
                    <button
                      type="button"
                      onClick={() => (isPdf ? window.open(f.url, "_blank", "noopener") : setViewer(f))}
                      className="block w-full"
                    >
                      {isPdf ? (
                        <div className="grid h-24 place-items-center bg-muted">
                          <FileText className="h-7 w-7 text-muted-foreground" />
                        </div>
                      ) : (
                        <img src={f.url} alt={f.name} className="h-24 w-full object-cover" loading="lazy" />
                      )}
                    </button>
                    <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                      <span className="truncate text-[11px] text-muted-foreground">{f.name}</span>
                      <button type="button" aria-label={`刪除 ${f.name}`} onClick={() => void o.removeFile(f)} className="shrink-0 text-defect">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
    ),
    "site-notes": (
        <Card id="site-notes" title="案場備註" icon={<NotebookPen className="h-4 w-4 text-primary" />}>
          <textarea
            value={p?.notes ?? ""}
            onChange={(e) => void o.patchProject({ notes: e.target.value })}
            rows={4}
            className="w-full rounded-xl border border-input bg-background p-3 text-[16px] leading-relaxed outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
          />
          <label className="mt-2 inline-flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={p?.notes_important ?? false}
              onChange={(e) => void o.patchProject({ notes_important: e.target.checked })}
              className="h-5 w-5 rounded border-input accent-[var(--defect)]"
            />
            標記為重要備註
          </label>
        </Card>
    ),
    "builder-notes": (
        <Card id="builder-notes" title="建案備註" icon={<Building2 className="h-4 w-4 text-primary" />}>
          <textarea
            value={p?.builder_notes ?? ""}
            onChange={(e) => void o.patchProject({ builder_notes: e.target.value })}
            rows={4}
            className="w-full rounded-xl border border-input bg-background p-3 text-[16px] leading-relaxed outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
          />
        </Card>
    ),
    "windows": (
        <Card id="windows" title="門窗管理" icon={<Blinds className="h-4 w-4 text-primary" />}>
          {o.windows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              尚未建立門窗紀錄，可於現場檢查頁的含水率模組新增。
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {o.windows.map((w) => (
                <li key={w.space} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="font-semibold">{w.space}</span>
                  <span className="text-muted-foreground">{w.count} 樘</span>
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/inspect/$projectId"
            params={{ projectId }}
            search={{ report: undefined, status: undefined }}
            className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold"
          >
            前往現場門窗紀錄
          </Link>
        </Card>
    ),
    "panels": (
        <Card id="panels" title="電箱管理" icon={<Plug className="h-4 w-4 text-primary" />}>
          <PanelSummaryCard projectId={projectId} />
        </Card>
    ),


    "videos": (
        <Card id="videos" title="影片連結" icon={<Video className="h-4 w-4 text-primary" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <LabeledInput
              label="驗前影片連結"
              value={p?.video_pre_url ?? ""}
              onChange={(v) => void o.patchProject({ video_pre_url: v })}
            />
            <LabeledInput
              label="驗後影片連結"
              value={p?.video_post_url ?? ""}
              onChange={(v) => void o.patchProject({ video_post_url: v })}
            />
          </div>
        </Card>
    ),
    "staff": (
        <Card id="staff" title="出勤人員" icon={<Users className="h-4 w-4 text-primary" />}>
          {o.staff.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              尚未指派出勤人員
            </p>
          ) : (
            <ul className="space-y-2">
              {o.staff.map((s) => (
                <li key={s.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">
                      {s.name}
                      {s.lead && <span className="ml-2 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] text-primary">主驗</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                  </div>
                  <div className="flex gap-1.5">
                    {ROLE_OPTIONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        aria-pressed={s.role === r}
                        onClick={() => void o.setStaffRole(s.user_id, r)}
                        className={cn(
                          "h-9 rounded-lg border px-3 text-xs font-bold transition-colors",
                          s.role === r
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-surface text-muted-foreground",
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
    ),
    "offline": (
        <Card id="offline" title="離線緩存" icon={<Wifi className="h-4 w-4 text-primary" />}>
          <p className="text-sm text-muted-foreground">
            {cachedAt ? `上次緩存：${new Date(cachedAt).toLocaleString("zh-TW")}` : "尚未建立離線緩存"}
          </p>
          <button
            type="button"
            onClick={() => {
              const now = new Date().toISOString();
              window.localStorage.setItem(`cache:${projectId}`, now);
              window.localStorage.setItem(
                `cache-data:${projectId}`,
                JSON.stringify({ project: o.project, metrics: o.metrics, panels: o.panels, staff: o.staff }),
              );
              setCachedAt(now);
            }}
            className="mt-3 inline-flex h-11 items-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
          >
            緩存此案場資料
          </button>
        </Card>
    ),
  };


  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 pt-3">
          <div className="flex items-center gap-3">
            <Link
              to="/projects"
              aria-label="返回案件列表"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="min-w-0 truncate font-display text-lg font-bold tracking-tight">
              <span className={cn("mr-2 rounded-md px-2 py-0.5 text-xs font-bold", status.className)}>{badge}</span>
              {p?.name ?? "載入中…"}
            </h1>
          </div>

          <nav className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-3">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => goTo(t.key)}
                className="h-9 shrink-0 rounded-full border border-border bg-surface px-4 text-[13px] font-semibold text-secondary-foreground hover:bg-muted"
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-4">
        {orderedBlocks.map((k) => (
          <Fragment key={k}>{blocks[k]}</Fragment>
        ))}
      </main>

      {signing && (
        <SignaturePad
          title={signing === "owner" ? "屋主簽名" : "驗屋師簽名"}
          defaultName={
            signing === "owner" ? p?.client_name ?? "" : o.staff.find((s) => s.lead)?.name ?? ""
          }
          onCancel={() => setSigning(null)}
          onSave={(url, name) => {
            void o.saveSignature(signing, url, name);
            setSigning(null);
          }}
        />
      )}

      {viewer && (
        <div className="fixed inset-0 z-50 flex flex-col bg-foreground/90 p-3">
          <button
            type="button"
            onClick={() => setViewer(null)}
            className="mb-3 self-end rounded-lg bg-surface px-4 py-2 text-sm font-bold"
          >
            關閉
          </button>
          <div className="flex-1 overflow-auto">
            <img src={viewer.url} alt={viewer.name} className="mx-auto rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  className,
  projectId,
  status,
}: {
  label: string;
  value: number;
  className: string;
  projectId: string;
  status: "pending" | "pass" | "defect" | "na";
}) {
  return (
    <Link
      to="/inspect/$projectId"
      params={{ projectId }}
      search={{ report: undefined, status }}
      aria-label={`${label} ${value} 項，前往篩選檢視`}
      className={cn(
        "block rounded-xl px-3 py-2.5 text-center transition-transform active:scale-[0.98]",
        className,
      )}
    >
      <p className="font-display text-2xl font-bold leading-tight">{value}</p>
      <p className="text-xs font-semibold">{label}</p>
    </Link>
  );
}

function Card({
  id,
  title,
  icon,
  action,
  children,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-32 rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 font-display text-base font-bold tracking-tight">
          {icon}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <dt className="field-label">{label}</dt>
      <dd className={cn("mt-0.5 truncate font-semibold", !value && "font-normal text-muted-foreground")}>
        {value || "—"}
      </dd>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "numeric" | "text";
}) {
  return (
    <label className="block min-w-0">
      <span className="field-label">{label}</span>
      <input
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-11 w-full rounded-lg border border-input bg-background px-3 text-[15px] outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
      />
    </label>
  );
}
