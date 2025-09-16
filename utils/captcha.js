const fs = require('fs');
const path = require('path');

/**
 * Attempts to solve CAPTCHA when detected.
 * Supports manual fallback and placeholder for automated services.
 * @param {object} page - Playwright page instance
 * @param {object} options - Optional settings (e.g., siteKey, service)
 */
async function solveCaptcha(page, options = {}) {
  console.log('[WARNING] CAPTCHA detected. Starting resolution process...');

  // Attempt to extract siteKey from page
  const siteKey = options.siteKey || await page.evaluate(() => {
    const el = document.querySelector('[data-sitekey]');
    return el ? el.getAttribute('data-sitekey') : null;
  });

  const pageUrl = page.url();
  const screenshotPath = path.join(__dirname, '../../data/logs/captcha_detected.png');

  // Save screenshot for debugging or manual solve
  await page.screenshot({ path: screenshotPath });
  console.log(`[INFO] CAPTCHA screenshot saved: ${screenshotPath}`);

  // Determine solving strategy
  const service = process.env.CAPTCHA_SERVICE?.toLowerCase() || 'manual';

  if (service === 'manual') {
    console.log('[INFO] Manual CAPTCHA resolution mode enabled.');
    console.log('[INFO] Waiting 30 seconds for manual intervention...');
    await page.waitForTimeout(30000);
    return;
  }

  if (service === '2captcha') {
    const apiKey = process.env.TWOCAPTCHA_API_KEY;
    if (!apiKey || !siteKey) {
      console.error('[ERROR] Missing 2Captcha API key or siteKey. Falling back to manual.');
      await page.waitForTimeout(30000);
      return;
    }

    console.log('[INFO] Sending CAPTCHA to 2Captcha...');
    const requestUrl = `http://2captcha.com/in.php?key=${apiKey}&method=userrecaptcha&googlekey=${siteKey}&pageurl=${pageUrl}&json=1`;

    const response = await fetch(requestUrl);
    const result = await response.json();

    if (result.status !== 1) {
      console.error(`[ERROR] 2Captcha request failed: ${result.request}`);
      await page.waitForTimeout(30000);
      return;
    }

    const captchaId = result.request;
    console.log(`[INFO] CAPTCHA submitted. Polling for solution...`);

    // Poll for solution
    let token = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(res => setTimeout(res, 5000));
      const pollUrl = `http://2captcha.com/res.php?key=${apiKey}&action=get&id=${captchaId}&json=1`;
      const pollRes = await fetch(pollUrl);
      const pollData = await pollRes.json();

      if (pollData.status === 1) {
        token = pollData.request;
        break;
      }
    }

    if (!token) {
      console.error('[ERROR] CAPTCHA solution not received in time. Falling back to manual.');
      await page.waitForTimeout(30000);
      return;
    }

    console.log('[INFO] CAPTCHA solved. Injecting token...');
    await page.evaluate((token) => {
      document.querySelector('#g-recaptcha-response').innerHTML = token;
    }, token);

    return;
  }

  console.warn('[WARNING] Unknown CAPTCHA service. Defaulting to manual fallback.');
  await page.waitForTimeout(30000);
}

module.exports = { solveCaptcha };
