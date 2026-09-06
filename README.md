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

- 2026-09-06：新增本更新紀錄段落與 CLAUDE.md 規則，要求每次實質更新都要記一筆。原因：讓專案異動有可追溯的歷史。
- 2026-09-06：修正新 Supabase 專案所有資料表缺少 `id` 欄位預設值（`gen_random_uuid()`）的問題，並修正 `ensure_membership` 函式改為「第一位註冊帳號自動成為管理員，之後為檢查員」。原因：先前建表時漏掉預設值，導致新增資料（建案件、上傳照片等）全部會失敗；角色指派邏輯也沒有照登入頁文案運作。
- 2026-09-06：切換 Nitro 建置目標為 Vercel（`vite.config.ts` 加上 `nitro: { preset: "vercel" }`）。原因：原本 Lovable 預設會建置成 Cloudflare 格式，要部署到 Vercel 需要明確指定輸出格式。
- 2026-09-06：在新 Supabase 專案（`ralwrsmiwqqzmaimonfx`）補回 RLS 權限政策、`has_role`/`can_access_project`/`ensure_membership` 函式、必要的 UNIQUE/FOREIGN KEY 限制、Storage bucket 與 Realtime 設定。原因：直接匯入 CSV 建立的簡化版資料表沒有任何權限保護與完整性限制，程式的 upsert、權限判斷等功能會失敗或不安全。
- 2026-09-06：把程式的 Supabase 連線從舊專案切換到新專案（`ralwrsmiwqqzmaimonfx`），並依照舊專案的 CSV 匯出資料建立對應資料表、匯入既有資料。原因：使用者要求搬遷到新的 Supabase 專案。
- 2026-09-06：初始化 git repository，將專案推送到 GitHub（`jason237855-del/inspection-app`），並將 `.env`、`db/`（含真實使用者個資的資料庫匯出檔）排除於版控之外。原因：使用者要求把專案上傳到 GitHub，同時避免外洩機密金鑰與個資。
