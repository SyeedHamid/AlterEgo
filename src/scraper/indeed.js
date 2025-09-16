const { chromium } = require('playwright');
const { solveCaptcha } = require('../utils/captcha');

/**
 * Scrapes job listings from Indeed.
 * Returns an array of job objects with title, company, location, description, and applyLink.
 */
async function scrapeIndeed() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const keywords = process.env.JOB_KEYWORDS?.split(',').join('+') || 'developer';
    const location = process.env.JOB_LOCATION || 'Canada';
    const url = `https://ca.indeed.com/jobs?q=${keywords}&l=${location}`;

    console.log(`[INFO] Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // CAPTCHA detection
    const captchaFrame = await page.$('iframe[src*="captcha"]');
    const recaptchaDiv = await page.$('div#g-recaptcha');
    if (captchaFrame || recaptchaDiv) {
      await solveCaptcha(page);
    }

    const jobCards = await page.$$('div.job_seen_beacon');
    if (!jobCards.length) {
      throw new Error('No job listings found. Page structure may have changed or access was blocked.');
    }

    const jobs = [];

    for (const card of jobCards) {
      try {
        const title = await card.$eval('h2.jobTitle span', el => el.innerText);
        const company = await card.$eval('.companyName', el => el.innerText);
        const location = await card.$eval('.companyLocation', el => el.innerText);
        const description = await card.$eval('.job-snippet', el => el.innerText.trim());
        const jobKey = await card.$eval('a[data-jk]', el => el.getAttribute('data-jk'));
        const applyLink = jobKey ? `https://ca.indeed.com/viewjob?jk=${jobKey}` : '';

        jobs.push({ title, company, location, description, applyLink });
      } catch (cardError) {
        console.warn(`[WARNING] Skipped a job card due to parsing error: ${cardError.message}`);
        continue;
      }
    }

    console.log(`[INFO] Successfully scraped ${jobs.length} job(s) from Indeed.`);
    return jobs;
  } catch (err) {
    console.error(`[ERROR] Failed to scrape Indeed: ${err.message}`);
    return [];
  } finally {
    await browser.close();
  }
}

module.exports = scrapeIndeed;
