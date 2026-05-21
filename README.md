# IFA 網站《閒錢增值體檢》— 實作版

*由 Claude Design handoff bundle 實作為純靜態站 · 2026-05-19*

接住 Facebook / Instagram 付費廣告流量嘅 4 版網站。手寫靜態 HTML/CSS/JS,**無 framework、無 build step** —— 直接喺瀏覽器開 `index.html` 就行到。

## 檔案

| 檔 | 用途 |
|---|---|
| `index.html` | 落地頁(連《閒錢增值體檢》計算機 + lead 表單)|
| `about.html` | About Alex |
| `cases.html` | 客戶情境(4 個 case,長 scroll)|
| `legal.html` | 免責及私隱 |
| `styles.css` | 設計 token + 全站樣式 |
| `app.js` | 計算機、導航、scroll-reveal、FAQ、lead 表單 |

## 同原型嘅分別

Claude Design 原型用 React + 瀏覽器內 Babel(原型用途)。此版按 handoff README 指示,**視覺 1:1 重做成純靜態站**:更快(無 3 個 CDN script + 即時編譯)、合 IFA project「無 build step」標準。Tweaks panel(配色/字體/標題切換)係設計探索工具,production 已移除,鎖定設計師預設。

## 本機預覽

```
cd "IFA/website/site" && python3 -m http.server 8000
```
開 `http://localhost:8000/`。(直接 file:// 開都得,計算機照 work。)

## ⛔ 上線前未完成 — 交 Claude Code / Alex 收尾

### A. Placeholder(全部喺頁面以橙色 `[填]` highlight,grep `placeholder-fill` 即見)
- [ ] **Alex 全名 / 姓氏** — `about.html`
- [ ] **持牌號碼** — `index.html`(信任段 + footer)、`about.html`、`legal.html`、footer ×4
- [ ] **WhatsApp wa.me 連結** — 4 版 footer + hero/CTA 嘅 `href="#whatsapp"`
- [ ] **Calendly 連結** — footer ×4、`about.html` CTA、表單成功狀態(`app.js`)
- [ ] **Email** — footer ×4、`legal.html`
- [ ] **網域** — 各 `<link rel="canonical">` 同 og:url
- [ ] **og-image.png** — 加一張 og 圖入 `site/`

### B. 接駁(`app.js` 內有 `TODO` 註解標位)
- [ ] **Lead 表單後端** — 接 Google Sheet / CRM + email 通知 Alex(現時只前端顯示成功狀態,資料無離開瀏覽器)
- [ ] **Meta Pixel** — `index.html` `<head>` 貼 base code;`app.js` 已備好 `fbq('track','Lead')`,Pixel 一裝即生效
- [ ] **Google Analytics (GA4)** — `index.html` `<head>` 貼 gtag.js

### C. 合規 ⛔ HARD STOP
- [ ] **計算機假設參數** — `app.js` 頂 `CONFIG`(通脹 2% / 低息 0.5% / 說明性配置 4.5%)須經 **AMG compliance** 確認。改 CONFIG 後要同步改 `index.html` 計算機「後台假設」行 + empathy 段數字。
- [ ] **全站文案 + 免責 wording** 交 AMG principal / compliance team 書面 sign-off(見 IFA 根目錄 `site-compliance-review.md`)。
- [ ] 已守紅線:零真人相 / 零 AI 假人;無「保證 / 穩賺 / 零風險」字眼;無點名保險公司;無冷推廣保費融資;About 無數字流;每頁尾 + 計算機區雙重免責。

### D. 上線
攞到 sign-off + placeholder 填好 → 建 public repo → GitHub Pages。此站同 `cataillarp.github.io`(劇本殺身份)**完全分開**。
