import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Camera, ClipboardList, Droplets, Loader2, Ruler } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "驗屋現場紀錄系統 | 缺失拍照與報告產出" },
      {
        name: "description",
        content:
          "行動優先的驗屋現場紀錄工具：分空間檢查清單、缺失快速標籤、拍照上傳、尺寸坪數與含水率量測，一鍵產出驗屋報告。",
      },
      { property: "og:title", content: "驗屋現場紀錄系統" },
      {
        property: "og:description",
        content: "分空間檢查、缺失拍照、含水率量測與驗屋報告產出，專為現場驗屋人員設計。",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: ClipboardList, title: "分空間檢查清單", desc: "十大空間、四大工項，逐項標記正常或缺失。" },
  { icon: Camera, title: "缺失拍照存證", desc: "現場拍照即時上傳雲端，隨案件永久保存。" },
  { icon: Ruler, title: "尺寸與坪數換算", desc: "輸入長寬高，自動計算面積與坪數。" },
  { icon: Droplets, title: "含水率量測", desc: "記錄窗框左右側含水率，超標即列為缺失。" },
];

function Landing() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (data.session?.user) void navigate({ to: "/home", replace: true });
      else setChecking(false);
    });
    return () => {
      alive = false;
    };
  }, [navigate]);

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="載入中" />
      </div>
    );
  }

  return (

    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-16">
        <div className="flex items-center gap-2 text-primary">
          <ClipboardList className="h-6 w-6" />
          <span className="font-display text-sm font-bold tracking-widest">INSPECTION FIELD LOG</span>
        </div>
        <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight tracking-tight">
          驗屋現場紀錄系統
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          管理者建立案件並指派檢查員，檢查員在手機或平板上完成清單、拍照與量測，所有資料即時儲存於雲端，換裝置登入也不遺失。
        </p>

        <Link
          to="/auth"
          className="mt-6 inline-flex h-12 items-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground"
        >
          登入 / 註冊
        </Link>

        <div className="mt-12 grid gap-3 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <section key={f.title} className="rounded-2xl border border-border bg-surface p-4 shadow-card">
              <f.icon className="h-5 w-5 text-primary" />
              <h2 className="mt-2 font-display text-base font-bold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
