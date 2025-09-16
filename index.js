require('dotenv').config();
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

// Scrapers
const scrapeIndeed = require('./scraper/indeed');
const scrapeLinkedIn = require('./scraper/linkedin');
const scrapeGlassdoor = require('./scraper/glassdoor');
const scrapeMonster = require('./scraper/monster');

// Modules
const tailorResume = require('./resume_engine/tailor');
const generateCoverLetter = require('./cover_letter/generate');
const submitApplication = require('./form_submitter/submit');

// Config
const MAX_APPS = parseInt(process.env.MAX_APPLICATIONS_PER_DAY || '10');

// Daily job application flow
cron.schedule('0 8 * * *', async () => {
  console.log(`🚀 JobPilot daily run started at ${new Date().toLocaleString()}`);

  const allJobs = [
    ...(await scrapeIndeed()),
    ...(await scrapeLinkedIn()),
    ...(await scrapeGlassdoor()),
    ...(await scrapeMonster())
  ];

  const selectedJobs = allJobs.slice(0, MAX_APPS);

  for (const job of selectedJobs) {
    try {
      const tailoredResumePath = await tailorResume(job);
      const coverLetterPath = await generateCoverLetter(job, tailoredResumePath);
      await submitApplication(job, tailoredResumePath, coverLetterPath);

      logApplication(job, tailoredResumePath, coverLetterPath);
    } catch (err) {
      console.error(`❌ Error processing job: ${job.title} — ${err.message}`);
    }
  }

  console.log(`✅ JobPilot completed ${selectedJobs.length} applications`);
});

// Log application details
function logApplication(job, resumePath, coverLetterPath) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    jobTitle: job.title,
    company: job.company,
    location: job.location,
    applyLink: job.applyLink,
    resume: path.basename(resumePath),
    coverLetter: path.basename(coverLetterPath)
  };

  const logPath = path.join(__dirname, '../data/logs/applications.json');
  const existing = fs.existsSync(logPath)
    ? JSON.parse(fs.readFileSync(logPath, 'utf-8'))
    : [];

  existing.push(logEntry);
  fs.writeFileSync(logPath, JSON.stringify(existing, null, 2));
}
