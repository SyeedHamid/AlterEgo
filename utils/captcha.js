const fetch = require('node-fetch');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
require('dotenv').config();

puppeteer.use(StealthPlugin());

async function solveCaptcha(page) {
  console.log('[INFO] Checking for reCAPTCHA...');

  const siteKey = await page.evaluate(() => {
    const el = document.querySelector('.g-recaptcha');
    return el? el.getAttribute('data-sitekey') : null;
  });

  if (!siteKey) {
    console.log('[INFO] No reCAPTCHA found on page.');
    return false;
  }

  const pageUrl = page.url();
  const apiKey = process.env.TWOCAPTCHA_API_KEY;

  // Submit CAPTCHA to 2Captcha
  const submitRes = await fetch('https://2captcha.com/in.php', {
    method: 'POST',
    body: new URLSearchParams({
      key: apiKey,
      method: 'userrecaptcha',
      googlekey: siteKey,
      pageurl: pageUrl,
      json: 1
    })
  });

  const { status, request: captchaId } = await submitRes.json();
  if (status !== 1) throw new Error(`2Captcha submit failed: ${captchaId}`);

  console.log(`[INFO] CAPTCHA submitted. ID: ${captchaId}`);

  // Poll for result
  let token;
  for (let i = 0; i < 20; i++) {
    await new Promise(res => setTimeout(res, 5000));
    const pollRes = await fetch(`https://2captcha.com/res.php?key=${apiKey}&action=get&id=${captchaId}&json=1`);
    const pollData = await pollRes.json();
    if (pollData.status === 1) {
      token = pollData.request;
      break;
    }
    console.log(`[INFO] Waiting for CAPTCHA solution... (${i + 1}/20)`);
  }

  if (!token) throw new Error('CAPTCHA solving timed out');

  // Inject token into page
  await page.evaluate((token) => {
    document.querySelector('#g-recaptcha-response').innerHTML = token;
  }, token);

  console.log('[SUCCESS] CAPTCHA solved and token injected.');
  return true;
}

module.exports = { solveCaptcha };
