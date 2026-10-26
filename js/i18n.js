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
      searchPlaceholder: "搜尋學校或地區",
      tableSchool: "學校",
      tableRank: "排名",
      tableCountry: "地區",
      tableEmpty: "沒有符合條件的學校",
      sampleBanner: "示例數據：以下內容只用於展示版面，並非真實排名或申請要求。請先核實官方資料。",
      listTitle: "學校列表",
      listHint: "點選學校查看詳情",
      detailPlaceholderTitle: "請選擇一所學校",
      detailPlaceholderText: "點擊左側列表中的學校，查看各課程的申請要求。",
      detailOfficial: "官方網站",
      detailRanks: "各排名",
      detailLevels: "課程要求",
      noRequirement: "暫未有此課程的要求資料",
      tableGpa: "GPA / 成績",
      tableEnglish: "英文成績",
      tableDeadline: "截止日期",
      tableDocuments: "所需材料",
      levelUndergrad: "本科",
      levelMaster: "研究生（授課式）",
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
      searchPlaceholder: "搜索学校或地区",
      tableSchool: "学校",
      tableRank: "排名",
      tableCountry: "地区",
      tableEmpty: "没有符合条件的学校",
      sampleBanner: "示例数据：以下内容只用于展示版面，并非真实排名或申请要求。请先核实官方资料。",
      listTitle: "学校列表",
      listHint: "点选学校查看详情",
      detailPlaceholderTitle: "请选择一所学校",
      detailPlaceholderText: "点击左侧列表中的学校，查看各课程的申请要求。",
      detailOfficial: "官方网站",
      detailRanks: "各排名",
      detailLevels: "课程要求",
      noRequirement: "暂未有此课程的要求资料",
      tableGpa: "GPA / 成绩",
      tableEnglish: "英语成绩",
      tableDeadline: "截止日期",
      tableDocuments: "所需材料",
      levelUndergrad: "本科",
      levelMaster: "研究生（授课式）",
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
      searchPlaceholder: "Search school or region",
      tableSchool: "School",
      tableRank: "Rank",
      tableCountry: "Region",
      tableEmpty: "No schools match your filters",
      sampleBanner: "Sample data: the content below only demonstrates the layout. It is not real rankings or requirements. Verify with official sources first.",
      listTitle: "Schools",
      listHint: "Select a school for details",
      detailPlaceholderTitle: "Select a school",
      detailPlaceholderText: "Click a school in the list to see its requirements for each programme.",
      detailOfficial: "Official website",
      detailRanks: "Rankings",
      detailLevels: "Programme requirements",
      noRequirement: "No requirement data for this programme yet",
      tableGpa: "GPA / grades",
      tableEnglish: "English test",
      tableDeadline: "Deadline",
      tableDocuments: "Documents",
      levelUndergrad: "Undergraduate",
      levelMaster: "Taught master's",
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
