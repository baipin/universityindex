'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');

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
    assert.equal(await page.locator('#ranking-select option').count(), 62);
    assert.ok(await page.locator('#school-rows tr').count() >= 150);
    assert.ok((await page.locator('#detail').innerText()).includes('MIT'));
    await page.selectOption('#level-select', 'master');
    assert.ok((await page.locator('#detail').innerText()).includes('department'));
    await page.selectOption('#ranking-select', 'usnews');
    assert.ok((await page.locator('#school-rows tr').first().innerText()).includes('哈佛'));
    assert.ok((await page.locator('#ranking-context').innerText()).includes('2026–2027'));
    await page.selectOption('#ranking-select', 'qs-cs');
    assert.ok((await page.locator('#ranking-context').innerText()).includes('2026'));
    await page.fill('#search', 'Imperial');
    assert.equal(await page.locator('#school-rows tr').count(), 1);
    assert.ok((await page.locator('#detail').innerText()).includes('MSc Computing'));
    await page.fill('#search', 'no-such-university-xyz');
    assert.equal(await page.locator('#school-rows tr').count(), 0);
    assert.ok(await page.locator('#school-empty').isVisible());
    assert.ok(!(await page.locator('#detail').innerText()).includes('Imperial'));
    await page.fill('#search', '');
    await page.selectOption('#ranking-select', 'qs');
    await page.locator('[data-lang-btn="en"]').first().click();
    assert.ok((await page.locator('#coverage-summary').innerText()).includes('institutions'));
    assert.ok((await page.locator('#sample-notice').innerText()).includes('Real rankings'));
    await page.locator('[data-lang-btn="zh-Hans"]').first().click();
    assert.ok((await page.locator('#sample-notice').innerText()).includes('真实排名'));
    await page.locator('[data-theme-toggle]').first().click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.locator('[data-theme-toggle]').first().click();
    fs.mkdirSync(path.join(root, '.cache'), { recursive: true });
    await page.screenshot({ path: path.join(root, '.cache/desktop.png'), fullPage: false });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.locator('#menu-toggle').click();
    await page.locator('#drawer [data-lang-btn="en"]').click();
    await page.locator('#drawer-close').click();
    await page.locator('#drawer').waitFor({ state: 'hidden' });
    await page.screenshot({ path: path.join(root, '.cache/mobile.png'), fullPage: false });
    assert.deepEqual(errors, []);
    console.log('Browser smoke passed: rankings, degree/programme filter, search, source provenance, three languages, themes and mobile layout.');
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
