const { chromium } = require('playwright');
const path = require('path');

async function submitApplication(job, resumePath, coverLetterPath) {
  const browser = await chromium.launch({ headless: false }); // Use headless: true for silent mode
  const page = await browser.newPage();

  console.log(`🧾 Applying to: ${job.title} at ${job.company}`);
  await page.goto(job.applyLink, { waitUntil: 'domcontentloaded' });

  try {
    // Example selectors — these will vary by site
    await page.fill('input[name="name"]', process.env.APPLICANT_NAME);
    await page.fill('input[name="email"]', process.env.APPLICANT_EMAIL);
    await page.fill('input[name="phone"]', process.env.APPLICANT_PHONE);

    // Upload resume
    const resumeInput = await page.$('input[type="file"][name="resume"]');
    if (resumeInput) {
      await resumeInput.setInputFiles(resumePath);
    }

    // Upload cover letter
    const coverInput = await page.$('input[type="file"][name="cover_letter"]');
    if (coverInput) {
      await coverInput.setInputFiles(coverLetterPath);
    }

    // Answer basic questions (if present)
    const questions = await page.$$('textarea, input[type="text"]');
    for (const q of questions) {
      await q.fill('See resume and cover letter for details.');
    }

    // Click submit
    const submitButton = await page.$('button[type="submit"], input[type="submit"]');
    if (submitButton) {
      await submitButton.click();
      console.log(`✅ Application submitted for ${job.title}`);
    } else {
      console.log(`⚠️ Submit button not found for ${job.title}`);
    }
  } catch (err) {
    console.error(`❌ Error submitting application: ${err.message}`);
  }

  await browser.close();
}

module.exports = submitApplication;
