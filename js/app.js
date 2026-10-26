/* UIndex — university admission requirements.
 * Loads data/universities.json and renders: a ranking selector (QS, US News, THE, QS subjects),
 * a programme level selector, search, a sorted school table, and a detail panel with the
 * requirements for each programme. All text is inserted with textContent (never innerHTML).
 */
(function () {
  "use strict";

  var DATA_URL = "data/universities.json";
  var I18N = window.UINDEX_I18N;
  var t = I18N.t;
  var Catalog = window.UINDEX_CATALOG;
  var state = { data: null, rankId: "qs", level: "undergraduate", query: "", activeId: null };

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") node.className = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function safeHttpUrl(u) {
    try {
      var url = new URL(String(u));
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
    } catch (e) { return null; }
  }

  function rankingById(id) {
    if (!state.data) return null;
    return state.data.meta.rankings.filter(function (r) { return r.id === id; })[0] || null;
  }

  function rankLabel(r) {
    var base = r.name + " " + r.year;
    return r.scope === "subject" && r.subject ? base + " — " + (I18N.getLang() !== "en" && r.subjectZh || r.subject) : base;
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(I18N.locale(), { year: "numeric", month: "2-digit", day: "2-digit" });
  }

  function schoolName(s) {
    return Catalog.schoolName(s, I18N.getLang());
  }
  function countryName(s) {
    return Catalog.countryName(s, I18N.getLang());
  }

  /* ---------- Ranking and level selectors ---------- */
  function renderSelectors() {
    if (!state.data) return;
    var sel = document.getElementById("ranking-select");
    sel.textContent = "";
    var globalGroup = el("optgroup", { label: t("globalRankings") });
    var subjectGroup = el("optgroup", { label: t("subjectRankings") });
    state.data.meta.rankings.forEach(function (r) {
      (r.scope === "subject" ? subjectGroup : globalGroup).appendChild(el("option", { value: r.id, text: rankLabel(r) }));
    });
    sel.appendChild(globalGroup);
    sel.appendChild(subjectGroup);
    sel.value = state.rankId;
    document.getElementById("level-select").value = state.level;
  }

  /* ---------- Table ---------- */
  function visibleSchools() {
    if (!state.data) return [];
    return Catalog.visibleSchools(state.data, state.rankId, state.query);
  }

  function renderTable() {
    var tbody = document.getElementById("school-rows");
    tbody.textContent = "";
    var rows = visibleSchools();
    rows.forEach(function (s) {
      var tr = el("tr", { "data-id": s.id, tabindex: "0", "aria-selected": s.id === state.activeId ? "true" : "false" }, [
        el("td", { class: "num", text: Catalog.rankLabel(s, state.rankId) }),
        el("td", { class: "name" }, [schoolName(s)]),
        el("td", { text: countryName(s) }),
      ]);
      if (s.id === state.activeId) tr.classList.add("is-active");
      tr.addEventListener("click", function () { select(s.id); });
      tr.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(s.id); }
      });
      tbody.appendChild(tr);
    });
    document.getElementById("school-empty").hidden = rows.length > 0;
    renderRankingContext(rows.length);
  }

  function sourceLink(source, label) {
    var href = safeHttpUrl(typeof source === "string" ? source : source.url);
    if (!href) return null;
    return el("a", { href: href, target: "_blank", rel: "noopener noreferrer", text: label || source.title || new URL(href).hostname });
  }

  function renderRankingContext(count) {
    var r = rankingById(state.rankId);
    var root = document.getElementById("ranking-context");
    root.textContent = "";
    if (!r) return;
    root.appendChild(el("p", { text: t("rankingCount", { count: count, year: r.year }) }));
    root.appendChild(sourceLink(r.source, t("rankingSource")));
    if (r.checkedAt) root.appendChild(el("p", { class: "hint", text: t("checkedOn", { date: fmtDate(r.checkedAt.slice(0, 10)) }) }));
    root.appendChild(el("p", { class: "hint", text: t(r.scope === "subject" ? "subjectScope" : "tieNote") }));
  }

  /* ---------- Detail ---------- */
  function renderEmptyDetail() {
    var root = document.getElementById("detail");
    root.textContent = "";
    root.appendChild(el("div", { class: "detail__placeholder" }, [
      el("h2", { text: t("detailPlaceholderTitle") }),
      el("p", { text: t("detailPlaceholderText") }),
    ]));
  }

  function requirementRows(req) {
    if (!req) return el("div", { class: "empty", text: t("noRequirement") });
    var container = el("div");
    container.appendChild(el("span", { class: "badge " + (req.status === "reviewed" ? "badge--reviewed" : "badge--source"), text: t(req.status === "reviewed" ? "reviewed" : "sourceChecked") }));
    if (req.scope === "institution") container.appendChild(el("p", { class: "scope-note", text: t("institutionScope") }));
    var items = [
      [t("tableGpa"), req.gpa],
      [t("tableEnglish"), req.english],
      [t("tableDeadline"), req.deadline ? fmtDate(req.deadline) : null],
      [t("tableDocuments"), req.documents],
      [t("intake"), req.intake],
    ];
    var dl = el("dl", { class: "reqs" });
    items.forEach(function (pair) {
      if (!pair[1]) return;
      dl.appendChild(el("dt", { text: pair[0] }));
      dl.appendChild(el("dd", { text: pair[1] }));
    });
    if (dl.children.length) container.appendChild(dl);
    if (req.status !== "reviewed") container.appendChild(el("p", { class: "scope-note", text: t("unreviewedNote") }));
    if (req.notes) container.appendChild(el("p", { class: "scope-note", text: req.notes }));
    var sources = el("ul", { class: "source-list" });
    (req.sources || []).forEach(function (source) {
      var link = sourceLink(source);
      if (!link) return;
      sources.appendChild(el("li", null, [link, el("small", { text: " · " + t("checkedOn", { date: fmtDate(source.checkedAt.slice(0, 10)) }) })]));
    });
    container.appendChild(sources);
    if (req.status !== "reviewed" && req.sourceExcerpts && req.sourceExcerpts.length) {
      var excerpts = el("details", { class: "source-excerpts" }, [el("summary", { text: t("officialExcerpts") })]);
      req.sourceExcerpts.forEach(function (excerpt) {
        excerpts.appendChild(el("blockquote", null, [el("p", { text: excerpt.text }), sourceLink(excerpt.source, t("viewSource"))]));
      });
      container.appendChild(excerpts);
    }
    return container;
  }

  function renderDetail(id) {
    if (!state.data || !id) { renderEmptyDetail(); return; }
    var s = state.data.schools.filter(function (x) { return x.id === id; })[0];
    var root = document.getElementById("detail");
    root.textContent = "";
    if (!s) { state.activeId = null; renderEmptyDetail(); return; }

    var head = el("div", { class: "detail__head" }, [
      el("h2", { text: schoolName(s) }),
      I18N.getLang() === "en" ? null : el("span", { class: "en", text: s.name }),
    ]);

    var rankChips = state.data.meta.rankings
      .filter(function (r) { return s.ranks && s.ranks[r.id] != null; })
      .map(function (r) {
        var href = safeHttpUrl(r.source);
        return el("a", { class: "chip chip--link", href: href, target: "_blank", rel: "noopener noreferrer" }, [el("b", { text: "#" + Catalog.rankLabel(s, r.id) }), " " + rankLabel(r)]);
      });
    var site = safeHttpUrl(s.website);
    var links = el("div", { class: "chips" }, rankChips);

    root.appendChild(head);
    root.appendChild(el("p", { class: "sub", text: countryName(s) }));
    if (site) root.appendChild(el("div", { class: "school-actions" }, [
      el("a", { class: "chip chip--link official-site", href: site, target: "_blank", rel: "noopener noreferrer", text: t("detailOfficial") }),
    ]));
    root.appendChild(el("h3", { class: "section-title", text: t("detailRanks") }));
    var rankings = el("details", { class: "rankings-detail" }, [el("summary", { text: t("expandRankings", { count: rankChips.length }) }), links]);
    root.appendChild(rankings);
    var directories = (s.admissionSources || []).filter(function (source) { return source.kind === "directory" || source.scope === "all"; });
    if (directories.length) {
      root.appendChild(el("h3", { class: "section-title", text: t("admissionDirectories") }));
      root.appendChild(el("ul", { class: "source-list" }, directories.map(function (source) { return el("li", null, [sourceLink(source)]); })));
    }

    root.appendChild(el("h3", { class: "section-title", text: t("detailLevels") }));
    [state.level].forEach(function (lv) {
      var levelLabel = t(lv === "undergraduate" ? "levelUndergrad" : lv === "master" ? "levelMaster" : "levelPhd");
      var req = s.requirements ? s.requirements[lv] : null;
      var card = el("article", { class: "post" + (lv === state.level ? " is-current" : "") }, [
        el("div", { class: "post__meta" }, [el("span", { class: "badge", text: levelLabel })]),
        requirementRows(req),
      ]);
      root.appendChild(card);
      var programs = Catalog.requirementsFor(s, lv).programs;
      root.appendChild(el("h3", { class: "section-title", text: t("specificPrograms", { count: programs.length }) }));
      if (!programs.length) root.appendChild(el("p", { class: "scope-note", text: t("noPrograms") }));
      programs.forEach(function (program) {
        root.appendChild(el("article", { class: "post program-card" }, [el("h4", { class: "post__title", text: program.name }), el("p", { class: "hint", text: program.subject }), requirementRows(program)]));
      });
    });
  }

  function select(id) {
    state.activeId = id;
    renderTable();
    renderDetail(id);
    if (window.matchMedia("(max-width: 960px)").matches) {
      document.getElementById("detail").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  /* ---------- Footer ---------- */
  function renderStatus() {
    if (!state.data) return;
    var meta = state.data.meta;
    var node = document.getElementById("footer-status");
    node.textContent = meta.generatedAt
      ? t("footerUpdated", { time: new Date(meta.generatedAt).toLocaleString(I18N.locale()) })
      : t("footerNotLoaded");
    var coverage = meta.coverage || {};
    document.getElementById("coverage-summary").textContent = t("coverageSummary", { schools: coverage.schools || 0, subjects: coverage.subjects || 0, admissionSchools: coverage.admissionSchools || 0, sources: coverage.checkedAdmissionSources || 0, programs: coverage.programs || 0, reviewed: coverage.reviewedRequirementRecords || 0 });
  }

  function syncSelection() {
    var rows = visibleSchools();
    if (!rows.some(function (s) { return s.id === state.activeId; })) {
      state.activeId = null;
    }
    renderTable();
    if (state.activeId) renderDetail(state.activeId);
    else renderEmptyDetail();
  }

  /* ---------- Drawer and theme (same behaviour as HKFM) ---------- */
  function setTheme(theme, persist) {
    document.documentElement.setAttribute("data-theme", theme);
    if (persist) I18N.writeStored(I18N.THEME_KEY, theme);
    var dark = theme === "dark";
    var label = t(dark ? "themeToLight" : "themeToDark");
    document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
      b.setAttribute("aria-label", label);
      b.setAttribute("title", label);
    });
    document.querySelectorAll("[data-theme-toggle-row]").forEach(function (r) {
      r.setAttribute("aria-checked", dark ? "true" : "false");
    });
  }
  function isDark() { return document.documentElement.getAttribute("data-theme") === "dark"; }

  function openDrawer() {
    var d = document.getElementById("drawer");
    d.classList.add("is-open");
    d.setAttribute("aria-hidden", "false");
    document.getElementById("scrim").classList.add("is-open");
    document.getElementById("menu-toggle").setAttribute("aria-expanded", "true");
    var first = d.querySelector(".drawer__head button");
    if (first) first.focus();
  }
  function closeDrawer() {
    var d = document.getElementById("drawer");
    if (!d.classList.contains("is-open")) return;
    d.classList.remove("is-open");
    d.setAttribute("aria-hidden", "true");
    document.getElementById("scrim").classList.remove("is-open");
    document.getElementById("menu-toggle").setAttribute("aria-expanded", "false");
    document.getElementById("menu-toggle").focus();
  }

  function wireControls() {
    document.querySelectorAll("[data-lang-btn]").forEach(function (b) {
      b.addEventListener("click", function () { I18N.setLang(b.getAttribute("data-lang-btn")); });
    });
    document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
      b.addEventListener("click", function () { setTheme(isDark() ? "light" : "dark", true); });
    });
    document.querySelectorAll("[data-theme-toggle-row]").forEach(function (r) {
      r.addEventListener("click", function () { setTheme(isDark() ? "light" : "dark", true); });
      r.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTheme(isDark() ? "light" : "dark", true); }
      });
    });
    document.getElementById("menu-toggle").addEventListener("click", openDrawer);
    document.getElementById("drawer-close").addEventListener("click", closeDrawer);
    document.getElementById("scrim").addEventListener("click", closeDrawer);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawer(); });

    document.getElementById("ranking-select").addEventListener("change", function (e) {
      state.rankId = e.target.value;
      syncSelection();
    });
    document.getElementById("level-select").addEventListener("change", function (e) {
      state.level = e.target.value;
      if (state.activeId) renderDetail(state.activeId);
      else renderEmptyDetail();
    });
    document.getElementById("search").addEventListener("input", function (e) {
      state.query = e.target.value;
      syncSelection();
    });

    document.addEventListener("uindex:langchange", function () {
      document.title = t("appTitle") + " · University Admission Requirements";
      if (!state.data) { renderEmptyDetail(); setTheme(isDark() ? "dark" : "light", false); return; }
      renderSelectors();
      renderTable();
      renderStatus();
      if (state.activeId) renderDetail(state.activeId);
      else renderEmptyDetail();
      setTheme(isDark() ? "dark" : "light", false);
    });
  }

  /* ---------- Boot ---------- */
  function boot() {
    I18N.init();
    var stored = I18N.readStored(I18N.THEME_KEY);
    setTheme(stored === "dark" || stored === "light" ? stored : (isDark() ? "dark" : "light"), false);
    wireControls();

    fetch(DATA_URL, { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        if (!data || !Array.isArray(data.schools) || !data.meta || !Array.isArray(data.meta.rankings)) throw new Error("Invalid catalogue data");
        state.data = data;
        renderSelectors();
        renderTable();
        renderStatus();
        renderEmptyDetail();
      })
      .catch(function (err) {
        document.getElementById("footer-status").textContent = t("loadFailed");
        document.getElementById("detail").textContent = t("loadFailed") + ": " + err.message;
      });
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
