/**
 * Looks at the built site the way a visitor would, before anyone else has to:
 * opens pages of `out/` (run a build first) in headless Chromium, at desktop
 * and phone width, light and dark, waits for the live data, and reports
 * console errors, uncaught errors, failed requests and text that says it is
 * stuck. Screenshots go to .tmp/shots/ for a person (or the agent) to look at.
 *
 *   node scripts/check-pages.mjs /funding/ /open-interest/      the pages to open
 *   --wait=15        seconds to let live data arrive before the screenshot (default 12)
 *   --only=desktop-light  one of the four views instead of all four
 *   --gap=20         seconds to rest between pages, so a long run stays under
 *                    Hyperliquid's per-IP limit (default 0)
 *   --click="21 days"     after loading, press the button or tab with that text, wait
 *                         again and check again (repeatable, in order)
 *
 * The site is served from out/ through request interception (no local
 * server), and live data comes from Hyperliquid itself. Chromium is Chrome for
 * Testing's headless shell in .tmp/dl/ (CHROME_PATH overrides), kept out of
 * git and of the site's build. To get it (the version Playwright names when
 * `npx playwright install --dry-run chromium` runs):
 *   curl -L -o .tmp/dl/shell.zip https://cdn.playwright.dev/builds/cft/<version>/mac-arm64/chrome-headless-shell-mac-arm64.zip
 *   unzip -q .tmp/dl/shell.zip -d .tmp/dl
 * Each page opened loads all of the site's live data afresh: open a few pages
 * a minute, not dozens, or Hyperliquid refuses (429) everything from this IP.
 */
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = join(ROOT, 'out');
const SHOTS = join(ROOT, '.tmp', 'shots');
const ORIGIN = 'http://hlcharts.local';
const CHROME =
  process.env.CHROME_PATH ??
  join(ROOT, '.tmp', 'dl', 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell');
const VIEWS = [
  { name: 'desktop-light', width: 1440, height: 900, scheme: 'light', mobile: false },
  { name: 'desktop-dark', width: 1440, height: 900, scheme: 'dark', mobile: false },
  { name: 'phone-light', width: 390, height: 844, scheme: 'light', mobile: true },
  { name: 'phone-dark', width: 390, height: 844, scheme: 'dark', mobile: true },
];
/** On-screen text that means a page is still waiting or has failed. */
const STUCK = /Waiting for|Loading|Could not|Connecting to Hyperliquid|unavailable/;
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const args = process.argv.slice(2);
const flag = (name, fallback) =>
  args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const pages = args.filter((a) => !a.startsWith('--'));
const waitMs = Number(flag('wait', '12')) * 1000;
const gapMs = Number(flag('gap', '0')) * 1000;
const only = flag('only', '');
const clicks = args.filter((a) => a.startsWith('--click=')).map((a) => a.slice('--click='.length));
if (!pages.length) throw new Error('name at least one page, e.g. /funding/');
if (!existsSync(join(OUT, 'index.html'))) throw new Error(`no build in ${OUT}: run a build first`);
if (!existsSync(CHROME)) throw new Error(`no Chromium at ${CHROME} (set CHROME_PATH)`);

/** out/ file for a site path: /funding/ -> funding/index.html, assets as they are. */
function fileFor(pathname) {
  const clean = decodeURIComponent(pathname);
  const direct = join(OUT, clean);
  if (existsSync(direct) && statSync(direct).isFile()) return direct;
  const index = join(OUT, clean, 'index.html');
  if (existsSync(index)) return index;
  return null;
}

function proxyFromEnv() {
  const raw = process.env.HTTPS_PROXY ?? process.env.https_proxy;
  if (!raw) return undefined;
  const u = new URL(raw);
  return {
    server: `${u.protocol}//${u.host}`,
    username: decodeURIComponent(u.username) || undefined,
    password: decodeURIComponent(u.password) || undefined,
    bypass: 'hlcharts.local',
  };
}

mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, proxy: proxyFromEnv() });
let problems = 0;

for (const view of VIEWS.filter((v) => !only || v.name === only)) {
  const context = await browser.newContext({
    viewport: { width: view.width, height: view.height },
    deviceScaleFactor: view.mobile ? 2 : 1,
    isMobile: view.mobile,
    hasTouch: view.mobile,
    colorScheme: view.scheme,
  });
  await context.route(`${ORIGIN}/**`, (route) => {
    const file = fileFor(new URL(route.request().url()).pathname);
    if (!file) return route.fulfill({ status: 404, body: 'not in out/' });
    return route.fulfill({
      status: 200,
      body: readFileSync(file),
      contentType: TYPES[extname(file)] ?? 'application/octet-stream',
    });
  });
  for (const path of pages) {
    const page = await context.newPage();
    const issues = [];
    page.on('console', (m) => m.type() === 'error' && issues.push(`console: ${m.text()}`));
    page.on('pageerror', (e) => issues.push(`uncaught: ${e.message}`));
    page.on('requestfailed', (r) =>
      issues.push(`request failed: ${r.url()} (${r.failure()?.errorText})`)
    );
    page.on('response', (r) => r.status() >= 400 && issues.push(`HTTP ${r.status()}: ${r.url()}`));
    await page.goto(`${ORIGIN}${path}`, { waitUntil: 'load' });
    const base = path.replace(/\W+/g, '-').replace(/^-|-$/g, '') || 'home';
    for (const step of ['', ...clicks]) {
      if (step)
        await page
          .getByRole('radio', { name: step })
          .or(page.getByRole('button', { name: step }))
          .first()
          .click();
      await page.waitForTimeout(waitMs);
      const stuck = (await page.locator('body').innerText())
        .split('\n')
        .filter((line) => STUCK.test(line))
        .slice(0, 8);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      if (overflow > 0) {
        // The outermost elements reaching past the screen's right edge: where to look.
        const culprits = await page.evaluate(() => {
          const width = document.documentElement.clientWidth;
          // Inside a box that scrolls or clips sideways, an element cannot widen the page.
          const contained = (el) => {
            for (let a = el.parentElement; a && a !== document.body; a = a.parentElement)
              if (getComputedStyle(a).overflowX !== 'visible') return true;
            return false;
          };
          const out = [];
          for (const el of document.body.querySelectorAll('*')) {
            if (el.getBoundingClientRect().right <= width + 1 || contained(el)) continue;
            const parent = el.parentElement;
            if (
              parent &&
              parent !== document.body &&
              parent.getBoundingClientRect().right > width + 1
            )
              continue;
            const cls = typeof el.className === 'string' ? el.className.slice(0, 60) : '';
            out.push(
              `<${el.tagName.toLowerCase()} class="${cls}"> "${(el.textContent ?? '').trim().slice(0, 50)}"`
            );
          }
          return out.slice(0, 4);
        });
        issues.push(`page scrolls sideways by ${overflow}px: ${culprits.join(' | ')}`);
      }
      for (const line of stuck) issues.push(`on screen: ${line.trim().slice(0, 160)}`);
      const tag = step ? `-${step.replace(/\W+/g, '-')}` : '';
      const shot = join(SHOTS, `${base}${tag}-${view.name}.png`);
      await page.screenshot({ path: shot, fullPage: true });
      // What the visitor sees first, at readable size (a full phone page is too tall to judge).
      await page.screenshot({ path: shot.replace(/\.png$/, '-top.png') });
      problems += issues.length;
      console.log(
        `${view.name} ${path}${step ? ` after "${step}"` : ''}: ${issues.length ? `${issues.length} issue(s)` : 'ok'} -> ${shot}`
      );
      for (const i of issues) console.log(`  - ${i}`);
      issues.length = 0;
    }
    await page.close();
    if (gapMs) await new Promise((r) => setTimeout(r, gapMs));
  }
  await context.close();
}
await browser.close();
process.exitCode = problems ? 1 : 0;
