import { useSpaceDimensions } from "@/lib/dimensions-db";
import { useSpaceWindows } from "@/lib/windows-db";
import type { SpaceSettings } from "@/lib/checklist-db";
import { SpecialInputs } from "./SpecialInputs";

/** Renders one spatial module (dimensions or window moisture) for a single space. */
export function SpaceModulePanel({
  projectId,
  spaceName,
  settings,
  kind,
}: {
  projectId: string;
  spaceName: string;
  settings: SpaceSettings;
  kind: "dim" | "win";
}) {
  const dims = useSpaceDimensions(projectId, spaceName);
  const win = useSpaceWindows(projectId, spaceName);

  return (
    <SpecialInputs
      settings={kind === "dim" ? settings : { ...settings, show_dimensions: false }}
      showDimensions={kind === "dim"}
      showWindows={kind === "win"}
      dimensionEntries={dims.entries}
      onAddDimensionEntry={() => void dims.addEntry()}
      onRemoveDimensionEntry={(id) => void dims.removeEntry(id)}
      onUpdateDimensionEntry={dims.updateEntry}
      onAddDimensionPhotos={(id, files) => void dims.addPhotos(id, files)}
      onRemoveDimensionPhoto={(_id, photo) => void dims.removePhoto(photo)}
      windows={win.windows}
      onAddWindow={() => void win.addWindow()}
      onRemoveWindow={(id) => void win.removeWindow(id)}
      onUpdateWindow={win.updateWindow}
      onAddWindowPhotos={(id, files) => void win.addPhotos(id, files)}
      onRemoveWindowPhoto={(_id, photo) => void win.removePhoto(photo)}
    />
  );
}
