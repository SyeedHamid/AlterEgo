const { chromium } = require('playwright');
const { solveCaptcha } = require('../utils/captcha');

/**
 * Scrapes job listings from LinkedIn.
 * Returns an array of job objects with title, company, location, description, and applyLink.
 */
async function scrapeLinkedIn() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const keywords = process.env.JOB_KEYWORDS?.split(',').join('%20') || 'developer';
    const location = process.env.JOB_LOCATION || 'Canada';
    const url = `https://www.linkedin.com/jobs/search/?keywords=${keywords}&location=${location}`;

    console.log(`[INFO] Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // CAPTCHA detection
    const captchaFrame = await page.$('iframe[src*="captcha"]');
    const recaptchaDiv = await page.$('div#g-recaptcha');
    if (captchaFrame || recaptchaDiv) {
      await solveCaptcha(page);
    }

    const jobCards = await page.$$('.base-card');
    if (!jobCards.length) {
      throw new Error('No job listings found. Page structure may have changed or access was blocked.');
    }

    const jobs = [];

    for (const card of jobCards) {
      try {
        const title = await card.$eval('h3', el => el.innerText.trim());
        const company = await card.$eval('h4', el => el.innerText.trim());
        const location = await card.$eval('.job-search-card__location', el => el.innerText.trim());
        const description = await card.$eval('.job-search-card__snippet', el => el.innerText.trim());
        const applyLink = await card.$eval('a.base-card__full-link', el => el.href);

        jobs.push({ title, company, location, description, applyLink });
      } catch (cardError) {
        console.warn(`[WARNING] Skipped a job card due to parsing error: ${cardError.message}`);
        continue;
      }
    }

    console.log(`[INFO] Successfully scraped ${jobs.length} job(s) from LinkedIn.`);
    return jobs;
  } catch (err) {
    console.error(`[ERROR] Failed to scrape LinkedIn: ${err.message}`);
    return [];
  } finally {
    await browser.close();
  }
}

module.exports = scrapeLinkedIn;
