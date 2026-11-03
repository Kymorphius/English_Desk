const {_electron:electron}=require('@playwright/test');const assert=require('node:assert/strict');
(async()=>{const app=await electron.launch({executablePath:process.env.ED_ELECTRON_PATH||'/tmp/english-desk-electron-check/Electron.app/Contents/MacOS/Electron',args:['.'],env:{...process.env,ENGLISH_DESK_TEST:'1'}});try{
const p=await app.firstWindow();p.setDefaultTimeout(8000);await app.evaluate(({app})=>{app.testPanel.setPinned(true);app.testPanel.show();app.testDialogs={confirm:()=>true}});
await p.evaluate(()=>localStorage.clear());await p.reload();
await p.locator('.reference-logic>summary').first().click();await p.locator('[data-edit-logic]').click();
assert.match(await p.getByLabel('逻辑链、例子与表达').inputValue(),/具体例子/);
await p.getByLabel('立场与作答结构').fill('我修改的结构');await p.getByLabel('逻辑链、例子与表达').fill('原因→机制→结果\n自己的例子');await p.locator('[data-finish-logic]').click();
await p.locator('#copyReview').click();assert.match(await app.evaluate(({clipboard})=>clipboard.readText()),/我修改的结构/);
await p.locator('#draw').click();assert.equal(await p.locator('[data-reset-logic]').count(),0);
await p.reload();await p.locator('.reference-logic>summary').first().click();assert.match(await p.locator('.editable-logic').innerText(),/自己的例子/);
await p.locator('[data-reset-logic]').click();assert.match(await p.locator('.editable-logic').innerText(),/可支配收入/);
await p.locator('[data-page=speaking]').click();const row=p.locator('[data-question-id]').first();await row.locator('.question-practice>summary').click();await row.locator('.reference-logic>summary').click();await row.locator('[data-edit-logic]').click();await row.getByLabel('立场与作答结构').fill('口语个人结构');await row.locator('[data-finish-logic]').click();await row.locator('[data-action=copy]').click();assert.match(await app.evaluate(({clipboard})=>clipboard.readText()),/口语个人结构/);
await p.locator('#filter-trigger').click();await p.getByRole('option',{name:'Part 2',exact:true}).click();await p.locator('.reference-logic>summary').click();await p.locator('[data-edit-logic]').click();await p.getByLabel('逻辑链、例子与表达').fill('Part 2 自定义逻辑');await p.locator('[data-finish-logic]').click();assert.match(await p.locator('.editable-logic').innerText(),/Part 2 自定义逻辑/);
console.log('PASS: writing/speaking editable, per-question persistence/isolation, copy uses edits, original details retained, restore defaults.');
}finally{await app.close()}})().catch(e=>{console.error(e);process.exit(1)});
