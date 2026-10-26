# University Index｜大學申請要求

[English](README.md) · **繁體中文** · [简体中文](README.zh-Hans.md)

依 QS、U.S. News、泰晤士高等教育綜合排名及 QS 學科排名瀏覽院校，檢索本科、碩士、博士與具體專業的官方申請資料。靜態網站支援繁體中文、簡體中文、英文、深色模式及手機版面。

## 資料覆蓋

以下為 **2026 年 10 月 27 日**快照；網站實際數量與排名版本由 `data/universities.json` 產生。

| 資料 | 覆蓋 |
| --- | --- |
| QS World University Rankings 2027 | 前 150 名，含並列共 151 所 |
| THE World University Rankings 2027 | 前 150 名，含並列共 151 所 |
| U.S. News Best Global Universities 2026–2027 | 前 150 名，含並列共 151 所 |
| 三榜去重院校聯集 | 216 所 |
| QS 2026 學科／大類排名 | 59 個視圖 |
| 附官方課程／招生查詢的院校 | 216 / 216（5 所目前存取受限） |
| 有已核對申請來源的院校 | 140 所 |
| 已核對申請來源紀錄 | 316 條 |
| 具體專業 | 78 個，其中 74 個有逐項核對摘要 |
| 已核對要求摘要 | 130 條：院校／學院通則 56 條、專業 74 條 |

**申請資料尚未涵蓋所有院校的所有專業。** 216 所均有官方課程／招生查詢入口；其中 5 所的官網封鎖自動存取或維護中，已明確標示。詳細摘要資料集另有 76 所尚無已核對來源及 45 條暫不可用候選來源。學科視圖僅顯示上述綜合排名院校聯集中，對應學科前 150 的名次，並非完整學科榜。U.S. News 使用全球大學榜，並非美國國內本科榜。保留 `=2`、`101-150` 等官方並列與區間。

## GitHub 自動更新機器人

[University data bot](.github/workflows/update-data.yml) 在預設分支執行：

| 工作 | 香港時間（UTC+8） | 功能 |
| --- | --- | --- |
| 排名更新 | 每日 08:37 | 檢查 QS／THE 綜合榜、QS 學科榜的新版本，核實 U.S. News 現行版本並匯入官方排名 |
| 申請資料更新 | 每月 1 日 10:17 | 重新下載所有有效候選官方頁面，比較指紋並更新原文片段與狀態 |
| 手動執行 | Actions → University data bot → Run workflow | 可選排名、申請、全部、離線檢查，以及不發布的試跑 |

不需要另建帳號、付費 AI 服務或 API 金鑰。流程使用 `GITHUB_TOKEN`，以 `github-actions[bot]` 提交資料。須啟用 GitHub Actions，且儲存庫規則須允許流程推送預設分支。分支保護可能拒絕推送；機器人不會強制推送。若儲存庫政策或後續流程另有需求，可設定已授權的 Actions secret `DATA_BOT_TOKEN`；不要將憑證提交到程式碼。

GitHub 排程可能延遲。公開儲存庫若 60 天沒有活動，排程可能被停用；更新中斷時請檢查 Actions。正常每月檢查會產生資料活動。失敗通知依 GitHub 個人通知設定。`GITHUB_TOKEN` 的推送通常不會觸發其他以 push 啟動的 Actions，因此本流程已內建提交前檢查。

### 發布與核驗機制

- 不會只因跨年而更改排名年份；須由官方標題／資料中繼資訊確認。U.S. News 須有官方發布文章明確標示版本。
- 在臨時目錄下載並驗證候選資料；排名不完整、年份倒退或大量申請來源失效時，保留已發布資料。
- U.S. News 暫時封鎖請求或無法確認現行版本時，保留其已核對快照與原核對日期，將原因記入報告，其他榜單仍可更新。
- 已核對摘要綁定原文版本指紋；來源變更或失效後，不再自動將舊分數、舊截止日當成已核對。可讀的新頁面會以待核驗狀態顯示新片段，須重新閱讀規則後更新摘要。
- 未知分數、日期保留 課程查詢保存在 data/admissions/portals.json，指定入口保存在 portal-routes.json。page-checked 表示頁面可讀；official-link 表示官方頁面所列入口；access-limited 表示目前無法核對。這些狀態不代表已核驗所有專業要求。每月更新重新檢查入口，失敗時保留原證據與日期。

國立臺灣大學使用正式校名「国立台湾大学／國立臺灣大學」。

`null`，不按關鍵詞、排名或其他學院規則推測。
- 每日只有時間戳變動時不提交；來源變更、失效連結及待核驗紀錄保存在 Actions 報告附件，保留 90 天。

**自動刷新來源不等於自動完成錄取條件的實質核驗。** 官方網站改版或封鎖請求時，可能需要修改解析器或來源連結。

## 資料與語言

- `data/universities.json`：發布資料、版本、學位通則、專業與覆蓋數。
- `data/ranking-editions.json`：官方版本入口，成功識別／匯入新榜後更新。
- `data/rankings/*.json`：官方名次、原始連結、版本、核對日期及 SHA-256。
- `data/admissions/catalog.json`：官方候選頁面及其適用範圍。
- `data/admissions/checks.json`：頁面核對結果、版本指紋及失敗原因。
- `data/admissions/reviewed.json`：逐項摘要、`fieldSources`、核驗日期及原文版本指紋。

`null` 表示尚未核實，不表示沒有要求。`source-checked` 只表示官方頁面可讀；`reviewed` 只適用已列出的核對欄位。院校／學院通則與專業附加要求分開保存。歷史欄位 `gpa` 也可能保存學歷資格或成績等級，並非一定為數值 GPA。TOEFL 新舊分制只按官方明示記錄，不自行換算。

院校與地區分別保存繁簡顯示名稱。地區採用 **香港特別行政區／Hong Kong SAR**、**臺灣／Taiwan** 等顯示方式，保留原始資料的身份對應。建置時以 OpenCC 產生繁體字形，不依賴瀏覽器 CDN。頁首橫幅放在限高卡片容器內，使用 `img/ulist.jpg`。

網站顯示官方原始連結、核對時間及狀態。部分公開頁面透過 Jina Reader 讀取，原發布機構仍為資料來源；原始快取不提交到 Git。原文版權屬原發布者，本站提供有歸屬的有限片段與摘要。

## 本機開發

需要 Node.js 18+、Python 3.10+；標準資料測試不需安裝 npm 相依套件。

```sh
python -m pip install -r requirements-dev.txt
npm run serve
# 開啟 http://127.0.0.1:8080
npm run check
python -m unittest discover -s tests -p "test_*.py"
python -m compileall -q scripts
```

瀏覽器檢查需要 Playwright 與瀏覽器。若模組不在預設搜尋路徑，設定 `PLAYWRIGHT_MODULE`；使用已安裝的 Edge 可設定 `BROWSER_CHANNEL=msedge`，或安裝 Playwright Chromium。執行 `npm run test:browser`，檢查初始未選校狀態、資料載入前操作、獨立的官方網站連結、繁體名稱、地區、橫幅容器尺寸、篩選、來源、主題及五種寬度下展開排名的溢出情形；截圖保存於已忽略的 `.cache/`。

## 更新及審核

```sh
python scripts/update_data.py --mode rankings --dry-run
python scripts/update_data.py --mode rankings
python scripts/update_data.py --mode admissions
python scripts/update_data.py --mode all
```

更新器使用全新候選快取。底層維護指令：

```sh
python scripts/import_rankings.py --discover-latest --refresh
python scripts/collect_admissions.py --refresh
python scripts/localize_catalog.py
npm run check
```

匯入排名後須重建申請資料。可選的 `discover_websites.py`、`discover_admissions.py` 只發現官方連結，不把目錄自動視為要求。底層腳本預設重用 `.cache/`；`collect_admissions.py --reuse-checks` 只重新套用摘要，不刷新既有頁面或核對日期，不能與 `--refresh` 同用。

新增或更新摘要前須閱讀官方實際規則，記錄逐欄來源與日期，並以已核對原文版本設定 `sourceFingerprints`。既有摘要只可在重新核驗後更換指紋。新進榜院校在補充官方來源前可能沒有申請資料。發布前執行資料、更新器與瀏覽器檢查。
