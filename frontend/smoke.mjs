/** Mount the built bundle in jsdom and report any console errors. */
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync('dist/index.html', 'utf8');
const cssPath = 'dist' + html.match(/\/assets\/[^"]*\.css/)[0];
const jsPath = 'dist' + html.match(/\/assets\/[^"]*\.js/)[0];
const js = readFileSync(jsPath, 'utf8');

const errors = [];
const warnings = [];

const dom = new JSDOM('<!doctype html><html class="dark"><head></head><body><div id="root"></div></body></html>', {
  runScripts: 'outside-only',
  url: 'http://localhost/',
  pretendToBeVisual: true,
});
const { window } = dom;

window.console.error = (...a) => errors.push(a.map(String).join(' '));
window.console.warn = (...a) => warnings.push(a.map(String).join(' '));
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
window.scrollTo = () => {};
// Health checks: resolve as if both services are up.
window.fetch = async (url) => ({
  ok: true,
  status: 200,
  json: async () => ({ status: 'healthy', module: String(url).includes('research') ? 'research' : 'content', version: '1.0.0', llm_available: false, research_reachable: true }),
});
window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
window.cancelAnimationFrame = (id) => clearTimeout(id);

try {
  window.eval(js);
} catch (e) {
  errors.push('THREW: ' + (e && e.stack ? e.stack.split('\n').slice(0,4).join(' | ') : e));
}

await new Promise((r) => setTimeout(r, 900));

const root = window.document.getElementById('root');
const text = root.textContent || '';
console.log('root children:', root.children.length);
console.log('rendered chars:', text.length);
for (const probe of ['InsightFlow', 'Research', 'Content', 'Turn ideas into structured insight', 'Overview', 'Workflow', 'History']) {
  console.log(`  contains "${probe}":`, text.includes(probe));
}
console.log('nav links:', window.document.querySelectorAll('a[href]').length);
console.log('svg icons:', window.document.querySelectorAll('svg').length);
console.log('CONSOLE ERRORS:', errors.length);
errors.slice(0, 8).forEach((e) => console.log('   ERR:', e.slice(0, 300)));
console.log('CONSOLE WARNINGS:', warnings.length);
warnings.slice(0, 5).forEach((w) => console.log('   WARN:', w.slice(0, 200)));
console.log('css bytes:', readFileSync(cssPath, 'utf8').length);
