# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## 更新紀錄

<!-- 新記錄放最上面（新到舊）。格式：日期 + 做了什麼 + 為什麼。 -->

- 2026-09-06：Page-2 的「開始下一輪複驗」旁邊加一個「強制開始」按鈕，在這一輪還有未檢驗項目時也能跳過並開始下一輪（會明確提示未檢驗項目不會帶入下一輪）。原因：開始複驗的規則是「上一輪要全部檢查完才能開始」，若有項目不小心漏勾會卡住整個流程，需要一個安全閥讓管理者能自行決定要不要跳過。

- 2026-09-06：新增多輪複驗功能(初驗 → 複驗 → 三驗 → 四驗…)。`inspection_items`/`inspection_photos` 加上 `round` 欄位、`projects` 加上 `current_round`;開始下一輪時自動把上一輪的缺失項目複製進新輪次(狀態重設為新的 `pending`,原備註存成 `carried_note` 供參考),複驗畫面只列出這一輪要查的項目,也能在複驗中新增新發現的問題。Page-2 儀表板新增輪次顯示與「開始下一輪複驗」按鈕。資料庫改動在 `db/round_migration.sql`,需要另外去 Supabase SQL Editor 執行。原因:驗屋公司實際作業有初驗、複驗甚至三驗四驗,複驗只需要重查上一輪的缺失,原本系統完全沒有輪次概念,複驗會直接覆蓋初驗紀錄。

- 2026-09-06：更換網站 favicon（`public/favicon.ico`）為屋型 + 眼睛的新 icon。原因：使用者提供新的品牌圖示，取代原本的預設圖示。

- 2026-09-06：修正 `useSession`（`src/lib/useSession.ts`）的競態條件：角色查詢還沒回來就先把 `loading` 設成 `false`。原因：導致「系統後台」「後台管理」等靠 `realRole` 判斷權限的頁面，在角色資料還沒抓到時被誤判成非管理者而導回案件列表，網路速度不同造成「有時候」進得去、有時候進不去。

- 2026-09-06：系統後台的團隊成員列表新增「改密碼」功能（`adminSetPassword` server function + 對應 UI），管理者可直接幫成員設定新密碼。原因：Supabase 內建 email 服務發信頻率限制很低，忘記密碼流程常常因為 rate limit 收不到重設信，需要不靠 email 也能重設密碼的管道。

- 2026-09-06：新增本更新紀錄段落與 CLAUDE.md 規則，要求每次實質更新都要記一筆。原因：讓專案異動有可追溯的歷史。
- 2026-09-06：修正新 Supabase 專案所有資料表缺少 `id` 欄位預設值（`gen_random_uuid()`）的問題，並修正 `ensure_membership` 函式改為「第一位註冊帳號自動成為管理員，之後為檢查員」。原因：先前建表時漏掉預設值，導致新增資料（建案件、上傳照片等）全部會失敗；角色指派邏輯也沒有照登入頁文案運作。
- 2026-09-06：切換 Nitro 建置目標為 Vercel（`vite.config.ts` 加上 `nitro: { preset: "vercel" }`）。原因：原本 Lovable 預設會建置成 Cloudflare 格式，要部署到 Vercel 需要明確指定輸出格式。
- 2026-09-06：在新 Supabase 專案（`ralwrsmiwqqzmaimonfx`）補回 RLS 權限政策、`has_role`/`can_access_project`/`ensure_membership` 函式、必要的 UNIQUE/FOREIGN KEY 限制、Storage bucket 與 Realtime 設定。原因：直接匯入 CSV 建立的簡化版資料表沒有任何權限保護與完整性限制，程式的 upsert、權限判斷等功能會失敗或不安全。
- 2026-09-06：把程式的 Supabase 連線從舊專案切換到新專案（`ralwrsmiwqqzmaimonfx`），並依照舊專案的 CSV 匯出資料建立對應資料表、匯入既有資料。原因：使用者要求搬遷到新的 Supabase 專案。
- 2026-09-06：初始化 git repository，將專案推送到 GitHub（`jason237855-del/inspection-app`），並將 `.env`、`db/`（含真實使用者個資的資料庫匯出檔）排除於版控之外。原因：使用者要求把專案上傳到 GitHub，同時避免外洩機密金鑰與個資。
