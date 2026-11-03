const { _electron: electron } = require('@playwright/test');
const assert = require('node:assert/strict');
(async () => {
  const app = await electron.launch({
    ...(process.env.ED_ELECTRON_PATH ? { executablePath: process.env.ED_ELECTRON_PATH } : {}),
    args: ['.'], env: { ...process.env, ENGLISH_DESK_TEST: '1' }
  });
  try {
    const p = await app.firstWindow();
    await p.locator('#workspace').waitFor();
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    const stub = async () => p.evaluate(() => {
      window.spoken = [];
      window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
      speechSynthesis.getVoices = () => [
        { name: 'British test voice', lang: 'en-GB', localService: true },
        { name: 'American test voice', lang: 'en-US', localService: true }
      ];
      speechSynthesis.speak = u => window.spoken.push({ lang: u.lang, voice: u.voice.name, text: u.text });
      speechSynthesis.cancel = () => {};
    });
    await stub();
    await p.locator('[data-page="settings"]').click();
    assert.equal(await p.locator('#speechAccent').inputValue(), 'en-GB');
    await p.locator('#previewSpeech').click();
    assert.equal((await p.evaluate(() => window.spoken.at(-1))).voice, 'British test voice');
    await p.locator('#speechAccent').selectOption('en-US');
    await p.reload(); await stub();
    await p.locator('[data-page="settings"]').click();
    assert.equal(await p.locator('#speechAccent').inputValue(), 'en-US');
    await p.locator('[data-page="speaking"]').click();
    await p.locator('#filter').selectOption('2');
    await p.locator('.sample>summary').click();
    await p.locator('#draft').fill('An original answer.');
    await p.locator('#speak').click();
    await p.locator('#readSample').click();
    const spoken = await p.evaluate(() => window.spoken);
    assert.equal(spoken.length, 2);
    assert.ok(spoken.every(u => u.lang === 'en-US' && u.voice === 'American test voice'));
    await p.evaluate(() => { speechSynthesis.getVoices = () => [{ name: 'British only', lang: 'en-GB' }]; });
    await p.locator('#speak').click();
    await p.getByText(/系统尚未安装美式英语语音/).waitFor();
    assert.equal(await p.evaluate(() => window.spoken.length), 2);
    await p.locator('[data-page="settings"]').click();
    await p.screenshot({ path: 'outputs/accent-settings.png', fullPage: true, scale: 'css' });
    console.log('PASS: British default, American persistence after reload, both reading entries, missing-accent notice without fallback.');
  } finally { await app.close(); }
})().catch(e => { console.error(e); process.exit(1); });
