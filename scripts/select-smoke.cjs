const { _electron: electron } = require('@playwright/test');
const assert = require('node:assert/strict');
(async()=>{
 const app=await electron.launch({executablePath:process.env.ED_ELECTRON_PATH||'/tmp/english-desk-electron-check/Electron.app/Contents/MacOS/Electron',args:['.'],env:{...process.env,ENGLISH_DESK_TEST:'1'}});
 try{
 const p=await app.firstWindow(); p.setDefaultTimeout(8000); console.log("window ready");
 await app.evaluate(({app})=>{app.testPanel.setPinned(true);app.testPanel.show()});
 console.log('settings');await p.locator('[data-page=settings]').click();
 await p.locator('#speechAccent-trigger').click();
 await p.getByRole('option',{name:'美式英语 · American English',exact:true}).click();
 assert.equal(await p.locator('#speechAccent').inputValue(),'en-US');
 await p.reload();await p.locator('[data-page=settings]').click();
 assert.match(await p.locator('#speechAccent-trigger').innerText(),/American/);
 await p.locator('#speechAccent-trigger').click();
 await p.getByRole('option',{name:'英式英语 · British English',exact:true}).click();
 assert.equal(await p.locator('#speechAccent').inputValue(),'en-GB');
 await p.locator('[data-page=speaking]').click();
 await p.locator('#filter-trigger').click();await p.getByRole('option',{name:'Part 1',exact:true}).click();
 const old=await p.locator('#picker').inputValue();
 await p.locator('#picker-trigger').click();await p.getByRole('option').nth(1).click();
 assert.notEqual(await p.locator('#picker').inputValue(),old);
 assert.equal(await p.getByRole('listbox').count(),0);
 await p.locator('#picker-trigger').click();await p.keyboard.press('ArrowDown');await p.keyboard.press('Enter');
 assert.equal(await p.getByRole('listbox').count(),0);
 await p.locator('#draw').click();
 assert.equal(await p.locator('#picker-trigger').innerText(),await p.locator('#picker option:checked').innerText());
 await p.locator('[data-page=writing]').click();await p.locator('#filter-trigger').click();await p.getByRole('option').nth(1).click();
 await p.locator('#templateSelect-trigger').click();await p.getByRole('option').first().click();
 console.log('PASS: real clicks switch/persist accents, topic and category; keyboard selection, draw label sync, template menu.');
 }finally{await app.close()}
})().catch(e=>{console.error(e);process.exit(1)});
