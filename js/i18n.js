/* UIndex translations: Traditional Chinese (zh-Hant), Simplified Chinese (zh-Hans), English.
 * t(key, vars) with {placeholders}. Static HTML uses data-i18n / data-i18n-aria / data-i18n-title / data-i18n-alt.
 */
(function () {
  "use strict";

  var STRINGS = {
    "zh-Hant": {
      appTitle: "大學申請要求",
      appSubtitle: "QS · US News · 泰晤士 排名前150",
      langLabel: "語言",
      openMenu: "開啟選單",
      closeMenu: "關閉選單",
      settings: "設定",
      appearance: "外觀",
      darkMode: "黑夜模式",
      themeToDark: "切換至黑夜模式",
      themeToLight: "切換至白天模式",
      rankingLabel: "排名",
      levelLabel: "課程類型",
      searchPlaceholder: "搜尋學校、地區或已收錄專業",
      tableSchool: "學校",
      tableRank: "排名",
      tableCountry: "地區",
      tableEmpty: "沒有符合條件的學校",
      sampleBanner: "真實排名；申請資料仍在補充。官方頁面核對與逐項要求核驗分開標示，未核驗的分數及截止日不作推測。",
      globalRankings: "全球綜合排名",
      subjectRankings: "QS 學科排名",
      rankingCount: "{year} 版 · 顯示 {count} 所院校",
      rankingSource: "查看排名官方來源 ↗",
      tieNote: "保留官方並列名次（=）；第150名如有並列，院校數可超過150。",
      subjectScope: "學科視圖只涵蓋三大綜合榜前150名的院校聯集，顯示其學科前150名次；並非該學科的完整榜單。",
      reviewed: "已列字段的摘要已核驗",
      admissionDirectories: "官方申請入口／項目目錄",
      sourceChecked: "官方頁面已核對 · 要求待逐項核驗",
      institutionScope: "院校／學院通則，並非每個專業的統一錄取門檻；請查看具體項目附加要求。",
      unreviewedNote: "已確認官方頁面可讀；尚未逐項核驗分數及日期。下方自動摘錄只供定位原文，請核對上下文。",
      intake: "適用入學批次",
      checkedOn: "頁面核對：{date}",
      officialExcerpts: "查看官方原文片段（自動摘錄）",
      viewSource: "查看原文 ↗",
      expandRankings: "展開 {count} 項已收錄排名",
      specificPrograms: "具體專業（已收錄 {count} 項）",
      noPrograms: "此學位層級的具體專業尚待收錄，不代表學校沒有開設。",
      coverageSummary: "{schools} 所院校 · {subjects} 個 QS 學科分類 · {admissionSchools} 所有申請來源 · {sources} 個已核對來源 · {programs} 個具體專業 · {reviewed} 條已核驗要求摘要",
      listTitle: "學校列表",
      listHint: "點選學校查看詳情",
      detailPlaceholderTitle: "請選擇一所學校",
      detailPlaceholderText: "點擊左側列表中的學校，查看各課程的申請要求。",
      detailOfficial: "官方網站",
      detailRanks: "各排名",
      detailLevels: "課程要求",
      noRequirement: "此層級要求尚未核驗，不代表沒有申請要求。請先查看官方網站。",
      tableGpa: "GPA / 成績",
      tableEnglish: "英文成績",
      tableDeadline: "截止日期",
      tableDocuments: "所需材料",
      levelUndergrad: "本科",
      levelMaster: "碩士（授課／研究）",
      levelPhd: "博士",
      rankNote: "各排名的年份與計算方法不同，不能直接比較。",
      footerDisclaimer: "申請要求會因年份、課程及學院而改變。請以各校官方網站的最新公布為準。",
      footerUpdated: "數據更新：{time}",
      footerNotLoaded: "數據尚未載入",
      loadFailed: "數據加載失敗",
      otherProjects: "其他項目",
      donate: "捐贈我們",
      reportIssue: "報告問題",
      wcagAlt: "符合萬維網聯盟有關無障礙網頁設計指引中2A級別的要求",
      localeTag: "zh-HK",
    },
    "zh-Hans": {
      appTitle: "大学申请要求",
      appSubtitle: "QS · US News · 泰晤士 排名前150",
      langLabel: "语言",
      openMenu: "打开菜单",
      closeMenu: "关闭菜单",
      settings: "设置",
      appearance: "外观",
      darkMode: "夜间模式",
      themeToDark: "切换至夜间模式",
      themeToLight: "切换至白天模式",
      rankingLabel: "排名",
      levelLabel: "课程类型",
      searchPlaceholder: "搜索学校、地区或已收录专业",
      tableSchool: "学校",
      tableRank: "排名",
      tableCountry: "地区",
      tableEmpty: "没有符合条件的学校",
      sampleBanner: "真实排名；申请资料仍在补充。官方页面核对与逐项要求核验分开标示，未核验的分数及截止日不作推测。",
      globalRankings: "全球综合排名",
      subjectRankings: "QS 学科排名",
      rankingCount: "{year} 版 · 显示 {count} 所院校",
      rankingSource: "查看排名官方来源 ↗",
      tieNote: "保留官方并列名次（=）；第150名如有并列，院校数可超过150。",
      subjectScope: "学科视图只涵盖三大综合榜前150名的院校联集，显示其学科前150名次；并非该学科的完整榜单。",
      reviewed: "已列字段的摘要已核验",
      admissionDirectories: "官方申请入口／项目目录",
      sourceChecked: "官方页面已核对 · 要求待逐项核验",
      institutionScope: "院校／学院通则，并非每个专业的统一录取门槛；请查看具体项目附加要求。",
      unreviewedNote: "已确认官方页面可读；尚未逐项核验分数及日期。下方自动摘录只供定位原文，请核对上下文。",
      intake: "适用入学批次",
      checkedOn: "页面核对：{date}",
      officialExcerpts: "查看官方原文片段（自动摘录）",
      viewSource: "查看原文 ↗",
      expandRankings: "展开 {count} 项已收录排名",
      specificPrograms: "具体专业（已收录 {count} 项）",
      noPrograms: "此学位层级的具体专业尚待收录，不代表学校没有开设。",
      coverageSummary: "{schools} 所院校 · {subjects} 个 QS 学科分类 · {admissionSchools} 所有申请来源 · {sources} 个已核对来源 · {programs} 个具体专业 · {reviewed} 条已核验要求摘要",
      listTitle: "学校列表",
      listHint: "点选学校查看详情",
      detailPlaceholderTitle: "请选择一所学校",
      detailPlaceholderText: "点击左侧列表中的学校，查看各课程的申请要求。",
      detailOfficial: "官方网站",
      detailRanks: "各排名",
      detailLevels: "课程要求",
      noRequirement: "此层级要求尚未核验，不代表没有申请要求。请先查看官方网站。",
      tableGpa: "GPA / 成绩",
      tableEnglish: "英语成绩",
      tableDeadline: "截止日期",
      tableDocuments: "所需材料",
      levelUndergrad: "本科",
      levelMaster: "硕士（授课／研究）",
      levelPhd: "博士",
      rankNote: "各排名的年份与计算方法不同，不能直接比较。",
      footerDisclaimer: "申请要求会因年份、课程及学院而改变。请以各校官方网站的最新公布为准。",
      footerUpdated: "数据更新：{time}",
      footerNotLoaded: "数据尚未加载",
      loadFailed: "数据加载失败",
      otherProjects: "其他项目",
      donate: "捐赠我们",
      reportIssue: "报告问题",
      wcagAlt: "符合万维网联盟有关无障碍网页设计指引中2A级别的要求",
      localeTag: "zh-CN",
    },
    en: {
      appTitle: "University Admission Requirements",
      appSubtitle: "Top 150 by QS · US News · THE",
      langLabel: "Language",
      openMenu: "Open menu",
      closeMenu: "Close menu",
      settings: "Settings",
      appearance: "Appearance",
      darkMode: "Dark mode",
      themeToDark: "Switch to dark mode",
      themeToLight: "Switch to light mode",
      rankingLabel: "Ranking",
      levelLabel: "Programme",
      searchPlaceholder: "Search school, region or indexed programme",
      tableSchool: "School",
      tableRank: "Rank",
      tableCountry: "Region",
      tableEmpty: "No schools match your filters",
      sampleBanner: "Real rankings; admissions coverage is in progress. Source checks and reviewed requirements are labelled separately. Unverified scores and deadlines are not inferred.",
      globalRankings: "Global rankings",
      subjectRankings: "QS subject rankings",
      rankingCount: "{year} edition · {count} institutions shown",
      rankingSource: "Official ranking source ↗",
      tieNote: "Official ties (=) are preserved; ties at rank 150 can produce more than 150 institutions.",
      subjectScope: "Subject views cover the union of the global top 150 across QS, THE and US News, showing subject ranks up to 150. They are not the full subject league tables.",
      reviewed: "Listed requirement fields reviewed",
      admissionDirectories: "Official admissions / programme directories",
      sourceChecked: "Official page checked · requirements awaiting review",
      institutionScope: "Institution or graduate-school baseline, not a uniform threshold for every programme. Check programme-specific requirements.",
      unreviewedNote: "The official page was readable; individual scores and dates have not been reviewed. Automatic excerpts below help locate the original wording; check its context.",
      intake: "Applicable intake",
      checkedOn: "Page checked: {date}",
      officialExcerpts: "Official wording (automatic excerpts)",
      viewSource: "View original ↗",
      expandRankings: "Expand {count} indexed rankings",
      specificPrograms: "Specific programmes ({count} indexed)",
      noPrograms: "Specific programmes at this level are not indexed yet; this does not mean none are offered.",
      coverageSummary: "{schools} institutions · {subjects} QS subject categories · {admissionSchools} with admission sources · {sources} checked sources · {programs} specific programmes · {reviewed} reviewed requirement summaries",
      listTitle: "Schools",
      listHint: "Select a school for details",
      detailPlaceholderTitle: "Select a school",
      detailPlaceholderText: "Click a school in the list to see its requirements for each programme.",
      detailOfficial: "Official website",
      detailRanks: "Rankings",
      detailLevels: "Programme requirements",
      noRequirement: "Requirements at this level have not been verified yet. This does not mean no requirements apply. Check the official website.",
      tableGpa: "GPA / grades",
      tableEnglish: "English test",
      tableDeadline: "Deadline",
      tableDocuments: "Documents",
      levelUndergrad: "Undergraduate",
      levelMaster: "Master's (taught / research)",
      levelPhd: "PhD",
      rankNote: "Each ranking uses its own year and method, so they are not directly comparable.",
      footerDisclaimer: "Requirements change by year, programme and faculty. Always check each university's latest official publication.",
      footerUpdated: "Data updated: {time}",
      footerNotLoaded: "Data not loaded yet",
      loadFailed: "Failed to load data",
      otherProjects: "Other projects",
      donate: "Donate",
      reportIssue: "Report an issue",
      wcagAlt: "Conforms to W3C WCAG 2.2 Level AA",
      localeTag: "en-GB",
    },
  };

  var LANG_KEY = "uindex-lang";
  var THEME_KEY = "uindex-theme";
  var LANGS = ["zh-Hant", "zh-Hans", "en"];
  var lang = "zh-Hant";

  function readStored(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function writeStored(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }
  function format(str, vars) {
    if (!vars) return str;
    return str.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? String(vars[k]) : m; });
  }
  function t(key, vars) {
    var table = STRINGS[lang] || STRINGS["zh-Hant"];
    var s = table[key];
    if (s == null) s = STRINGS["zh-Hant"][key] || key;
    return format(s, vars);
  }
  function getLang() { return lang; }
  function locale() { return t("localeTag"); }

  function applyStatic() {
    document.querySelectorAll("[data-i18n]").forEach(function (n) { n.textContent = t(n.getAttribute("data-i18n")); });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (n) { n.setAttribute("aria-label", t(n.getAttribute("data-i18n-aria"))); });
    document.querySelectorAll("[data-i18n-alt]").forEach(function (n) { n.setAttribute("alt", t(n.getAttribute("data-i18n-alt"))); });
    document.querySelectorAll("[data-i18n-title]").forEach(function (n) { n.setAttribute("title", t(n.getAttribute("data-i18n-title"))); });
    document.querySelectorAll("[data-lang-btn]").forEach(function (b) {
      var on = b.getAttribute("data-lang-btn") === lang;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function setLang(next) {
    if (LANGS.indexOf(next) === -1) return;
    lang = next;
    writeStored(LANG_KEY, next);
    document.documentElement.lang = next === "en" ? "en" : next;
    applyStatic();
    document.dispatchEvent(new CustomEvent("uindex:langchange", { detail: { lang: next } }));
  }

  function init() {
    var stored = readStored(LANG_KEY);
    if (LANGS.indexOf(stored) !== -1) {
      lang = stored;
    } else {
      var nav = (navigator.language || "").toLowerCase();
      if (nav.indexOf("en") === 0) lang = "en";
      else if (nav === "zh-cn" || nav.indexOf("zh-hans") === 0) lang = "zh-Hans";
      else lang = "zh-Hant";
    }
    document.documentElement.lang = lang === "en" ? "en" : lang;
    applyStatic();
  }

  window.UINDEX_I18N = {
    t: t, init: init, getLang: getLang, setLang: setLang, locale: locale,
    applyStatic: applyStatic, readStored: readStored, writeStored: writeStored,
    THEME_KEY: THEME_KEY, LANG_KEY: LANG_KEY,
  };
})();
