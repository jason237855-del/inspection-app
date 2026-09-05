import { useEffect, useRef, useState } from "react";
import { Eraser, X } from "lucide-react";

/** Touch-friendly signature capture returning a PNG data URL. */
export function SignaturePad({
  title,
  defaultName,
  onCancel,
  onSave,
}: {
  title: string;
  defaultName: string;
  onCancel: () => void;
  onSave: (dataUrl: string, name: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [name, setName] = useState(defaultName);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111111";
  }, []);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDirty(false);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-display text-base font-bold">{title}</h3>
          <button type="button" aria-label="關閉" onClick={onCancel} className="grid h-9 w-9 place-items-center rounded-lg border border-border">
            <X className="h-4 w-4" />
          </button>
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="簽名者姓名"
          className="mb-3 h-11 w-full rounded-xl border border-input bg-background px-3 text-[16px] outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
        />

        <canvas
          ref={canvasRef}
          className="h-48 w-full touch-none rounded-xl border border-dashed border-border bg-background"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            const ctx = e.currentTarget.getContext("2d");
            if (!ctx) return;
            drawing.current = true;
            const { x, y } = pos(e);
            ctx.beginPath();
            ctx.moveTo(x, y);
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            const ctx = e.currentTarget.getContext("2d");
            if (!ctx) return;
            const { x, y } = pos(e);
            ctx.lineTo(x, y);
            ctx.stroke();
            setDirty(true);
          }}
          onPointerUp={() => (drawing.current = false)}
          onPointerLeave={() => (drawing.current = false)}
        />

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={clear}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold"
          >
            <Eraser className="h-4 w-4" />
            清除
          </button>
          <button
            type="button"
            disabled={!dirty}
            onClick={() => {
              const url = canvasRef.current?.toDataURL("image/png");
              if (url) onSave(url, name.trim());
            }}
            className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-40"
          >
            儲存簽名
          </button>
        </div>
      </div>
    </div>
  );
}
