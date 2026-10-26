/* Shared, dependency-free catalog rules for the browser and data checks. */
(function (root) {
  'use strict';
  function visibleSchools(data, rankId, query) {
    var q = String(query || '').trim().toLocaleLowerCase();
    return data.schools.filter(function (s) {
      if (!s.ranks || s.ranks[rankId] == null || s.ranks[rankId] > data.meta.rankLimit) return false;
      if (!q) return true;
      var programs = (s.programs || []).map(function (p) { return [p.name, p.nameZh, p.subject].join(' '); }).join(' ');
      return [s.name, s.nameZh, s.country, s.countryZh, programs].join(' ').toLocaleLowerCase().indexOf(q) !== -1;
    }).sort(function (a, b) { return a.ranks[rankId] - b.ranks[rankId] || a.name.localeCompare(b.name); });
  }
  function rankLabel(school, rankId) {
    return school.rankLabels && school.rankLabels[rankId] || String(school.ranks[rankId]);
  }
  function requirementsFor(school, level) {
    return { institution: school.requirements && school.requirements[level] || null, programs: (school.programs || []).filter(function (p) { return p.level === level; }) };
  }
  var api = { visibleSchools: visibleSchools, rankLabel: rankLabel, requirementsFor: requirementsFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.UINDEX_CATALOG = api;
})(typeof window === 'undefined' ? globalThis : window);
