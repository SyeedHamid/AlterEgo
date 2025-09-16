/**
 * Logs into supported job platforms using stored credentials.
 * Handles security questions and multi-step login flows.
 * @param {object} page - Playwright page instance
 * @param {string} site - Target site identifier
 */
async function loginToSite(page, site) {
  switch (site.toLowerCase()) {
    case 'linkedin':
      console.log('[INFO] Logging into LinkedIn...');
      await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });
      await page.fill('input#username', process.env.LINKEDIN_USER);
      await page.fill('input#password', process.env.LINKEDIN_PASS);
      await page.click('button[type="submit"]');
      break;

    case 'glassdoor':
      console.log('[INFO] Logging into Glassdoor...');
      await page.goto('https://www.glassdoor.ca/profile/login_input.htm', { waitUntil: 'domcontentloaded' });
      await page.fill('input#userEmail', process.env.GLASSDOOR_USER);
      await page.fill('input#userPassword', process.env.GLASSDOOR_PASS);
      await page.click('button[type="submit"]');
      break;

    case 'monster':
      console.log('[INFO] Logging into Monster...');
      await page.goto('https://www.monster.ca/login/', { waitUntil: 'domcontentloaded' });
      await page.fill('input[name="email"]', process.env.MONSTER_USER);
      await page.fill('input[name="password"]', process.env.MONSTER_PASS);
      await page.click('button[type="submit"]');
      break;

    case 'ziprecruiter':
      console.log('[INFO] Logging into ZipRecruiter...');
      await page.goto('https://www.ziprecruiter.com/login', { waitUntil: 'domcontentloaded' });
      await page.fill('input[name="email"]', process.env.ZIPRECRUITER_USER);
      await page.fill('input[name="password"]', process.env.ZIPRECRUITER_PASS);
      await page.click('button[type="submit"]');
      break;

    case 'canadagov':
      console.log('[INFO] Logging into Canada.ca...');
      await page.goto('https://www.canada.ca/en/services/jobs/opportunities/government.html', { waitUntil: 'domcontentloaded' });

      // If redirected to GC Jobs login portal
      const loginButton = await page.$('a[href*="login"]');
      if (loginButton) {
        await loginButton.click();
        await page.waitForLoadState('domcontentloaded');
      }

      await page.fill('input[name="username"]', process.env.CANADAGOV_USER);
      await page.fill('input[name="password"]', process.env.CANADAGOV_PASS);
      await page.click('button[type="submit"]');

      // Handle security questions if prompted
      const securityPrompt = await page.$('input[name="securityAnswer"]');
      if (securityPrompt) {
        console.log('[INFO] Security question detected. Answering...');
        await page.fill('input[name="securityAnswer"]', process.env.CANADAGOV_SECURITY_ANSWER);
        await page.click('button[type="submit"]');
      }
      break;

    default:
      console.warn(`[WARNING] No login method defined for: ${site}`);
  }
}

module.exports = { loginToSite };
