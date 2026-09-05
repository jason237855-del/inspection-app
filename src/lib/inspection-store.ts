export type Photo = { id: string; url: string; name: string; path?: string };

export type ItemStatus = "pass" | "defect" | "na";

export type ItemState = {
  status: ItemStatus;
  note: string;
  photos: Photo[];
  /** Custom numeric inputs (length/width/height, moisture %) configured per item. */
  values: Record<string, string>;
};

export type Dimensions = { length: string; width: string; height: string };
export type Moisture = { left: string; right: string };

export type SpaceState = {
  items: Record<string, ItemState>;
  dimensions: Dimensions;
  moisture: Moisture;
};

export const blankItem = (): ItemState => ({ status: "pass", note: "", photos: [], values: {} });

export const emptySpace = (): SpaceState => ({
  items: {},
  dimensions: { length: "", width: "", height: "" },
  moisture: { left: "", right: "" },
});

export function defectCount(space: SpaceState | undefined) {
  if (!space) return 0;
  return Object.values(space.items).filter((i) => i.status === "defect").length;
}

export function areaFromDimensions(d: Dimensions) {
  const l = parseFloat(d.length);
  const w = parseFloat(d.width);
  if (!l || !w) return null;
  const sqm = (l * w) / 10000;
  return { sqm, ping: sqm * 0.3025 };
}
