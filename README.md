# University Index

按 QS、U.S. News、THE 综合排名及 QS 学科排名浏览大学，并查看本科、硕士、博士申请资料的静态网站。支持繁体中文、简体中文、英文和深色模式，无需后端。

## 数据覆盖（2026-10-27）

| 数据 | 当前覆盖 |
| --- | --- |
| QS World University Rankings 2027 | 前 150 名，含并列共 151 所 |
| THE World University Rankings 2027 | 前 150 名，含并列共 151 所 |
| U.S. News Best Global Universities 2026–2027 | 前 150 名，含并列共 151 所 |
| 三榜院校去重并集 | 216 所 |
| QS 2026 学科/大类排名视图 | 59 类 |
| 有已核对官方申请来源的院校 | 139 所 |
| 已核对的申请来源记录 | 236 条 |
| 具体专业 | 38 个，其中 29 个有逐项核对摘要 |
| 已核对要求摘要 | 67 条：院校/学院通则 38 条，具体专业 29 条 |

**申请资料仍是首批补充，尚未覆盖全部院校的全部专业。** 77 所院校尚无可发布的申请来源，另有 46 条候选来源暂不可用。官网可访问、来源内容核对、要求字段核对是不同状态，不能把来源数视为完整的录取要求数。

学科视图仅包括上述综合排名院校并集中，QS 对应学科名次不超过 150 的学校；不包含只进入学科前 150、未进入三个综合榜前 150 的学校。名次保留官方并列号和区间，例如 `=2`、`101-150`。US News 使用全球大学榜，而非美国国内本科榜。

## 来源与字段含义

- `data/universities.json`：网站直接读取的发布数据，含排名版本、来源、院校、学位通则和具体专业。
- `data/rankings/*.json`：62 个排名提取文件，保存官方链接、版本、核对时间、来源 SHA-256 和规范化名次。
- `data/admissions/catalog.json`：候选官方招生页面，注明学校、学位、专业和页面类型。
- `data/admissions/checks.json`：来源核对结果；不可用页面保留原因，不发布为要求。
- `data/admissions/reviewed.json`：经逐项阅读核对的摘要，`fieldSources` 为各字段提供官方原始链接。

`null` 表示尚未核实，**不表示没有要求**。`source-checked` 仅表示取得相关官方来源，自动摘录不是已核实的最低分数；`reviewed` 表示所列字段有经过阅读核对的摘要，也不表示该专业所有条件已穷尽。院校通则不能代替专业附加要求。

`gpa` 目前兼容保存学位、成绩等级等学术资格描述，不应统一解释为数值 GPA。未公布的分数与日期不作推算；日期只在原文明确申请年度时写入年份。2026 年 1 月 21 日起 TOEFL 使用新分制，只有官网明确给出时才并列记录新旧分数，不自行换算。

网站详情保留官方原始链接、核对时间和状态。`retrievedVia` 记录实际读取方式，部分公开页面通过 Jina Reader 读取；它不是招生规则的发布机构。原始页面缓存不提交到 Git。官方页面内容属于相应发布机构，本站仅提供归属明确的有限摘录与摘要。

## 本地运行与检查

要求 Node.js 18+、Python 3.10+。静态网站可以直接部署到 GitHub Pages 等静态主机；本地应通过 HTTP 打开，避免 `file://` 下 JSON 请求受限。

```powershell
cd F:/UIndex
npm run serve
# 浏览器访问 http://127.0.0.1:8080
npm run check
python -m compileall -q scripts
```

`npm run check` 不需要安装 npm 依赖：使用 Node 内置测试，核对排名来源一致性、并列/区间、检索、学位隔离、来源字段及覆盖计数。

浏览器检查另需 Playwright，可安装到独立工具目录并用 `PLAYWRIGHT_MODULE` 指定其模块位置；默认读取可用的 `playwright` 包。使用已安装的 Edge 时设置：

```powershell
$env:PLAYWRIGHT_MODULE='C:/path/to/node_modules/playwright'
$env:BROWSER_CHANNEL='msedge'
npm run test:browser
```

浏览器检查覆盖排名与学位筛选、学校/专业检索、来源展示、三种语言、主题和手机宽度，并输出忽略提交的 `.cache/desktop.png`、`.cache/mobile.png`。

## 更新数据

```powershell
python -m pip install -r requirements-dev.txt
$env:PYTHONIOENCODING='utf-8'
python scripts/import_rankings.py
# 可选：发现院校官方主页与候选招生目录；目录不会自动变成申请要求
python scripts/discover_websites.py
python scripts/discover_admissions.py
python scripts/collect_admissions.py
npm run check
```

排名脚本固定本次核实的版本和来源结构，换届需更新对应入口并检查发布机构页面结构。重新导入排名后必须运行申请收集脚本，重建申请覆盖计数。

脚本默认使用 `.cache/` 内页面以减少重复请求。真正重新抓取时，应先将该目录移到备份位置，再运行更新；仅重跑命令不代表远端页面已刷新。`collect_admissions.py --reuse-checks` 只为新/变化的目录记录检查来源，复用其他检查并重新应用 `reviewed.json`，不会刷新历史检查日期。

新增资料时先加入官方候选来源并运行收集；阅读实际规则后再向 `reviewed.json` 添加字段摘要和各字段来源。不要从学校综合排名、项目名称、其他学院规则或网页关键词自动推导分数、截止日。最后运行数据与浏览器检查，并检查来源版本和申请年度是否一致。
