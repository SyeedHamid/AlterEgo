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
const { generateCoverLetter, tailorResume } = require('./utils/aiEngine');
const { writePDF } = require('./utils/pdfWriter');

// Config
const MAX_APPS = parseInt(process.env.MAX_APPLICATIONS_PER_DAY || '10');
const resumeDir = path.join(__dirname, '../data/resumes');
const outputDir = path.join(__dirname, '../data/output');
const logDir = path.join(__dirname, '../data/logs');
const resumeFile = path.join(resumeDir, 'base_resume.txt');
const LOG_PATH = path.join(logDir, 'applications.json');

// Ensure required folders and files exist
[resumeDir, outputDir, logDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created folder: ${dir}`);
  }
});

if (!fs.existsSync(resumeFile)) {
  const sampleResume = `Experienced automation developer with expertise in Node.js, Playwright, and GitHub Actions. Built scalable systems for job application workflows. Skilled in cloud-native deployment and CI/CD pipelines.`;
  fs.writeFileSync(resumeFile, sampleResume);
  console.log('📄 Created sample resume: base_resume.txt');
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
  const resumeText = fs.readFileSync(resumeFile, 'utf-8');

  for (const job of selectedJobs) {
    try {
      // Step 3a: Login if required
      const domain = new URL(job.applyLink).hostname;
      if (domain.includes('linkedin')) await loginToSite(job.page, 'linkedin');
      if (domain.includes('glassdoor')) await loginToSite(job.page, 'glassdoor');
      if (domain.includes('monster')) await loginToSite(job.page, 'monster');
      if (domain.includes('ziprecruiter')) await loginToSite(job.page, 'ziprecruiter');
      if (domain.includes('canada.ca')) await loginToSite(job.page, 'canadagov');

      // Step 3b: Tailor resume and generate cover letter
      const tailoredResume = await tailorResume(job, resumeText);
      const coverLetter = await generateCoverLetter(job, tailoredResume);

      const safeName = job.title.replace(/\s+/g, '_').toLowerCase();
      const tailoredResumePath = path.join(outputDir, `${safeName}_resume.pdf`);
      const coverLetterPath = path.join(outputDir, `${safeName}_cover_letter.pdf`);

      writePDF(tailoredResume, path.basename(tailoredResumePath));
      writePDF(coverLetter, path.basename(coverLetterPath));

      // Step 3c: Submit application
      // await submitApplication(job, tailoredResumePath, coverLetterPath); // Uncomment when ready

      // Step 3d: Log application
      logApplication(job, tailoredResumePath, coverLetterPath);
    } catch (err) {
      console.error(`[ERROR] Failed to process job: ${job.title} — ${err.message}`);
    }
  }

  console.log(`[INFO] JobPilot completed ${selectedJobs.length} application(s).`);
}

// Schedule daily run at 8:00 AM
cron.schedule('0 8 * * *', runJobPilot);

// Optional: run immediately for testing
if (process.env.RUN_NOW === 'true') {
  runJobPilot();
}
