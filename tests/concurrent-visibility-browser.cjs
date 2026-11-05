/* Real-tab storage visibility stress regression; all data is disposable. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { login } = require('./helpers/browser-fixtures.cjs');
const root = process.env.KICKS_TEST_URL || 'http://127.0.0.1:4181';
const output = '.local/technical-audit/batch-2/concurrent-visibility.json';
const report = { iterations: 0, acceptedFeedback: 0, explicitRejections: [], missing: [], errors: [] };
let browser;
(async () => {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const fixture = JSON.parse(fs.readFileSync('.local/data-audit/demo-fixture.json', 'utf8'));
  await context.addInitScript(data => {
    if (localStorage.getItem('kicks-data-v2') === null)
      localStorage.setItem('kicks-data-v2', JSON.stringify(data));
  }, fixture);
  const pages = [await context.newPage(), await context.newPage()];
  for (const page of pages) {
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto(root + '/Pages/Contact/contact.html');
    await login(page, 'sample100@kicks.example.test');
    await page.goto(root + '/Pages/Contact/contact.html');
  }
  const accepted = [];
  for (let i = 0; i < 300; i++) {
    const name = 'Sample visibility regression ' + i;
    const outcomes = await Promise.allSettled([
      pages[0].evaluate(name => KicksStore.submitFeedback({ name, email: 'visibility@example.test', message: 'Fictional cross-tab storage integrity test.', rating: 5 }), name),
      pages[1].evaluate(i => KicksStore.updateSettings({ title: 'Sample visibility title ' + i }), i)
    ]);
    if (outcomes[0].status === 'fulfilled') accepted.push(name);
    for (const result of outcomes) if (result.status === 'rejected') report.explicitRejections.push(String(result.reason.message));
    // The settle interval diagnoses a disappeared write, not transient rendering.
    await pages[0].waitForTimeout(40);
    const actual = await pages[0].evaluate(() => JSON.parse(localStorage.getItem('kicks-data-v2')).feedback.map(row => row.name));
    report.iterations++;
    report.missing = accepted.filter(name => !actual.includes(name));
    if (report.missing.length) break;
  }
  report.acceptedFeedback = accepted.length;
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  assert.deepEqual(report.missing, [], 'Acknowledged cross-tab writes must not disappear');
  assert.deepEqual(report.errors, []);
  console.log('PASS: ' + report.iterations + ' real-tab races retain every acknowledged feedback write');
})().catch(error => {
  report.failure = error.message;
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  console.error(error.message);
  process.exitCode = 1;
}).finally(async () => { if (browser) await browser.close(); });
