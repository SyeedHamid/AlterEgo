const { chromium } = require('playwright');
const { solveCaptcha } = require('../../utils/captcha');

/**
 * Scrapes job listings from Monster.
 * Returns an array of job objects with title, company, location, description, and applyLink.
 */
async function scrapeMonster() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const keywords = process.env.JOB_KEYWORDS?.split(',').join('-') || 'developer';
    const location = process.env.JOB_LOCATION || 'Canada';
    const url = `https://www.monster.ca/jobs/search/?q=${keywords}&where=${location}`;

    console.log(`[INFO] Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // CAPTCHA detection
    const captchaFrame = await page.$('iframe[src*="captcha"]');
    const recaptchaDiv = await page.$('div#g-recaptcha');
    if (captchaFrame || recaptchaDiv) {
      await solveCaptcha(page);
    }

    const jobCards = await page.$$('.card-content');
    if (!jobCards.length) {
      throw new Error('No job listings found. Page structure may have changed or access was blocked.');
    }

    const jobs = [];

    for (const card of jobCards) {
      try {
        const title = await card.$eval('h2.title', el => el.innerText.trim());
        const company = await card.$eval('.company', el => el.innerText.trim());
        const location = await card.$eval('.location', el => el.innerText.trim());
        const description = await card.$eval('.summary', el => el.innerText.trim());
        const applyLink = await card.$eval('a', el => el.href);

        jobs.push({ title, company, location, description, applyLink });
      } catch (cardError) {
        console.warn(`[WARNING] Skipped a job card due to parsing error: ${cardError.message}`);
        continue;
      }
    }

    console.log(`[INFO] Successfully scraped ${jobs.length} job(s) from Monster.`);
    return jobs;
  } catch (err) {
    console.error(`[ERROR] Failed to scrape Monster: ${err.message}`);
    return [];
  } finally {
    await browser.close();
  }
}

module.exports = scrapeMonster;
