import { useRef } from "react";
import { Camera, X } from "lucide-react";
import type { Photo } from "@/lib/inspection-store";

/** Photo picker that lets mobile browsers offer camera OR photo library. */
export function PhotoField({
  photos,
  onAdd,
  onRemove,
  label = "拍照 / 從相簿選擇",
  compact,
}: {
  photos: Photo[];
  onAdd: (files: File[]) => void;
  onRemove: (photo: Photo) => void;
  label?: string;
  compact?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className={
          compact
            ? "inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-[13px] font-semibold"
            : "inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
        }
      >
        <Camera className="h-4 w-4" />
        {label}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onAdd(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
      {photos.map((p) => (
        <div key={p.id} className="relative h-16 w-16 overflow-hidden rounded-lg border border-border">
          <img src={p.url} alt={p.name} className="h-full w-full object-cover" />
          <button
            type="button"
            aria-label="刪除照片"
            onClick={() => onRemove(p)}
            className="absolute right-0 top-0 grid h-6 w-6 place-items-center rounded-bl-lg bg-defect text-defect-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
