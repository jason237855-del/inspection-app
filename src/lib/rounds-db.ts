import { supabase } from "@/integrations/supabase/client";

const ROUND_LABELS = ["初驗", "複驗", "三驗", "四驗", "五驗"];

export function roundLabel(round: number): string {
  return ROUND_LABELS[round - 1] ?? `第 ${round} 輪`;
}

/**
 * Carries every current-round defect into a new round (status reset to
 * "pending", prior note kept as `carried_note` for reference), then bumps
 * the project's current_round.
 */
export async function startNextRound(projectId: string, currentRound: number) {
  const nextRound = currentRound + 1;

  const { data: defects, error: readError } = await supabase
    .from("inspection_items")
    .select("space, item_key, note")
    .eq("project_id", projectId)
    .eq("round", currentRound)
    .eq("status", "defect");
  if (readError) throw new Error(readError.message);

  const rows = (defects ?? []).map((d) => ({
    project_id: projectId,
    space: d.space,
    item_key: d.item_key,
    round: nextRound,
    status: "pending",
    carried_note: d.note,
  }));

  if (rows.length) {
    const { error } = await supabase.from("inspection_items").insert(rows);
    if (error) throw new Error(error.message);
  }

  const { error: projectError } = await supabase
    .from("projects")
    .update({ current_round: nextRound, updated_at: new Date().toISOString() })
    .eq("id", projectId);
  if (projectError) throw new Error(projectError.message);

  return { nextRound, carriedCount: rows.length };
}
