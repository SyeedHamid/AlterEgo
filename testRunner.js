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

const tailorResume = require('./src/resume_engine/tailor');
const generateCoverLetter = require('./src/cover_letter/generate');
const submitApplication = require('./src/form_submitter/submit');

// Mock job object for testing downstream modules
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
  try {
    const indeedJobs = await scrapeIndeed();
    console.log(`[PASS] Indeed scraper returned ${indeedJobs.length} jobs`);
  } catch (err) {
    console.error(`[FAIL] Indeed scraper: ${err.message}`);
  }

  try {
    const linkedinJobs = await scrapeLinkedIn();
    console.log(`[PASS] LinkedIn scraper returned ${linkedinJobs.length} jobs`);
  } catch (err) {
    console.error(`[FAIL] LinkedIn scraper: ${err.message}`);
  }

  try {
    const glassdoorJobs = await scrapeGlassdoor();
    console.log(`[PASS] Glassdoor scraper returned ${glassdoorJobs.length} jobs`);
  } catch (err) {
    console.error(`[FAIL] Glassdoor scraper: ${err.message}`);
  }

  try {
    const monsterJobs = await scrapeMonster();
    console.log(`[PASS] Monster scraper returned ${monsterJobs.length} jobs`);
  } catch (err) {
    console.error(`[FAIL] Monster scraper: ${err.message}`);
  }

  try {
    const zipJobs = await scrapeZipRecruiter();
    console.log(`[PASS] ZipRecruiter scraper returned ${zipJobs.length} jobs`);
  } catch (err) {
    console.error(`[FAIL] ZipRecruiter scraper: ${err.message}`);
  }

  try {
    const govJobs = await scrapeCanadaGov();
    console.log(`[PASS] Canada.ca scraper returned ${govJobs.length} jobs`);
  } catch (err) {
    console.error(`[FAIL] Canada.ca scraper: ${err.message}`);
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
    const resumePath = await tailorResume(mockJob);
    console.log(`[PASS] Resume tailored: ${resumePath}`);
  } catch (err) {
    console.error(`[FAIL] Resume tailoring: ${err.message}`);
  }

  try {
    const coverPath = await generateCoverLetter(mockJob, './data/resumes/base_resume.txt');
    console.log(`[PASS] Cover letter generated: ${coverPath}`);
  } catch (err) {
    console.error(`[FAIL] Cover letter generation: ${err.message}`);
  }

  try {
    await submitApplication(mockJob, './data/resumes/base_resume.txt', './data/resumes/base_resume.txt');
    console.log(`[PASS] Form submission simulated`);
  } catch (err) {
    console.error(`[FAIL] Form submission: ${err.message}`);
  }

  console.log('=== Test Harness Complete ===');
}

runTests();
