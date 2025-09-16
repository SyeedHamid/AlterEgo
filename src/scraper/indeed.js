const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const JOB_KEYWORDS = process.env.JOB_KEYWORDS?.split(',') || ['developer'];
const JOB_LOCATION = process.env.JOB_LOCATION || 'Canada';

async function scrapeJobs() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const query = JOB_KEYWORDS.join('+');
  const url = `https://ca.indeed.com/jobs?q=${query}&l=${JOB_LOCATION}`;

  console.log(`🔍 Scraping Indeed: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const jobListings = await page.$$eval('div.job_seen_beacon', (cards) =>
    cards.map((card) => {
      const title = card.querySelector('h2.jobTitle span')?.innerText || '';
      const company = card.querySelector('.companyName')?.innerText || '';
      const location = card.querySelector('.companyLocation')?.innerText || '';
      const description = card.querySelector('.job-snippet')?.innerText.trim() || '';
      const linkElement = card.querySelector('a[data-jk]');
      const jobKey = linkElement?.getAttribute('data-jk');
      const applyLink = jobKey ? `https://ca.indeed.com/viewjob?jk=${jobKey}` : '';

      return { title, company, location, description, applyLink };
    })
  );

  await browser.close();

  // Optional: Save to file for debugging
  const logPath = path.join(__dirname, '../../data/logs/indeed_jobs.json');
  fs.writeFileSync(logPath, JSON.stringify(jobListings, null, 2));

  console.log(`✅ Found ${jobListings.length} jobs`);
  return jobListings;
}

module.exports = scrapeJobs;
