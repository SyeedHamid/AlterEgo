const fetch = require('node-fetch');
require('dotenv').config();

const TWO_CAPTCHA_API = 'https://2captcha.com';
const API_KEY = process.env.TWOCAPTCHA_API_KEY;

async function solveCaptcha(page) {
  console.log('[INFO] Checking for CAPTCHA...');

  const siteKey = await page.evaluate(() => {
    const el = document.querySelector('.g-recaptcha');
    return el ? el.getAttribute('data-sitekey') : null;
  });

  if (!siteKey) {
    console.log('[INFO] No CAPTCHA found.');
    return false;
  }

  const pageUrl = page.url();

  const submitRes = await fetch(`${TWO_CAPTCHA_API}/in.php`, {
    method: 'POST',
    body: new URLSearchParams({
      key: API_KEY,
      method: 'userrecaptcha',
      googlekey: siteKey,
      pageurl: pageUrl,
      json: 1
    })
  });

  const { status, request: captchaId } = await submitRes.json();
  if (status !== 1) throw new Error(`2Captcha submit failed: ${captchaId}`);

  let token;
  for (let i = 0; i < 20; i++) {
    await new Promise(res => setTimeout(res, 5000));
    const pollRes = await fetch(`${TWO_CAPTCHA_API}/res.php?key=${API_KEY}&action=get&id=${captchaId}&json=1`);
    const data = await pollRes.json();
    if (data.status === 1) {
      token = data.request;
      break;
    }
    console.log(`[INFO] Waiting for CAPTCHA solution... (${i + 1}/20)`);
  }

  if (!token) throw new Error('CAPTCHA solving timed out');

  await page.evaluate(token => {
    document.querySelector('#g-recaptcha-response').innerHTML = token;
  }, token);

  console.log('[SUCCESS] CAPTCHA solved.');
  return true;
}

module.exports = { solveCaptcha };
