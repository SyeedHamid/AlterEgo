require('dotenv').config();
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

// Define required paths
const resumeDir = path.join(__dirname, '../data/resumes');
const outputDir = path.join(__dirname, '../data/output');
const resumeFile = path.join(resumeDir, 'base_resume.txt');

// Create folders if they don't exist
if (!fs.existsSync(resumeDir)) {
  fs.mkdirSync(resumeDir, { recursive: true });
  console.log('📁 Created folder: data/resumes');
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log('📁 Created folder: data/output');
}

// Create sample resume if missing
if (!fs.existsSync(resumeFile)) {
  const sampleResume = `Experienced automation developer with expertise in Node.js, Playwright, and GitHub Actions. Built scalable systems for job application workflows. Skilled in cloud-native deployment and CI/CD pipelines.`;
  fs.writeFileSync(resumeFile, sampleResume);
  console.log('📄 Created sample resume: base_resume.txt');
}

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

const job = { title: 'Automation Developer', company: 'TechNova' };
const resumeText = fs.readFileSync('./data/resumes/base_resume.txt', 'utf-8');

(async () => {
  const tailoredResume = await tailorResume(job, resumeText);
  const coverLetter = await generateCoverLetter(job, tailoredResume);

  writePDF(tailoredResume, 'resume.pdf');
  writePDF(coverLetter, 'cover_letter.pdf');
})();


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
