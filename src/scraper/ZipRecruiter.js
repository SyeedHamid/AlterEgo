const { chromium } = require('playwright');
const { solveCaptcha } = require('../utils/captcha');

/**
 * Scrapes job listings from ZipRecruiter
 */
async function scrapeZipRecruiter() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const keywords = process.env.JOB_KEYWORDS?.join('+') || 'developer';
    const location = process.env.JOB_LOCATION || 'Canada';
    const url = `https://www.ziprecruiter.com/candidate/search?search=${keywords}&location=${location}`;

    console.log(`[INFO] Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    const captchaFrame = await page.$('iframe[src*="captcha"]');
    const recaptchaDiv = await page.$('div#g-recaptcha');
    if (captchaFrame || recaptchaDiv) {
      await solveCaptcha(page);
    }

    const jobCards = await page.$$('.job_content');
    if (!jobCards.length) throw new Error('No job listings found on ZipRecruiter.');

    const jobs = [];

    for (const card of jobCards) {
      try {
        const title = await card.$eval('.job_title', el => el.innerText.trim());
        const company = await card.$eval('.t_org_link', el => el.innerText.trim());
        const location = await card.$eval('.location', el => el.innerText.trim());
        const description = await card.$eval('.job_snippet', el => el.innerText.trim());
        const applyLink = await card.$eval('a', el => el.href);

        jobs.push({ title, company, location, description, applyLink });
      } catch (err) {
        console.warn(`[WARNING] Skipped a ZipRecruiter job card: ${err.message}`);
      }
    }

    console.log(`[INFO] Scraped ${jobs.length} job(s) from ZipRecruiter.`);
    return jobs;
  } catch (err) {
    console.error(`[ERROR] ZipRecruiter scraper failed: ${err.message}`);
    return [];
  } finally {
    await browser.close();
  }
}

module.exports = scrapeZipRecruiter;
