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

- 2026-09-06：報告微調兩項：(1) 缺失跟不適用兩種結果的文字都改成紅色(先前只有缺失是紅字，不適用漏掉了)；(2) 章節順序把「配電箱明細」搬到「格局圖」之後、檢查清單之前(先前排在檢查清單跟簽名中間)，目錄順序同步調整。

- 2026-09-06：修正報告列印前幾頁大量空白、內容被拆散的問題。原因：彈出視窗的半透明背景遮罩(`DialogOverlay`)跟檢驗頁面底部固定工具列都是 `position: fixed` 滿版元素，先前只用 `visibility: hidden` 隱藏，但瀏覽器列印多頁文件時會把 `fixed` 元素在「每一頁」都重新保留版面空間，導致每頁都被塞進一大塊空白、報告內容被擠散到好幾頁。改成直接用 `print:hidden`(等同 `display: none`)在列印時把這些元素整個移除，不再保留版面空間。

- 2026-09-06：報告章節內的項目順序改成兩段式：同一章節內先列出缺失／不適用／待複驗項目(照空間分組)，接著才列出正常項目(也照空間分組)，編號在整個章節內連續累加不重置；缺失項目的文字改成紅色(`text-defect`)。原因：使用者希望異常項目更醒目、不要跟大量「無異常」的項目混在一起。

- 2026-09-06：驗屋報告二次改版，比照使用者提供的手工報告參考(PDF)重新排版。新增封面(品牌色塊+驗屋師姓名+案件資訊)、目錄(只列有內容的章節)、格局圖章節(直接嵌入 `project_files` 裡 `kind='floor_plan'` 的已上傳圖片)、空間尺寸總結表格(`space_measurements`)；檢查項目改成**依空間類型分章節**(客廳/臥室/衛浴/廚房/陽台，同類型的多個實際空間合併在同一章、表格編號連續累加)、**表格式**呈現(編號/空間/部位/檢測項目/結果)取代原本一格一張卡片的呈現方式，正常項目顯示「無異常」、異常/不適用項目底色標示，照片以跨欄列附加在項目下方。原因：使用者提供的參考報告排版更專業、更適合直接交給客戶，這次盡量往該方向靠；封面 logo 與平面圖繪製暫不處理(前者無素材來源、後者使用者說會由屋主提供現成圖檔直接上傳嵌入，不需要系統自動畫)。

- 2026-09-06：修正報告列印/匯出 PDF 印出空白頁的問題。原因：先前把報告內容設成 `position: absolute` 想脫離 Dialog 的捲動裁切，但瀏覽器對超過一頁高度的 `absolute` 內容分頁支援很差，會印出空白頁；改成保留在正常文件流（`position: static`），並直接把 Dialog 外層的 `fixed`/`overflow-y-auto`/置中位移這些會裁切內容的樣式，用 `print:` class 在列印時重設掉，讓報告內容可以正常跨頁列印。

- 2026-09-06：重新設計驗屋報告產出（`src/components/inspection/ReportPreview.tsx`）。加入完整檢查清單（不再只列缺失，正常/不適用項目也會列出）、配電箱明細、雙方簽名、案件基本資料（建案/戶別/格局/建商/地址/電話/總坪數）；修正列印/匯出 PDF 的版面問題（改用 `#report-print-area` + `@media print` 規則，脫離原本 Dialog 的捲動裁切，列印時只印報告內容）。原因：使用者反映報告內容不完整、PDF 排版品質差，希望能直接產出一份可交給客戶的正式報告。另外發現並修正 `project_panels.amperage` 欄位型別建錯（誤設成數字，應為文字）的問題，SQL 在 `db/fix_panel_amperage_type.sql`。

- 2026-09-06：修正檢驗項目儲存失敗時完全沒有錯誤提示的問題（`src/lib/inspection-db.ts` 的 `saveItem`/`saveMeasurement`/`addPhotos` 現在會檢查寫入結果並顯示錯誤訊息）。原因：改版後 upsert 的衝突鍵改成四欄位，若使用者裝置還在跑改版前的舊快取，寫入會直接被資料庫拒絕（`42P10` 錯誤），但畫面完全沒提示、看起來像存成功，實際上使用者標記的正常/缺失/備註全部沒有存進資料庫，離開頁面再進來就消失；同時也補上了瀏覽器快取到舊版時的通用防呆。

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
