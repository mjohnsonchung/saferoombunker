const { createRequire } = require('module');
const puppeteer = createRequire(__filename)('C:/Users/Matthew/node_modules/puppeteer/lib/cjs/puppeteer/puppeteer.js');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Users/Matthew/.cache/puppeteer/chrome/win64-145.0.7632.77/chrome-win64/chrome.exe',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 4000 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    document.querySelectorAll('.fade-up').forEach(el => el.classList.add('visible'));
  });
  await new Promise(r => setTimeout(r, 600));

  const clip = await page.evaluate(() => {
    const sections = Array.from(document.querySelectorAll('section'));
    const target = sections.find(s => s.textContent.includes('THREE WAYS')) || document.querySelector('h2')?.closest('section');
    if (!target) return null;
    const r = target.getBoundingClientRect();
    return { x: 0, y: r.top + window.scrollY, width: 1440, height: r.height };
  });

  console.log('Clip:', JSON.stringify(clip));
  if (clip && clip.height > 0) {
    await page.screenshot({ path: 'temporary screenshots/screenshot-5-engage-zoom.png', clip });
    console.log('Saved');
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
