import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PanelManager } from "@/components/project/PanelManager";
import { useProjectOverview } from "@/lib/project-overview";

export const Route = createFileRoute("/_authenticated/panels/$projectId")({
  head: () => ({
    meta: [
      { title: "電箱管理 | 驗屋現場紀錄系統" },
      { name: "description", content: "獨立電箱管理頁：主電源規格、迴路配置與多電箱切換編輯。" },
      { property: "og:title", content: "電箱管理" },
      { property: "og:description", content: "主電源規格、迴路卡片配置與多電箱切換。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PanelsPage,
});

function PanelsPage() {
  const { projectId } = useParams({ from: "/_authenticated/panels/$projectId" });
  const o = useProjectOverview(projectId);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-surface px-3 py-2">
        <Link
          to="/project/$projectId"
          params={{ projectId }}
          aria-label="返回案場總覽"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-[17px] font-extrabold">
          電箱管理{o.project?.name ? ` - ${o.project.name}` : ""}
        </h1>
      </header>

      <main className="p-3">
        <PanelManager projectId={projectId} />
      </main>
    </div>
  );
}
