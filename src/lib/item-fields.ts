/** Optional input blocks an inspection item can show, configured in the backend. */
export const FIELD_OPTIONS = [
  { key: "photo", label: "照片上傳" },
  { key: "note", label: "缺失備註" },
  { key: "dim", label: "尺寸（長寬高）" },
  { key: "moisture", label: "含水率 %" },
] as const;

export type ItemField = (typeof FIELD_OPTIONS)[number]["key"];

export const DEFAULT_FIELDS: ItemField[] = ["photo", "note"];

const KEYS = FIELD_OPTIONS.map((f) => f.key) as string[];

export const asFields = (v: unknown): ItemField[] =>
  Array.isArray(v) ? (v.filter((f) => KEYS.includes(f as string)) as ItemField[]) : [...DEFAULT_FIELDS];

/** Numeric inputs contributed by each field key. */
export const NUMERIC_INPUTS: Record<string, { key: string; label: string; unit: string }[]> = {
  dim: [
    { key: "length", label: "長", unit: "cm" },
    { key: "width", label: "寬", unit: "cm" },
    { key: "height", label: "高", unit: "cm" },
  ],
  moisture: [
    { key: "moisture_left", label: "含水率（左）", unit: "%" },
    { key: "moisture_right", label: "含水率（右）", unit: "%" },
  ],
};
