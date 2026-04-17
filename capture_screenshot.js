
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('http://localhost:3001');
  // Wait for some elements to be visible to ensure the page has loaded
  await page.waitForSelector('nav');
  await page.screenshot({ path: 'landing_current.png', fullPage: true });
  await browser.close();
})();
