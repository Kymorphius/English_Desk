const {_electron,expect}=require('@playwright/test');const assert=require('node:assert/strict');
(async()=>{
 const a=await _electron.launch({...(process.env.ED_ELECTRON_PATH?{executablePath:process.env.ED_ELECTRON_PATH}:{}),args:['.'],env:{...process.env,ENGLISH_DESK_TEST:'1'}});
 try{
  const p=await a.firstWindow();await p.locator('#ideas').waitFor();await p.evaluate(()=>localStorage.clear());await p.reload();
  await expect(p.locator('.reference-logic')).not.toHaveAttribute('open','');await expect(p.locator('.reference-logic .stance')).toBeHidden();
  await p.locator('#ideas').fill('I support targeted help because families can pay medical bills.');const id=await p.locator('#picker').inputValue();
  await p.locator('#draw').click();assert.equal(await p.locator('#ideas').inputValue(),'');await p.locator('#picker').selectOption(id);assert.match(await p.locator('#ideas').inputValue(),/targeted help/);await p.reload();assert.match(await p.locator('#ideas').inputValue(),/targeted help/);
  await p.locator('#copyIdeas').click();const copied=await a.evaluate(({clipboard})=>clipboard.readText());assert.match(copied,/targeted help/);assert.match(copied,/保留学习者/);
  assert.equal(await p.locator('.prompt').evaluate(e=>getComputedStyle(e).fontSize),'14px');assert.equal(await p.locator('body').evaluate(e=>getComputedStyle(e).fontSize),'13px');
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await p.locator('#ideas').fill('');await p.evaluate(()=>scrollTo(0,0));await p.locator('#toast.visible').waitFor({state:'hidden'});await p.screenshot({path:'docs/images/writing-panel.png',scale:'css'});
  await p.locator('.reference-logic summary').first().click();await expect(p.locator('.reference-logic .stance')).toBeVisible();assert.equal(await p.locator('.logic-steps li').count(),12);
  await p.locator('[data-page="speaking"]').click();await p.locator('#filter').selectOption('1');assert.equal(await p.locator('.topic-questions li').count(),8);await expect(p.locator('.logic')).toBeHidden();await expect(p.locator('.sample .answer')).toBeHidden();await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:'docs/images/speaking-panel.png',scale:'css'});
  for(let cycle=0;cycle<4;cycle++){await p.locator('.sample>summary').first().click();await expect(p.locator('.answer')).toBeVisible();await p.locator('.sample>summary').first().click();await expect(p.locator('.answer')).toBeHidden();}await p.locator('[data-page="writing"]').click();await p.locator('[data-page="speaking"]').click();await expect(p.locator('.sample .answer')).toBeHidden();
  await p.locator('#filter').selectOption('2');await expect(p.locator('.logic .stance')).toBeHidden();assert.equal(await p.locator('#askAI').innerText(),'提交');const icons=p.locator('.record .audio-tools button');assert.equal(await icons.count(),5);const boxes=await icons.evaluateAll(es=>es.map(e=>({y:e.getBoundingClientRect().y,title:e.title,label:e.getAttribute('aria-label')})));assert.equal(new Set(boxes.map(b=>b.y)).size,1);assert.ok(boxes.every(b=>b.title&&b.title===b.label));
  await p.locator('[data-page="library"]').click();await p.locator('#loadTemplateExample').click();assert.match(await p.locator('#templateText').inputValue(),/\{\{/);await p.locator('#saveTemplate').click();await p.evaluate(()=>scrollTo(0,0));await p.locator('#toast.visible').waitFor({state:'hidden'});await p.screenshot({path:'docs/images/import-panel.png',scale:'css'});
  await p.locator('[data-page="writing"]').click();await p.locator('#templateSelect').selectOption({label:'部分同意型 · 导入示例'});assert.ok(await p.locator('.slot').count()>10);
  await p.locator('[data-page="settings"]').click();await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:'docs/images/settings-panel.png',scale:'css'});
  if(process.platform==='darwin'){
   await a.evaluate(({app})=>{app.testPanel.setPinned(false);app.testPanel.show()});
   let info=JSON.parse(await a.evaluate(({app})=>app.testPanel.inspect()));assert.equal(info.kind,'NSPopover');assert.equal(info.width,400);assert.equal(info.templateIcon,true);
   await a.evaluate(({app})=>app.testPanel.clickStatus());await expect.poll(async()=>JSON.parse(await a.evaluate(({app})=>app.testPanel.inspect())).shown).toBe(false);
   await a.evaluate(({app})=>app.testPanel.clickStatus());await expect.poll(async()=>JSON.parse(await a.evaluate(({app})=>app.testPanel.inspect())).shown).toBe(true);
  }
  console.log('PASS: original font sizes, no horizontal overflow, write-first logic, per-question persistence, preserved ideas in AI copy, collapsed reference and sample, full Part 1 topic card, removed generic guidance, template example, native status-button toggle');
 }finally{await a.close()}
})().catch(e=>{console.error(e);process.exit(1)});
