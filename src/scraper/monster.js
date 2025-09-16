const { chromium } = require('playwright');

async function scrapeMonsterJobs() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const keywords = process.env.JOB_KEYWORDS?.join('-') || 'developer';
  const location = process.env.JOB_LOCATION || 'Canada';
  const url = `https://www.monster.ca/jobs/search/?q=${keywords}&where=${location}`;

  console.log(`🔍 Scraping Monster: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const jobs = await page.$$eval('.card-content', (cards) =>
    cards.map((card) => {
      const title = card.querySelector('h2.title')?.innerText || '';
      const company = card.querySelector('.company')?.innerText || '';
      const location = card.querySelector('.location')?.innerText || '';
      const description = card.querySelector('.summary')?.innerText || '';
      const applyLink = card.querySelector('a')?.href || '';
      return { title, company, location, description, applyLink };
    })
  );

  await browser.close();
  return jobs;
}

module.exports = scrapeMonsterJobs;
