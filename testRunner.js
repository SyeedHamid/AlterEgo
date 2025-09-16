require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Modules
const scrapeIndeed = require('./src/scraper/indeed');
const scrapeLinkedIn = require('./src/scraper/linkedin');
const scrapeGlassdoor = require('./src/scraper/glassdoor');
const scrapeMonster = require('./src/scraper/monster');
const scrapeZipRecruiter = require('./src/scraper/ziprecruiter');
const scrapeCanadaGov = require('./src/scraper/canadaGov');

const { deduplicateJobs } = require('./src/utils/deduplicate');
const { filterJobs } = require('./src/utils/filterJobs');
const { solveCaptcha } = require('./src/utils/captcha');
const { loginToSite } = require('./src/utils/login');

const { tailorResume, generateCoverLetter } = require('./src/utils/aiEngine');
const { writePDF } = require('./src/utils/pdfWriter');
const submitApplication = require('./src/form_submitter/submit');

// Setup paths
const resumeDir = path.join(__dirname, 'data/resumes');
const outputDir = path.join(__dirname, 'data/output');
const resumeFile = path.join(resumeDir, 'base_resume.txt');

// Ensure folders and sample resume exist
[resumeDir, outputDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created folder: ${dir}`);
  }
});

if (!fs.existsSync(resumeFile)) {
  fs.writeFileSync(resumeFile, 'Experienced automation developer skilled in Node.js, Playwright, and GitHub Actions.');
  console.log('📄 Created sample resume: base_resume.txt');
}

// Mock job object for testing
const mockJob = {
  title: 'Automation Developer',
  company: 'TestCorp',
  location: 'Remote - Canada',
  description: 'We are seeking a skilled automation developer to join our team.',
  applyLink: 'https://example.com/apply'
};

async function runTests() {
  console.log('=== JobPilot Test Harness ===');

  // Scraper Tests
  const scrapers = [
    { name: 'Indeed', fn: scrapeIndeed },
    { name: 'LinkedIn', fn: scrapeLinkedIn },
    { name: 'Glassdoor', fn: scrapeGlassdoor },
    { name: 'Monster', fn: scrapeMonster },
    { name: 'ZipRecruiter', fn: scrapeZipRecruiter },
    { name: 'Canada.ca', fn: scrapeCanadaGov }
  ];

  for (const { name, fn } of scrapers) {
    try {
      const jobs = await fn();
      console.log(`[PASS] ${name} scraper returned ${jobs.length} job(s)`);
    } catch (err) {
      console.error(`[FAIL] ${name} scraper: ${err.message}`);
    }
  }

  // Utility Tests
  try {
    const deduped = deduplicateJobs([mockJob, mockJob]);
    console.log(`[PASS] Deduplicator reduced to ${deduped.length} job(s)`);
  } catch (err) {
    console.error(`[FAIL] Deduplicator: ${err.message}`);
  }

  try {
    const filtered = filterJobs([mockJob]);
    console.log(`[PASS] Filter returned ${filtered.length} job(s)`);
  } catch (err) {
    console.error(`[FAIL] Filter: ${err.message}`);
  }

  try {
    await solveCaptcha({ screenshot: async () => {} }); // Mock page
    console.log(`[PASS] CAPTCHA solver executed`);
  } catch (err) {
    console.error(`[FAIL] CAPTCHA solver: ${err.message}`);
  }

  try {
    await loginToSite({ goto: async () => {}, fill: async () => {}, click: async () => {} }, 'linkedin');
    console.log(`[PASS] Login module executed for LinkedIn`);
  } catch (err) {
    console.error(`[FAIL] Login module: ${err.message}`);
  }

  // Resume & Application Tests
  try {
    const resumeText = fs.readFileSync(resumeFile, 'utf-8');
    const tailoredResume = await tailorResume(mockJob, resumeText);
    const resumePath = path.join(outputDir, 'test_resume.pdf');
    writePDF(tailoredResume, 'test_resume.pdf');
    console.log(`[PASS] Resume tailored and saved to ${resumePath}`);
  } catch (err) {
    console.error(`[FAIL] Resume tailoring: ${err.message}`);
  }

  try {
    const resumeText = fs.readFileSync(resumeFile, 'utf-8');
    const coverLetter = await generateCoverLetter(mockJob, resumeText);
    const coverPath = path.join(outputDir, 'test_cover_letter.pdf');
    writePDF(coverLetter, 'test_cover_letter.pdf');
    console.log(`[PASS] Cover letter generated and saved to ${coverPath}`);
  } catch (err) {
    console.error(`[FAIL] Cover letter generation: ${err.message}`);
  }

  try {
    await submitApplication(mockJob, resumeFile, resumeFile); // Simulated
    console.log(`[PASS] Form submission simulated`);
  } catch (err) {
    console.error(`[FAIL] Form submission: ${err.message}`);
  }

  console.log('=== Test Harness Complete ===');
}

runTests();
