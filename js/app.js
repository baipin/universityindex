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
    return state.data.meta.rankings.filter(function (r) { return r.id === id; })[0] || null;
  }

  function rankLabel(r) {
    var base = r.name;
    return r.scope === "subject" && r.subject ? base + " — " + r.subject : base;
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(I18N.locale(), { year: "numeric", month: "2-digit", day: "2-digit" });
  }

  function schoolName(s) {
    return I18N.getLang() === "en" ? s.name : (s.nameZh || s.name);
  }
  function countryName(s) {
    return I18N.getLang() === "en" ? s.country : (s.countryZh || s.country);
  }

  /* ---------- Ranking and level selectors ---------- */
  function renderSelectors() {
    var sel = document.getElementById("ranking-select");
    sel.textContent = "";
    state.data.meta.rankings.forEach(function (r) {
      sel.appendChild(el("option", { value: r.id, text: rankLabel(r) }));
    });
    sel.value = state.rankId;
    document.getElementById("level-select").value = state.level;
  }

  /* ---------- Table ---------- */
  function visibleSchools() {
    var rank = state.rankId;
    var q = state.query.trim().toLowerCase();
    return state.data.schools
      .filter(function (s) { return s.ranks && s.ranks[rank] != null; })
      .filter(function (s) {
        if (!q) return true;
        return [s.name, s.nameZh, s.country, s.countryZh].join(" ").toLowerCase().indexOf(q) !== -1;
      })
      .sort(function (a, b) { return a.ranks[rank] - b.ranks[rank]; });
  }

  function renderTable() {
    var tbody = document.getElementById("school-rows");
    tbody.textContent = "";
    var rows = visibleSchools();
    rows.forEach(function (s) {
      var tr = el("tr", { "data-id": s.id, tabindex: "0", "aria-selected": s.id === state.activeId ? "true" : "false" }, [
        el("td", { class: "num", text: String(s.ranks[state.rankId]) }),
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
  }

  /* ---------- Detail ---------- */
  function requirementRows(req) {
    if (!req) return el("div", { class: "empty", text: t("noRequirement") });
    var items = [
      [t("tableGpa"), req.gpa],
      [t("tableEnglish"), req.english],
      [t("tableDeadline"), fmtDate(req.deadline)],
      [t("tableDocuments"), req.documents],
    ];
    var dl = el("dl", { class: "reqs" });
    items.forEach(function (pair) {
      if (!pair[0]) return;
      dl.appendChild(el("dt", { text: pair[0] }));
      dl.appendChild(el("dd", { text: pair[1] || "—" }));
    });
    return dl;
  }

  function renderDetail(id) {
    var s = state.data.schools.filter(function (x) { return x.id === id; })[0];
    var root = document.getElementById("detail");
    root.textContent = "";
    if (!s) return;

    var head = el("div", { class: "detail__head" }, [
      el("h2", { text: schoolName(s) }),
      I18N.getLang() === "en" ? null : el("span", { class: "en", text: s.name }),
    ]);

    var rankChips = state.data.meta.rankings
      .filter(function (r) { return s.ranks && s.ranks[r.id] != null; })
      .map(function (r) {
        return el("span", { class: "chip" }, [el("b", { text: "#" + s.ranks[r.id] }), " " + rankLabel(r)]);
      });
    var site = safeHttpUrl(s.website);
    var links = el("div", { class: "chips" }, rankChips.concat(site ? [
      el("a", { class: "chip chip--link", href: site, target: "_blank", rel: "noopener noreferrer nofollow", text: t("detailOfficial") }),
    ] : []));

    root.appendChild(head);
    root.appendChild(el("p", { class: "sub", text: countryName(s) }));
    root.appendChild(el("h3", { class: "section-title", text: t("detailRanks") }));
    root.appendChild(links);

    root.appendChild(el("h3", { class: "section-title", text: t("detailLevels") }));
    state.data.meta.levels.forEach(function (lv) {
      var levelLabel = t(lv === "undergraduate" ? "levelUndergrad" : lv === "master" ? "levelMaster" : "levelPhd");
      var req = s.requirements ? s.requirements[lv] : null;
      var card = el("article", { class: "post" + (lv === state.level ? " is-current" : "") }, [
        el("div", { class: "post__meta" }, [el("span", { class: "badge", text: levelLabel })]),
        requirementRows(req),
      ]);
      root.appendChild(card);
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
    var meta = state.data.meta;
    var node = document.getElementById("footer-status");
    node.textContent = meta.generatedAt
      ? t("footerUpdated", { time: new Date(meta.generatedAt).toLocaleString(I18N.locale()) })
      : t("footerNotLoaded");
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
      renderTable();
    });
    document.getElementById("level-select").addEventListener("change", function (e) {
      state.level = e.target.value;
      if (state.activeId) renderDetail(state.activeId);
    });
    document.getElementById("search").addEventListener("input", function (e) {
      state.query = e.target.value;
      renderTable();
    });

    document.addEventListener("uindex:langchange", function () {
      document.title = t("appTitle") + " · University Admission Requirements";
      renderSelectors();
      renderTable();
      renderStatus();
      if (state.activeId) renderDetail(state.activeId);
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
        state.data = data;
        renderSelectors();
        renderTable();
        renderStatus();
        document.getElementById("sample-notice").hidden = !!(data.meta && data.meta.verified);
        var first = visibleSchools()[0];
        if (first) select(first.id);
      })
      .catch(function (err) {
        document.getElementById("footer-status").textContent = t("loadFailed");
        document.getElementById("detail").textContent = t("loadFailed") + ": " + err.message;
      });
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
