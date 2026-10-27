'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/universities.json'), 'utf8'));

(async function () {
  const server = spawn(process.env.PYTHON || 'python', ['-m', 'http.server', '8765', '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  let browser;
  try {
    const base = 'http://127.0.0.1:8765';
    for (let attempt = 0; ; attempt++) {
      try { const response = await fetch(base + '/data/universities.json'); if (response.ok) break; } catch (_) {}
      if (attempt > 30) throw new Error('Local HTTP server did not start');
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForSelector('#school-rows tr');
    assert.equal(await page.locator('#school-rows tr[aria-selected="true"]').count(), 0);
    assert.ok(await page.locator('#detail .detail__placeholder').isVisible());
    assert.equal(await page.evaluate(() => window.scrollY), 0);
    await page.locator('[data-lang-btn="zh-Hant"]').first().click();
    assert.ok((await page.locator('#detail').innerText()).includes('請選擇一所學校'));
    await page.selectOption('#level-select', 'phd');
    assert.ok(await page.locator('#detail .detail__placeholder').isVisible());
    await page.selectOption('#level-select', 'undergraduate');
    assert.equal(await page.locator('#ranking-select option').count(), data.meta.rankings.length);
    assert.equal(await page.locator('#sample-notice').count(), 0);
    assert.ok(await page.locator('.hero-banner img').evaluate(img => img.complete && img.naturalWidth > 0));
    assert.ok((await page.locator('#school-rows').innerText()).includes('麻省理工學院'));
    await page.fill('#search', 'Hong Kong');
    assert.ok((await page.locator('#school-rows').innerText()).includes('香港特別行政區'));
    await page.fill('#search', '');
    await page.locator('#school-rows tr').first().click();
    assert.ok(await page.locator('#school-rows tr').count() >= 150);
    assert.ok((await page.locator('#detail').innerText()).includes('MIT'));
    await page.selectOption('#level-select', 'master');
    assert.ok((await page.locator('#detail').innerText()).includes('department'));
    await page.selectOption('#ranking-select', 'usnews');
    assert.ok((await page.locator('#school-rows tr').first().innerText()).includes('哈佛'));
    assert.ok((await page.locator('#ranking-context').innerText()).includes(data.meta.rankings.find(r => r.id === 'usnews').year));
    await page.selectOption('#ranking-select', 'qs-cs');
    assert.ok((await page.locator('#ranking-context').innerText()).includes(data.meta.rankings.find(r => r.id === 'qs-cs').year));
    await page.fill('#search', 'Imperial');
    assert.equal(await page.locator('#school-rows tr').count(), 1);
    assert.ok(await page.locator('#detail .detail__placeholder').isVisible());
    await page.locator('#school-rows tr').first().click();
    assert.ok((await page.locator('#detail').innerText()).includes('MSc Computing'));
    await page.fill('#search', 'no-such-university-xyz');
    assert.equal(await page.locator('#school-rows tr').count(), 0);
    assert.ok(await page.locator('#school-empty').isVisible());
    assert.ok(!(await page.locator('#detail').innerText()).includes('Imperial'));
    await page.fill('#search', '');
    await page.selectOption('#ranking-select', 'qs');
    await page.locator('[data-lang-btn="en"]').first().click();
    assert.ok((await page.locator('#coverage-summary').innerText()).includes('institutions'));
    await page.fill('#search', 'Hong Kong');
    assert.ok((await page.locator('#school-rows').innerText()).includes('Hong Kong SAR'));
    await page.fill('#search', 'Taiwan');
    assert.ok(!(await page.locator('#school-rows').innerText()).includes('Taiwan (China)'));
    await page.fill('#search', '');
    await page.locator('[data-lang-btn="zh-Hans"]').first().click();
    assert.ok((await page.locator('#detail').innerText()).includes('请选择一所学校'));
    await page.locator('#school-rows tr').first().focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#school-rows tr[aria-selected="true"]').count(), 1);
    assert.ok(await page.locator('#detail .official-site').isVisible());
    assert.equal(await page.locator('.rankings-detail .official-site').count(), 0);
    assert.equal(await page.locator('.rankings-detail').getAttribute('open'), null);
    await page.locator('[data-theme-toggle]').first().click();
    await page.locator('.rankings-detail').evaluate(node => { node.open = true; });
    for (const width of [1440, 1024, 960, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Page overflow at ' + width);
      assert.ok(await page.locator('.hero-banner').evaluate(node => {
        const card = node.getBoundingClientRect();
        const media = node.querySelector('.hero-banner__media').getBoundingClientRect();
        const img = node.querySelector('img').getBoundingClientRect();
        return card.height <= 346 && card.width <= 1248 && card.left >= 0 && card.right <= window.innerWidth
          && media.height >= 180 && media.height <= 320
          && img.left > card.left && img.right < card.right && img.top > card.top && img.bottom < card.bottom;
      }), 'Banner escapes its bounded card at ' + width);
      assert.ok(await page.locator('.rankings-detail').evaluate(node => {
        const card = document.querySelector('#detail').getBoundingClientRect();
        return [...node.querySelectorAll('.chip')].every(chip => { const rect = chip.getBoundingClientRect(); return rect.left >= card.left && rect.right <= card.right + 1; });
      }), 'Ranking chips overflow at ' + width);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator('.rankings-detail').evaluate(node => { node.open = false; });
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.locator('[data-theme-toggle]').first().click();
    fs.mkdirSync(path.join(root, '.cache'), { recursive: true });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(root, '.cache/desktop.png'), fullPage: false, animations: 'disabled' });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.locator('#menu-toggle').click();
    await page.locator('#drawer [data-lang-btn="en"]').click();
    await page.locator('#drawer-close').click();
    await page.locator('#drawer').waitFor({ state: 'hidden' });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(root, '.cache/mobile.png'), fullPage: false, animations: 'disabled' });
    // Exercise controls while the catalogue request is still pending.
    const loadingPage = await browser.newPage();
    loadingPage.on('pageerror', error => errors.push(error.message));
    let releaseCatalogue;
    const catalogueGate = new Promise(resolve => { releaseCatalogue = resolve; });
    await loadingPage.route('**/data/universities.json', async route => {
      await catalogueGate;
      await route.fulfill({ json: data });
    });
    await loadingPage.goto(base, { waitUntil: 'domcontentloaded' });
    await loadingPage.locator('[data-lang-btn="en"]').first().click();
    await loadingPage.fill('#search', 'Imperial');
    await loadingPage.selectOption('#level-select', 'master');
    assert.ok((await loadingPage.locator('#detail').innerText()).includes('Select a school'));
    assert.equal(await loadingPage.locator('#school-rows tr').count(), 0);
    releaseCatalogue();
    await loadingPage.waitForSelector('#school-rows tr');
    assert.equal(await loadingPage.locator('#school-rows tr').count(), 1);
    assert.ok(await loadingPage.locator('#detail .detail__placeholder').isVisible());
    await loadingPage.locator('#school-rows tr').first().click();
    assert.ok((await loadingPage.locator('#detail').innerText()).includes('MSc Computing'));
    // Check enriched programme fields at the actual detail output surface.
    await loadingPage.selectOption('#ranking-select', 'usnews');
    for (const query of ['Cambridge', 'Hong Kong University of Science', 'Toronto', 'Imperial', 'San Francisco', 'Manchester', 'Edinburgh', 'Bristol', 'Southampton', 'Glasgow']) {
      await loadingPage.fill('#search', query);
      const schoolId = await loadingPage.locator('#school-rows tr').first().getAttribute('data-id');
      const school = data.schools.find(s => s.id === schoolId);
      await loadingPage.locator('#school-rows tr').first().click();
      const locale = await loadingPage.evaluate(() => window.UINDEX_I18N.locale());
      for (const level of ['undergraduate', 'master', 'phd']) {
        await loadingPage.selectOption('#level-select', level);
        const cards = await loadingPage.locator('.program-card').evaluateAll(nodes => nodes.map(node => ({
          title: node.querySelector('h4').textContent,
          fields: [...node.querySelectorAll('dd')].map(dd => dd.textContent),
        })));
        const programs = school.programs.filter(p => p.level === level);
        assert.equal(cards.length, programs.length, school.name + ': missing programme cards');
        for (const p of programs.filter(p => p.status === 'reviewed')) {
          const card = cards.find(c => c.title === p.name);
          assert.ok(card, p.name);
          for (const field of ['gpa', 'english', 'deadline', 'documents', 'intake']) {
            if (!p[field]) continue;
            const expected = field === 'deadline' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(p[field])
              ? new Date(p[field] + 'T00:00:00').toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' })
              : p[field];
            assert.ok(card.fields.includes(expected), p.name + ': missing rendered ' + field);
          }
        }
      }
    }
    await loadingPage.selectOption('#ranking-select', 'qs');
    for (const lang of ['en', 'zh-Hans', 'zh-Hant']) {
      await loadingPage.locator('[data-lang-btn="' + lang + '"]').first().click();
      for (const query of ['Korea University', 'National Taiwan University', 'Leiden']) {
        await loadingPage.fill('#search', query);
        await loadingPage.locator('#school-rows tr').first().click();
        for (const level of ['undergraduate', 'master', 'phd']) {
          await loadingPage.selectOption('#level-select', level);
          assert.ok(await loadingPage.locator('.requirement-lookup a').count() > 0);
        }
        if (query === 'National Taiwan University') {
          assert.ok((await loadingPage.locator('#detail h2').innerText()).includes(lang === 'zh-Hant' ? '國立臺灣大學' : lang === 'zh-Hans' ? '国立台湾大学' : 'National Taiwan University'));
        }
        if (query === 'Leiden') {
          assert.ok((await loadingPage.locator('.requirement-lookup').innerText()).includes(lang === 'en' ? 'blocked' : '受限'));
        }
      }
    }
    await loadingPage.close();
    assert.deepEqual(errors, []);
    console.log('Browser smoke passed: initial empty selection, delayed catalogue interactions, independent official link, rankings, degree/programme filter, search, Traditional names, region labels, bounded banner, themes and five-width overflow checks.');
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
