import { useMemo, useState } from "react";
import { ChevronRight, GripVertical, Minus, Plus, Trash2, X, Check } from "lucide-react";
import { usePanels, type CircuitRecord, type PanelRecord } from "@/lib/panels-db";
import { cn } from "@/lib/utils";

const MAIN_AMPS = ["30", "40", "50", "60", "75", "100"];
const MAIN_WIRES = ["8", "14", "22", "30", "38"];
const BREAKER_SPECS = [
  [1, 15], [1, 20], [1, 30],
  [2, 15], [2, 20], [2, 30], [2, 40], [2, 50], [2, 60], [2, 75],
  [3, 20], [3, 30], [3, 75],
] as const;
const CIRCUIT_WIRES = ["2", "3.5", "5.5", "8", "14", "22", "30"];
const SPACE_TAGS = ["主臥", "主衛", "次臥", "客廳", "陽台", "廚房"];
const COUNT_TAGS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
const APP_TAGS = [
  "全室燈", "ATS", "暖風機", "冷氣", "220V", "IH爐", "加壓馬達", "電熱水器", "全熱交換器", "預留",
];
const SYMBOLS = ["、", "*", "(", ")"];

function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-9 rounded-full border px-3 text-[13px] font-semibold transition-colors",
        active
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border bg-surface text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function Sheet({ title, onClose, actions, children }: {
  title: string;
  onClose: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-card sm:rounded-2xl">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="flex-1 text-[15px] font-extrabold">{title}</h3>
          {actions}
          <button type="button" aria-label="關閉" onClick={onClose} className="p-1 text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** 電箱管理：主畫面卡片格線 + 主電源規格彈窗 + 迴路設定彈窗。 */
export function PanelManager({ projectId }: { projectId: string }) {
  const db = usePanels(projectId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [specOpen, setSpecOpen] = useState(false);
  const [editing, setEditing] = useState<CircuitRecord | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const panel: PanelRecord | undefined =
    db.panels.find((p) => p.id === activeId) ?? db.panels[0];
  const list = useMemo(
    () => db.circuits.filter((c) => c.panel_id === panel?.id).sort((a, b) => a.sort - b.sort),
    [db.circuits, panel?.id],
  );

  const onDrop = (targetId: string) => {
    if (!panel || !dragId || dragId === targetId) return;
    const ids = list.map((c) => c.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    ids.splice(to, 0, ids.splice(from, 1)[0]!);
    setDragId(null);
    void db.reorderCircuits(panel.id, ids);
  };

  if (db.loading) return <p className="text-sm text-muted-foreground">載入中…</p>;

  if (!panel) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">尚未建立電箱</p>
        <button
          type="button"
          onClick={() => void db.addPanel()}
          className="mt-3 inline-flex h-10 items-center gap-1 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> 新增電箱
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* 電箱切換 */}
      <div className="mb-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {db.panels.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActiveId(p.id)}
            className={cn(
              "h-9 shrink-0 rounded-full border px-3 text-[13px] font-bold",
              p.id === panel.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface",
            )}
          >
            {p.name || "電箱"}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void db.addPanel().then((id) => id && setActiveId(id))}
          aria-label="新增電箱"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* 標題列 */}
      <div className="mb-3 flex items-center gap-2">
        <input
          value={panel.name}
          onChange={(e) => void db.updatePanel(panel.id, { name: e.target.value })}
          aria-label="電箱名稱"
          className="h-10 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1 text-[17px] font-extrabold outline-none focus:border-ring"
        />
        <button
          type="button"
          onClick={() => setSpecOpen(true)}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg bg-muted px-3 text-[13px] font-bold text-foreground"
        >
          總電源 {panel.amperage || "—"}A · {panel.wire_spec || "—"}mm²
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          type="button"
          aria-label="刪除電箱"
          onClick={() => void db.removePanel(panel.id).then(() => setActiveId(null))}
          className="shrink-0 text-defect"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* 迴路卡片格線 */}
      <div className="grid grid-cols-2 gap-2">
        {list.map((c) => (
          <button
            key={c.id}
            type="button"
            draggable
            onDragStart={() => setDragId(c.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(c.id)}
            onClick={() => setEditing(c)}
            className={cn(
              "flex min-h-[76px] items-start gap-1 rounded-xl border bg-surface p-2.5 text-left",
              c.elcb ? "border-accent" : "border-border",
              dragId === c.id && "opacity-50",
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block break-words text-[13px] font-semibold leading-snug">
                {c.description || "未命名迴路"}
              </span>
              <span className="mt-1 block text-[12px] font-bold text-muted-foreground">
                {c.poles}P{c.amperage}A · {c.wire_spec}mm²{c.elcb ? " · 漏電" : ""}
              </span>
            </span>
            <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
        <button
          type="button"
          onClick={() => void db.addCircuit(panel.id).then((row) => row && setEditing(row))}
          className="flex min-h-[76px] items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {specOpen && <SpecModal panel={panel} db={db} onClose={() => setSpecOpen(false)} />}
      {editing && (
        <CircuitModal
          circuit={editing}
          db={db}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function SpecModal({
  panel,
  db,
  onClose,
}: {
  panel: PanelRecord;
  db: ReturnType<typeof usePanels>;
  onClose: () => void;
}) {
  const [amp, setAmp] = useState(panel.amperage);
  const [wire, setWire] = useState(panel.wire_spec);
  const [note, setNote] = useState(panel.note);

  return (
    <Sheet title="電箱規格設定" onClose={onClose}>
      <p className="field-label mb-1.5">開關規格 A</p>
      <div className="flex flex-wrap gap-1.5">
        {MAIN_AMPS.map((a) => (
          <Chip key={a} active={amp === a} onClick={() => setAmp(a)}>
            {a}A
          </Chip>
        ))}
      </div>
      <label className="mt-2 flex items-center gap-2 text-[13px] font-semibold text-muted-foreground">
        自訂：
        <input
          value={amp}
          inputMode="decimal"
          onChange={(e) => setAmp(e.target.value)}
          className="h-9 w-24 rounded-lg border border-input bg-background px-2 text-[15px] text-foreground outline-none focus:border-ring"
        />
        A
      </label>

      <p className="field-label mb-1.5 mt-4">線徑 mm²</p>
      <div className="flex flex-wrap gap-1.5">
        {MAIN_WIRES.map((w) => (
          <Chip key={w} active={wire === w} onClick={() => setWire(w)}>
            {w}mm²
          </Chip>
        ))}
      </div>
      <label className="mt-2 flex items-center gap-2 text-[13px] font-semibold text-muted-foreground">
        自訂：
        <input
          value={wire}
          inputMode="decimal"
          onChange={(e) => setWire(e.target.value)}
          className="h-9 w-24 rounded-lg border border-input bg-background px-2 text-[15px] text-foreground outline-none focus:border-ring"
        />
        mm²
      </label>

      <p className="field-label mb-1.5 mt-4">用途說明</p>
      <textarea
        value={note}
        rows={3}
        onChange={(e) => setNote(e.target.value)}
        className="w-full rounded-lg border border-input bg-background p-2.5 text-[15px] outline-none focus:border-ring"
      />

      <button
        type="button"
        onClick={() => {
          void db.updatePanel(panel.id, { amperage: amp, wire_spec: wire, note });
          onClose();
        }}
        className="mt-4 h-12 w-full rounded-xl bg-accent text-[15px] font-extrabold text-accent-foreground"
      >
        儲存
      </button>
    </Sheet>
  );
}

function CircuitModal({
  circuit,
  db,
  onClose,
}: {
  circuit: CircuitRecord;
  db: ReturnType<typeof usePanels>;
  onClose: () => void;
}) {
  const [poles, setPoles] = useState(circuit.poles);
  const [amp, setAmp] = useState(circuit.amperage);
  const [wire, setWire] = useState(circuit.wire_spec);
  const [elcb, setElcb] = useState(circuit.elcb);
  const [desc, setDesc] = useState(circuit.description);
  const [history, setHistory] = useState<string[]>([]);

  const push = (text: string) => {
    setHistory((h) => [...h, desc]);
    setDesc(desc + text);
  };
  const undo = () => {
    setHistory((h) => {
      if (!h.length) return h;
      setDesc(h[h.length - 1]!);
      return h.slice(0, -1);
    });
  };

  return (
    <Sheet
      title="迴路設定"
      onClose={onClose}
      actions={
        <>
          <button
            type="button"
            onClick={() => {
              void db.removeCircuit(circuit.id);
              onClose();
            }}
            className="inline-flex h-9 items-center gap-1 rounded-lg bg-defect-soft px-3 text-[13px] font-bold text-defect"
          >
            <Trash2 className="h-3.5 w-3.5" /> 刪除
          </button>
          <button
            type="button"
            onClick={() => {
              void db.updateCircuit(circuit.id, {
                poles, amperage: amp, wire_spec: wire, elcb, description: desc,
              });
              onClose();
            }}
            className="inline-flex h-9 items-center gap-1 rounded-lg bg-accent px-3 text-[13px] font-bold text-accent-foreground"
          >
            <Check className="h-3.5 w-3.5" /> 儲存
          </button>
        </>
      }
    >
      <p className="field-label mb-1.5">開關規格</p>
      <div className="flex flex-wrap gap-1.5">
        {BREAKER_SPECS.map(([p, a]) => (
          <Chip
            key={`${p}-${a}`}
            active={poles === p && amp === a}
            onClick={() => {
              setPoles(p);
              setAmp(a);
            }}
          >
            {p}P{a}A
          </Chip>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Stepper label="極數 P" value={poles} min={1} max={4} step={1} onChange={setPoles} />
        <Stepper label="安培 A" value={amp} min={5} max={225} step={5} onChange={setAmp} />
      </div>

      <p className="field-label mb-1.5 mt-4">線徑 mm²</p>
      <div className="flex flex-wrap gap-1.5">
        {CIRCUIT_WIRES.map((w) => (
          <Chip key={w} active={wire === w} onClick={() => setWire(w)}>
            {w}
          </Chip>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <p className="field-label flex-1">漏電斷路器</p>
        <button
          type="button"
          role="switch"
          aria-checked={elcb}
          onClick={() => setElcb(!elcb)}
          className={cn(
            "h-9 rounded-full border px-4 text-[13px] font-bold",
            elcb ? "border-accent bg-accent text-accent-foreground" : "border-border bg-surface text-muted-foreground",
          )}
        >
          {elcb ? "有" : "無"}
        </button>
      </div>

      <p className="field-label mb-1.5 mt-4">用途說明</p>
      <textarea
        value={desc}
        rows={2}
        onChange={(e) => {
          setHistory((h) => [...h, desc]);
          setDesc(e.target.value);
        }}
        className="w-full rounded-lg border border-input bg-background p-2.5 text-[15px] outline-none focus:border-ring"
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {SYMBOLS.map((s) => (
          <Chip key={s} onClick={() => push(s)}>
            {s}
          </Chip>
        ))}
        <Chip onClick={undo}>↰ 上一步</Chip>
        <Chip
          onClick={() => {
            setHistory((h) => [...h, desc]);
            setDesc(desc.slice(0, -1));
          }}
        >
          ⌫ 刪除
        </Chip>
        <Chip
          onClick={() => {
            setHistory((h) => [...h, desc]);
            setDesc("");
          }}
        >
          ⓧ 清空
        </Chip>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {SPACE_TAGS.map((t) => (
          <Chip key={t} onClick={() => push(t)}>
            {t}
          </Chip>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {COUNT_TAGS.map((t) => (
          <Chip key={t} onClick={() => push(t)}>
            {t}
          </Chip>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {APP_TAGS.map((t) => (
          <Chip key={t} onClick={() => push(t)}>
            {t}
          </Chip>
        ))}
      </div>
    </Sheet>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-lg border border-border p-2">
      <p className="field-label mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`${label} 減少`}
          onClick={() => onChange(Math.max(min, value - step))}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="flex-1 text-center text-[15px] font-extrabold">{value}</span>
        <button
          type="button"
          aria-label={`${label} 增加`}
          onClick={() => onChange(Math.min(max, value + step))}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
