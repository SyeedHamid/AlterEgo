const { chromium } = require('playwright');

async function scrapeLinkedInJobs() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const keywords = process.env.JOB_KEYWORDS?.split(',').join('%20') || 'developer';
  const location = process.env.JOB_LOCATION || 'Canada';
  const url = `https://www.linkedin.com/jobs/search/?keywords=${keywords}&location=${location}`;

  console.log(`🔍 Scraping LinkedIn: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const jobs = await page.$$eval('.base-card', (cards) =>
    cards.map((card) => {
      const title = card.querySelector('h3')?.innerText || '';
      const company = card.querySelector('h4')?.innerText || '';
      const location = card.querySelector('.job-search-card__location')?.innerText || '';
      const description = card.querySelector('.job-search-card__snippet')?.innerText || '';
      const applyLink = card.querySelector('a.base-card__full-link')?.href || '';
      return { title, company, location, description, applyLink };
    })
  );

  await browser.close();
  return jobs;
}

module.exports = scrapeLinkedInJobs;
