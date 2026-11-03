const {_electron:electron}=require('@playwright/test');const assert=require('node:assert/strict');
(async()=>{const app=await electron.launch({executablePath:process.env.ED_ELECTRON_PATH||'/tmp/english-desk-electron-check/Electron.app/Contents/MacOS/Electron',args:['.'],env:{...process.env,ENGLISH_DESK_TEST:'1'}});try{
const p=await app.firstWindow();p.setDefaultTimeout(8000);await app.evaluate(({app})=>{app.testPanel.setPinned(true);app.testPanel.show();app.testDialogs={confirm:()=>true}});
await p.evaluate(()=>localStorage.clear());await p.reload();await p.locator('[data-page=speaking]').click();
const rows=p.locator('[data-question-id]'),first=rows.nth(0),second=rows.nth(1);
assert.equal(await first.locator('.question-reference').getAttribute('open'),null);
await first.locator('.question-reference>summary').click();const original=await first.locator('.answer').innerText();await first.locator('[data-action=edit-reference]').click();await first.getByLabel('参考回答',{exact:true}).fill('My edited reference.\nA second paragraph.');await first.locator('[data-action=finish-reference]').click();
await p.evaluate(()=>{window.spoken=[];window.speak=text=>window.spoken.push(text)});
await first.locator('[data-action=read-reference]').click();assert.deepEqual(await p.evaluate(()=>window.spoken),['My edited reference.\nA second paragraph.']);
await second.locator('.question-reference>summary').click();await second.locator('[data-action=edit-reference]').click();await second.getByLabel('参考回答',{exact:true}).fill('Another answer.');await second.locator('[data-action=finish-reference]').click();
await p.reload();await p.locator('[data-page=speaking]').click();await first.locator('.question-reference>summary').click();assert.match(await first.locator('.answer').innerText(),/My edited reference/);await second.locator('.question-reference>summary').click();assert.equal(await second.locator('.answer').innerText(),'Another answer.');assert.equal(await first.locator('[data-role=draft]').inputValue(),'');
await first.locator('[data-action=reset-reference]').click();assert.equal(await first.locator('.answer').innerText(),original);
await second.locator('[data-action=edit-reference]').click();await second.getByLabel('参考回答',{exact:true}).fill('');await second.locator('[data-action=finish-reference]').click();assert.equal(await second.locator('[data-action=read-reference]').count(),0);
await first.locator('.question-reference>summary').click();assert.equal(await first.locator('.question-reference').getAttribute('open'),null);
console.log('PASS: edit/add reference, per-question persistence, reading edited text, draft isolation, empty answer, restore and collapse.');
}finally{await app.close()}})().catch(e=>{console.error(e);process.exit(1)});
