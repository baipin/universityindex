# University Index｜大学申请要求

[English](README.md) · [繁體中文](README.zh-Hant.md) · **简体中文**

按 QS、U.S. News、泰晤士高等教育综合排名及 QS 学科排名浏览院校，检索本科、硕士、博士与具体专业的官方申请资料。静态网站支持简体中文、繁体中文、英文、深色模式及手机布局。

## 数据覆盖

以下为 **2026 年 10 月 27 日**快照；网站实际数量和排名版本由 `data/universities.json` 生成。

| 数据 | 覆盖 |
| --- | --- |
| QS World University Rankings 2027 | 前 150 名，含并列共 151 所 |
| THE World University Rankings 2027 | 前 150 名，含并列共 151 所 |
| U.S. News Best Global Universities 2026–2027 | 前 150 名，含并列共 151 所 |
| 三榜去重院校并集 | 216 所 |
| QS 2026 学科／大类排名 | 59 个视图 |
| 附官方课程／招生查询的院校 | 216 / 216（5 所目前访问受限） |
| 有已核对申请来源的院校 | 141 所 |
| 已核对申请来源记录 | 474 条 |
| 具体专业 | 197 个，其中 193 个有逐项核对摘要 |
| 已核对要求摘要 | 249 条：院校／学院通则 56 条、专业 193 条 |

本轮新增 119 个专业记录，补充或更新剑桥大学、香港科技大学、帝国理工学院和加州大学旧金山分校共 121 个专业的核验摘要，涵盖学术背景、先修课程、专业英语门槛、申请材料、导师／研究计划要求及已公布的 2027 年截止日期。UCSF 目录未公布入学年份日期的项目保留未知截止日期；帝国理工来源中冲突的签证日期单独标注。新增来源均纳入每月 bot 更新。

**申请资料尚未覆盖所有院校的所有专业。** 216 所均有官方课程／招生查询入口；其中 5 所的官网限制自动访问或维护中，已明确标示。详细摘要数据集另有 75 所尚无已核对来源及 45 条暂不可用候选来源。学科视图只显示上述综合排名院校并集中，对应学科前 150 的名次，并非完整学科榜。U.S. News 使用全球大学榜，并非美国国内本科榜。保留 `=2`、`101-150` 等官方并列与区间。

## GitHub 自动更新机器人

[University data bot](.github/workflows/update-data.yml) 在默认分支运行：

| 任务 | 香港时间（UTC+8） | 功能 |
| --- | --- | --- |
| 排名更新 | 每日 08:37 | 检查 QS／THE 综合榜、QS 学科榜的新版本，核实 U.S. News 当前版本并导入官方排名 |
| 申请资料更新 | 每月 1 日 10:17 | 重新下载所有有效候选官方页面，比较指纹并更新原文片段和状态 |
| 手动运行 | Actions → University data bot → Run workflow | 可选排名、申请、全部、离线检查，以及不发布的试运行 |

不需要另建账号、付费 AI 服务或 API 密钥。流程使用 `GITHUB_TOKEN`，以 `github-actions[bot]` 提交数据。须启用 GitHub Actions，且仓库规则须允许流程推送默认分支。分支保护可能拒绝推送；机器人不会强制推送。若仓库政策或后续流程另有需要，可设置已授权的 Actions secret `DATA_BOT_TOKEN`；不要把凭证提交到代码中。

GitHub 排程可能延迟。公开仓库若 60 天没有活动，排程可能被停用；更新中断时请检查 Actions。正常每月检查会产生数据活动。失败通知依 GitHub 个人通知设置。`GITHUB_TOKEN` 的推送通常不会触发其他以 push 启动的 Actions，因此本流程已内置提交前检查。

### 发布与核验机制

- 不会仅因跨年而更改排名年份，必须由官方标题／数据元信息确认。U.S. News 须有官方发布文章明确标示版本。
- 在临时目录下载并验证候选数据；排名不完整、年份倒退或大量申请来源失效时，保留已发布数据。
- U.S. News 暂时封锁请求或无法确认当前版本时，保留其已核对快照和原核对日期，将原因记入报告，其他榜单仍可更新。
- 已核对摘要绑定原文版本指纹；来源变更或失效后，不再自动把旧分数、旧截止日当成已核对。可读的新页面会以待核验状态显示新片段，须重新阅读规则后更新摘要。
- 未知分数、日期保留 课程查询保存在 data/admissions/portals.json，指定入口保存在 portal-routes.json。page-checked 表示页面可读；official-link 表示官方页面所列入口；access-limited 表示目前无法核对。这些状态不代表已核验所有专业要求。每月更新重新检查入口，失败时保留原证据与日期。

国立台湾大学使用正式校名「国立台湾大学／國立臺灣大學」。

`null`，不按关键词、排名或其他学院规则推测。
- 每日只有时间戳变化时不提交；来源变更、失效链接及待核验记录保存在 Actions 报告附件，保留 90 天。

**自动刷新来源不等于自动完成录取条件的实质核验。** 官方网站改版或封锁请求时，可能需要修改解析器或来源链接。

## 数据与语言

- `data/universities.json`：发布数据、版本、学位通则、专业与覆盖数。
- `data/ranking-editions.json`：官方版本入口，成功识别／导入新榜后更新。
- `data/rankings/*.json`：官方名次、原始链接、版本、核对日期及 SHA-256。
- `data/admissions/catalog.json`：官方候选页面及适用范围。
- `data/admissions/checks.json`：页面核对结果、版本指纹及失败原因。
- `data/admissions/reviewed.json`：逐项摘要、`fieldSources`、核验日期及原文版本指纹。

`null` 表示尚未核实，不表示没有要求。`source-checked` 只表示官方页面可读；`reviewed` 只适用已列出的核对字段。院校／学院通则与专业附加要求分开保存。历史字段 `gpa` 也可能保存学历资格或成绩等级，并非一定为数值 GPA。TOEFL 新旧分制只按官方明示记录，不自行换算。

院校与地区分别保存繁简显示名称。地区采用 **香港特别行政区／Hong Kong SAR**、**台湾／Taiwan** 等显示方式，保留原始数据的身份对应。构建时以 OpenCC 生成繁体字形，不依赖浏览器 CDN。页首横幅放在限高卡片容器内，使用 `img/ulist.jpg`。

网站显示官方原始链接、核对时间及状态。部分公开页面通过 Jina Reader 读取，原发布机构仍是数据来源；原始缓存不提交到 Git。原文版权属于原发布者，本站提供注明归属的有限片段和摘要。

## 本地开发

需要 Node.js 18+、Python 3.10+；标准数据测试不需要安装 npm 依赖。

```sh
python -m pip install -r requirements-dev.txt
npm run serve
# 打开 http://127.0.0.1:8080
npm run check
python -m unittest discover -s tests -p "test_*.py"
python -m compileall -q scripts
```

浏览器检查需要 Playwright 与浏览器。若模块不在默认搜索路径，设置 `PLAYWRIGHT_MODULE`；使用已安装的 Edge 可设置 `BROWSER_CHANNEL=msedge`，或安装 Playwright Chromium。运行 `npm run test:browser`，检查初始未选校状态、数据载入前操作、独立的官方网站链接、繁体名称、地区、横幅容器尺寸、筛选、来源、主题及五种宽度下展开排名的溢出情况；截图保存于已忽略的 `.cache/`。

## 更新与审核

```sh
python scripts/update_data.py --mode rankings --dry-run
python scripts/update_data.py --mode rankings
python scripts/update_data.py --mode admissions
python scripts/update_data.py --mode all
```

更新器使用全新的候选缓存。底层维护命令：

```sh
python scripts/import_rankings.py --discover-latest --refresh
python scripts/collect_admissions.py --refresh
python scripts/localize_catalog.py
npm run check
```

导入排名后须重建申请资料。可选的 `discover_websites.py`、`discover_admissions.py` 只发现官方链接，不把目录自动视为要求。底层脚本默认复用 `.cache/`；`collect_admissions.py --reuse-checks` 只重新应用摘要，不刷新已有页面或核对日期，不能与 `--refresh` 同用。

新增或更新摘要前须阅读官方实际规则，记录逐字段来源和日期，并以已核对原文版本设置 `sourceFingerprints`。已有摘要只可在重新核验后更换指纹。新进榜院校在补充官方来源前可能没有申请资料。发布前运行数据、更新器与浏览器检查。
