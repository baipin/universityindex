'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const catalog = require('../js/catalog.js');
const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/universities.json'), 'utf8'));
const ids = new Set(data.schools.map(s => s.id));
const rankings = new Map(data.meta.rankings.map(r => [r.id, r]));

test('real institutional identities, explicit partial coverage, no demonstration data', () => {
  assert.equal(data.meta.schemaVersion, 2);
  assert.equal(data.meta.status, 'partial');
  assert.equal(data.meta.verified, false);
  assert.equal(data.meta.rankLimit, 150);
  assert.equal(ids.size, data.schools.length);
  assert.equal(data.meta.coverage.schools, data.schools.length);
  assert.ok(data.schools.length >= 150);
  for (const school of data.schools) {
    assert.ok(school.name && school.country);
    assert.doesNotMatch(school.id + school.name, /sample|example university/i);
    assert.ok(['qs', 'the', 'usnews'].some(r => school.ranks[r] <= 150));
    assert.ok(school.website === null || /^https?:\/\//.test(school.website));
    for (const [id, value] of Object.entries(school.ranks)) {
      assert.ok(rankings.has(id), id);
      assert.ok(Number.isInteger(value) && value >= 1 && value <= 150);
      assert.equal(Number(school.rankLabels[id].replace(/^=/, '').split(/[-–—]/)[0]), value);
    }
  }
});

test('all published rank facts tie to a publisher extract and the right edition', () => {
  const editions = JSON.parse(fs.readFileSync(path.join(root, 'data/ranking-editions.json'), 'utf8'));
  for (const id of ['qs', 'the', 'usnews']) assert.equal(rankings.get(id).year, editions[id].year);
  assert.equal(rankings.size, data.meta.coverage.subjects + 3);
  for (const ranking of rankings.values()) {
    const extract = JSON.parse(fs.readFileSync(path.join(root, 'data/rankings', ranking.id + '.json'), 'utf8'));
    assert.equal(ranking.status, 'verified');
    assert.match(ranking.sha256, /^[0-9a-f]{64}$/);
    assert.ok(/^https:\/\//.test(ranking.source));
    const indexed = catalog.visibleSchools(data, ranking.id);
    assert.equal(indexed.length, extract.rows.length, ranking.id);
    assert.equal(new Set(extract.rows.map(r => r.schoolId)).size, extract.rows.length);
    for (const row of extract.rows) {
      const school = data.schools.find(s => s.id === row.schoolId);
      assert.ok(school, row.schoolId);
      assert.equal(school.ranks[ranking.id], row.rank);
      assert.equal(school.rankLabels[ranking.id], row.rankLabel);
    }
    for (let i = 1; i < indexed.length; i++) assert.ok(indexed[i - 1].ranks[ranking.id] <= indexed[i].ranks[ranking.id]);
  }
  for (const id of ['qs', 'the', 'usnews']) {
    const count = catalog.visibleSchools(data, id).length;
    assert.equal(count, data.meta.coverage.globalRankings[id]);
    assert.ok(count >= 150, id);
  }
});

test('ties and subject bands preserve publisher labels and sort by lower bound', () => {
  const tied = data.schools.find(s => s.rankLabels.qs === '=2');
  assert.ok(tied);
  assert.equal(catalog.rankLabel(tied, 'qs'), '=2');
  const band = data.schools.flatMap(s => Object.entries(s.rankLabels).filter(([id, label]) => id.startsWith('qs-') && /[-–—]/.test(label)).map(([id, label]) => ({ s, id, label })))[0];
  assert.ok(band, 'At least one subject rank band must be preserved');
  assert.equal(catalog.rankLabel(band.s, band.id), band.label);
});

test('case-insensitive school, Chinese-name, country and programme search', () => {
  assert.equal(catalog.visibleSchools(data, 'qs', 'MASSACHUSETTS')[0].id, 'qs-410');
  assert.equal(catalog.visibleSchools(data, 'qs', '麻省')[0].id, 'qs-410');
  assert.ok(catalog.visibleSchools(data, 'qs', 'Hong Kong').length >= 5);
  const programs = data.schools.flatMap(s => s.programs);
  assert.ok(programs.length > 0);
  const program = programs.find(p => p.name === 'MSc Computing');
  assert.ok(program);
  assert.ok(catalog.visibleSchools(data, 'qs', program.name).some(s => s.id === 'qs-356'));
  assert.equal(catalog.visibleSchools(data, 'qs', 'nonexistent-institution-xyz').length, 0);
});

test('degree filtering keeps institutional rules separate from programmes', () => {
  for (const school of data.schools) {
    assert.equal(new Set(school.programs.map(p => p.id)).size, school.programs.length, school.id);
    for (const level of data.meta.levels) {
      const result = catalog.requirementsFor(school, level);
      assert.equal(result.institution, school.requirements[level]);
      assert.ok(result.programs.every(p => p.level === level));
      assert.equal(result.programs.length, school.programs.filter(p => p.level === level).length);
    }
  }
});

test('reviewed fields have checked official sources; unknown fields are never guessed', () => {
  let reviewedCount = 0;
  for (const school of data.schools) {
    for (const req of [...Object.values(school.requirements), ...school.programs]) {
      if (!req) continue;
      assert.ok(['reviewed', 'source-checked'].includes(req.status));
      assert.ok(req.sources.length > 0);
      for (const source of req.sources) {
        assert.ok(/^https?:\/\//.test(source.url));
        assert.ok(!source.url.startsWith('https://r.jina.ai/'), 'Display the original official source');
        assert.ok(Number.isFinite(Date.parse(source.checkedAt)));
        assert.match(source.sha256, /^[0-9a-f]{64}$/);
        assert.doesNotMatch(source.title, /404|page not found|could not be found|human verification|just a moment|access denied/i);
      }
      if (req.status === 'reviewed') {
        reviewedCount++;
        assert.ok(req.reviewedAt);
        for (const field of ['gpa', 'english', 'deadline', 'documents', 'intake']) {
          if (req[field] === null || req[field] === undefined) continue;
          assert.ok(req.fieldSources[field], school.id + ': ' + field);
          assert.ok(req.sources.some(s => s.url === req.fieldSources[field]));
        }
      } else {
        for (const field of ['gpa', 'english', 'deadline', 'documents']) assert.equal(req[field], null);
      }
      for (const excerpt of req.sourceExcerpts || []) assert.ok(req.sources.some(s => s.url === excerpt.source));
    }
  }
  assert.equal(reviewedCount, data.meta.coverage.reviewedRequirementRecords);
  // A source update can legitimately invalidate old reviews; never require
  // retaining stale summaries just to satisfy a historical coverage minimum.
});

test('published admission and programme coverage agrees with actual records', () => {
  const checks = JSON.parse(fs.readFileSync(path.join(root, 'data/admissions/checks.json'), 'utf8')).sources;
  assert.equal(data.meta.coverage.admissionSchools, data.schools.filter(s => s.admissionSources.length).length);
  assert.equal(data.meta.coverage.programs, data.schools.reduce((sum, s) => sum + s.programs.length, 0));
  assert.equal(data.meta.coverage.checkedAdmissionSources, checks.filter(s => s.status === 'source-checked').length);
  assert.equal(data.meta.coverage.unavailableAdmissionSources, checks.filter(s => s.status !== 'source-checked').length);
  for (const check of checks) assert.ok(ids.has(check.schoolId));
});

test('published reviewed summaries match their checked source revisions', () => {
  const reviews = JSON.parse(fs.readFileSync(path.join(root, 'data/admissions/reviewed.json'), 'utf8')).entries;
  const checks = JSON.parse(fs.readFileSync(path.join(root, 'data/admissions/checks.json'), 'utf8')).sources;
  const identity = (schoolId, level, programId) => JSON.stringify([schoolId, level, programId || null]);
  const byIdentity = new Map();
  for (const review of reviews) {
    const id = identity(review.schoolId, review.level, review.programId);
    assert.ok(!byIdentity.has(id), 'Duplicate reviewed entry: ' + id);
    byIdentity.set(id, review);
  }
  const sources = new Map(checks.filter(c => c.status === 'source-checked').map(c => [JSON.stringify([c.schoolId, c.url]), c]));
  for (const school of data.schools) {
    const records = [...Object.entries(school.requirements).map(([level, r]) => ({ level, r })), ...school.programs.map(r => ({ level: r.level, r }))];
    for (const { level, r } of records) {
      if (!r || r.status !== 'reviewed') continue;
      const review = byIdentity.get(identity(school.id, level, r.id));
      assert.ok(review, school.id + ': missing review provenance');
      for (const url of new Set(Object.values(r.fieldSources))) {
        const source = sources.get(JSON.stringify([school.id, url]));
        const baseline = review.sourceFingerprints[url];
        assert.ok(source && baseline, school.id + ': unchecked review source');
        const field = baseline.contentSha256 && source.contentSha256 ? 'contentSha256' : 'sha256';
        assert.equal(baseline[field], source[field], school.id + ': stale review at ' + url);
      }
      for (const field of ['gpa', 'english', 'deadline', 'documents', 'intake']) {
        assert.equal(r[field] ?? null, review[field] ?? null, school.id + ': published field differs from review ' + field);
      }
    }
  }
});

test('Traditional names, QS-style region display and multilingual search', () => {
  const mit = data.schools.find(s => s.id === 'qs-410');
  assert.equal(catalog.schoolName(mit, 'zh-Hant'), '麻省理工學院');
  assert.equal(catalog.schoolName(mit, 'zh-Hans'), '麻省理工学院');
  assert.equal(catalog.countryName(mit, 'zh-Hant'), '美國');
  const hongKong = data.schools.find(s => s.country === 'Hong Kong');
  const taiwan = data.schools.find(s => s.country === 'Taiwan');
  assert.equal(catalog.countryName(hongKong, 'zh-Hant'), '香港特別行政區');
  assert.equal(catalog.countryName(hongKong, 'zh-Hans'), '香港特别行政区');
  assert.equal(catalog.countryName(hongKong, 'en'), 'Hong Kong SAR');
  assert.equal(catalog.countryName(taiwan, 'zh-Hant'), '臺灣');
  assert.equal(catalog.countryName(taiwan, 'en'), 'Taiwan');
  assert.ok(catalog.visibleSchools(data, 'qs', '麻省理工學院').some(s => s.id === mit.id));
  assert.ok(catalog.visibleSchools(data, 'qs', '香港特別行政區').length >= 5);
  for (const school of data.schools) {
    assert.ok(school.nameZhHant && school.countryZhHant);
    assert.doesNotMatch(school.countryZh, /^中国(?:香港|台湾|澳门)/);
  }
});

test('every listed school has an attributed official course lookup', () => {
  const portals = JSON.parse(fs.readFileSync(path.join(root, 'data/admissions/portals.json'), 'utf8'));
  const byId = new Map(portals.schools.map(s => [s.schoolId, s.links]));
  for (const school of data.schools) {
    assert.ok(school.requirementLinks.length > 0, school.name);
    assert.deepEqual(school.requirementLinks, byId.get(school.id));
    for (const link of school.requirementLinks) {
      assert.match(link.url, /^https?:\/\//);
      if (link.verification !== 'access-limited') {
        assert.match(link.verificationUrl, /^https?:\/\//);
        assert.match(link.sha256, /^[a-f0-9]{64}$/);
        assert.ok(!Number.isNaN(Date.parse(link.checkedAt)));
      } else {
        assert.ok(link.destinationCheck);
        assert.ok(!Number.isNaN(Date.parse(link.lastAttemptAt)));
      }
      assert.ok(['page-checked', 'official-link', 'access-limited'].includes(link.verification));
      assert.ok(['all', 'undergraduate', 'master', 'phd', 'graduate'].includes(link.scope));
    }
  }
  assert.equal(data.meta.coverage.requirementLookupSchools, data.schools.length);
});

test('National Taiwan University retains its official Chinese name', () => {
  const ntu = data.schools.find(s => s.id === 'qs-441');
  assert.equal(ntu.nameZh, '国立台湾大学');
  assert.equal(ntu.nameZhHant, '國立臺灣大學');
  for (const query of ['国立台湾大学', '國立臺灣大學']) {
    assert.ok(catalog.visibleSchools(data, 'qs', query).some(s => s.id === ntu.id));
  }
});
