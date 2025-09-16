const scrapeIndeed = require('./scraper/indeed');
const scrapeLinkedIn = require('./scraper/linkedin');
const scrapeGlassdoor = require('./scraper/glassdoor');
const scrapeMonster = require('./scraper/monster');

const allJobs = [
  ...(await scrapeIndeed()),
  ...(await scrapeLinkedIn()),
  ...(await scrapeGlassdoor()),
  ...(await scrapeMonster())
];
