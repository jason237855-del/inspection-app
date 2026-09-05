export type StatusKey = "scheduled" | "in_progress" | "pending_recheck" | "completed";

export const STATUS_META: Record<StatusKey, { label: string; className: string }> = {
  scheduled: { label: "待檢驗", className: "bg-muted text-muted-foreground" },
  in_progress: { label: "驗屋中", className: "bg-warn-soft text-warn" },
  pending_recheck: { label: "待複驗", className: "bg-recheck-soft text-recheck" },
  completed: { label: "已完成", className: "bg-pass-soft text-pass" },
};

export function statusKey(raw: string | null | undefined): StatusKey {
  const v = (raw ?? "").toLowerCase();
  if (v.includes("complete") || v.includes("done") || v === "已完成") return "completed";
  if (v.includes("recheck") || v.includes("review") || v === "待複驗") return "pending_recheck";
  if (v.includes("progress") || v === "驗屋中") return "in_progress";
  return "scheduled";
}

export const STATUS_ORDER: StatusKey[] = ["scheduled", "in_progress", "pending_recheck", "completed"];
