import { Link } from "@tanstack/react-router";
import { Home, ClipboardList, ShieldCheck, UserCog } from "lucide-react";

const base =
  "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold text-muted-foreground transition-colors";

export function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-card">
      <div className="mx-auto flex max-w-4xl items-stretch">
        <Link to="/home" className={base} activeProps={{ className: "text-primary" }} activeOptions={{ exact: true }}>
          <Home className="h-5 w-5" />
          首頁
        </Link>
        <Link to="/projects" className={base} activeProps={{ className: "text-primary" }}>
          <ClipboardList className="h-5 w-5" />
          案場列表
        </Link>
        {isAdmin && (
          <Link to="/admin" className={base} activeProps={{ className: "text-primary" }}>
            <ShieldCheck className="h-5 w-5" />
            後台管理
          </Link>
        )}
        <Link to="/profile" className={base} activeProps={{ className: "text-primary" }}>
          <UserCog className="h-5 w-5" />
          個人設定
        </Link>
      </div>
    </nav>
  );
}
