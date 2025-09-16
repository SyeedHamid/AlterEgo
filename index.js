require('dotenv').config();
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

// Scrapers
const scrapeIndeed = require('./scraper/indeed');
const scrapeLinkedIn = require('./scraper/linkedin');
const scrapeGlassdoor = require('./scraper/glassdoor');
const scrapeMonster = require('./scraper/monster');
const scrapeZipRecruiter = require('./scraper/ziprecruiter');
const scrapeCanadaGov = require('./scraper/canadaGov');

// Utilities
const { deduplicateJobs } = require('./utils/deduplicate');
const { filterJobs } = require('./utils/filterJobs');
const { loginToSite } = require('./utils/login');

// Resume & Application
const tailorResume = require('./resume_engine/tailor');
const generateCoverLetter = require('./cover_letter/generate');
const submitApplication = require('./form_submitter/submit');

// Config
const MAX_APPS = parseInt(process.env.MAX_APPLICATIONS_PER_DAY || '10');
const LOG_PATH = path.join(__dirname, '../data/logs/applications.json');

/**
 * Main orchestrator: runs daily job search and application flow.
 */
async function runJobPilot() {
  console.log(`[INFO] JobPilot started at ${new Date().toLocaleString()}`);

  // Step 1: Scrape jobs from all boards
  const allJobs = [
    ...(await scrapeIndeed()),
    ...(await scrapeLinkedIn()),
    ...(await scrapeGlassdoor()),
    ...(await scrapeMonster()),
    ...(await scrapeZipRecruiter()),
    ...(await scrapeCanadaGov())
  ];

  // Step 2: Deduplicate and filter
  const uniqueJobs = deduplicateJobs(allJobs);
  const filteredJobs = filterJobs(uniqueJobs);
  const selectedJobs = filteredJobs.slice(0, MAX_APPS);

  console.log(`[INFO] ${selectedJobs.length} job(s) selected for application.`);

  // Step 3: Process each job
  for (const job of selectedJobs) {
    try {
      // Step 3a: Login if required (based on domain)
      const domain = new URL(job.applyLink).hostname;
      if (domain.includes('linkedin')) await loginToSite(job.page, 'linkedin');
      if (domain.includes('glassdoor')) await loginToSite(job.page, 'glassdoor');
      if (domain.includes('monster')) await loginToSite(job.page, 'monster');
      if (domain.includes('ziprecruiter')) await loginToSite(job.page, 'ziprecruiter');
      if (domain.includes('canada.ca')) await loginToSite(job.page, 'canadagov');

      // Step 3b: Tailor resume and generate cover letter
      const tailoredResumePath = await tailorResume(job);
      const coverLetterPath = await generateCoverLetter(job, tailoredResumePath);

      // Step 3c: Submit application
      await submitApplication(job, tailoredResumePath, coverLetterPath);

      // Step 3d: Log application
      logApplication(job, tailoredResumePath, coverLetterPath);
    } catch (err) {
      console.error(`[ERROR] Failed to process job: ${job.title} — ${err.message}`);
    }
  }

  console.log(`[INFO] JobPilot completed ${selectedJobs.length} application(s).`);
}

/**
 * Logs application details to JSON file.
 */
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

  const existing = fs.existsSync(LOG_PATH)
    ? JSON.parse(fs.readFileSync(LOG_PATH, 'utf-8'))
    : [];

  existing.push(logEntry);
  fs.writeFileSync(LOG_PATH, JSON.stringify(existing, null, 2));
}

// Schedule daily run at 8:00 AM
cron.schedule('0 8 * * *', runJobPilot);

// Optional: run immediately for testing
if (process.env.RUN_NOW === 'true') {
  runJobPilot();
}
