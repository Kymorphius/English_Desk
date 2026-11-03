const { _electron:electron }=require('@playwright/test');const assert=require('node:assert/strict');const fs=require('node:fs');const http=require('node:http');
(async()=>{
 fs.rmSync(require('node:path').join(require('node:os').tmpdir(),'english-desk-studio-smoke'),{recursive:true,force:true});
 const calls=[];const server=http.createServer((req,res)=>{let b=[];req.on('data',c=>b.push(c));req.on('end',()=>{calls.push({url:req.url,auth:req.headers.authorization,body:Buffer.concat(b).toString()});res.setHeader('Content-Type','application/json');res.end(JSON.stringify(req.url.includes('transcriptions')?{text:'This is the transcribed test answer.'}:{choices:[{message:{content:'Mock review completed.'}}]}))})});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+'/v1';
 const app=await electron.launch({...(process.env.ED_ELECTRON_PATH?{executablePath:process.env.ED_ELECTRON_PATH}:{}),args:['.', '--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream'],env:{...process.env,ENGLISH_DESK_TEST:'1'}});const p=await app.firstWindow();await app.evaluate(({app})=>{app.testDialogs={confirm:()=>true}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.getByRole('heading',{name:'写作练习',exact:true}).waitFor();
 await p.getByLabel('我的回答').fill('A test draft that must stay attached to this question.');
 const first=await p.locator('#picker').inputValue();await p.locator('#draw').click();assert.notEqual(await p.locator('#picker').inputValue(),first);assert.equal(await p.getByLabel('我的回答').inputValue(),'');
 await p.locator('#picker').selectOption(first);assert.ok((await p.getByLabel('我的回答').inputValue()).includes('test draft'));
 await p.getByRole('button',{name:'模板与语料'}).click();await p.locator('#templateName').fill('Test template');await p.locator('#templateText').fill('I believe {{观点}}.\nFor example, {{例子}}.');await p.locator('#saveTemplate').click();
 await p.locator('[data-page="writing"]').click();await p.locator('#templateSelect').selectOption({label:'Test template'});await p.getByLabel('观点',{exact:true}).fill('education matters');await p.getByLabel('例子',{exact:true}).fill('libraries help');await p.locator('#applyTemplate').click();assert.equal(await p.getByLabel('我的回答').inputValue(),'I believe education matters.\nFor example, libraries help.');
 await p.locator('[data-page="library"]').click();await p.locator('#materialFile').setInputFiles({name:'test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([{part:1,title:'Test import',question:'Do you like unit tests?',answer:'Yes, I do.',logic:['test→confidence']}]))});await p.getByText('Do you like unit tests?',{exact:true}).waitFor();
 await p.locator('[data-page="speaking"]').click();await p.locator('#search').fill('Do you like unit tests?');assert.equal(await p.locator('.question-text').innerText(),'Do you like unit tests?');assert.ok((await p.locator('.answer').textContent()).includes('Yes, I do.'));
 await p.locator('#search').fill('');await p.locator('#filter').selectOption('2');await p.locator('#picker').selectOption('s2-1');await p.locator('#round').click();assert.ok((await p.locator('#round-view').innerText()).includes('Part 3'));
 await p.locator('[data-page="settings"]').click();await p.locator('#key').fill('TEST_SECRET');await p.locator('#base').fill(base);await p.locator('#saveSettings').click();assert.ok(!(await p.evaluate(()=>JSON.stringify(localStorage))).includes('TEST_SECRET'));
 await p.locator('[data-page="speaking"]').click();await p.locator('#askAI').click();await p.getByText('Mock review completed.',{exact:true}).waitFor();await p.locator('#record').click();await p.getByRole('button',{name:'停止录音',exact:true}).waitFor();await p.waitForTimeout(1200);await p.locator('#record').click();await p.getByRole('button',{name:'重新录音',exact:true}).waitFor();await p.locator('#transcribe').click();await p.waitForFunction(()=>document.querySelector('#draft').value.includes('transcribed test answer'));assert.equal(calls.length,2);assert.equal(calls[0].auth,'Bearer TEST_SECRET');assert.ok(calls[1].body.includes('practice.webm'));
 await p.locator('[data-page="writing"]').click();await p.getByLabel('我的回答').fill('');await p.screenshot({path:'outputs/writing.png',fullPage:true});
 await p.locator('[data-page="speaking"]').click();await p.locator('#filter').selectOption('2');await p.locator('#picker').selectOption('s2-1');await p.screenshot({path:'outputs/speaking.png',fullPage:true});
 if(process.platform==='darwin'){
  const panel=JSON.parse(await app.evaluate(({app})=>{app.testPanel.show();return app.testPanel.inspect()}));
  assert.equal(panel.kind,'NSPopover');assert.equal(panel.templateIcon,true);assert.equal(panel.behindWindow,true);assert.equal(panel.material,6);assert.equal(panel.width,400);assert.equal(panel.shown,true);
  assert.equal(await app.evaluate(({app})=>app.dock.isVisible()),false);
  await app.evaluate(({app})=>app.testPanel.hide());await require('@playwright/test').expect.poll(async()=>JSON.parse(await app.evaluate(({app})=>app.testPanel.inspect())).shown).toBe(false);
  await app.evaluate(({app})=>app.testPanel.show());assert.equal(JSON.parse(await app.evaluate(({app})=>app.testPanel.inspect())).shown,true);
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.sendInputEvent({type:'keyDown',keyCode:'Escape'}));
  await require('@playwright/test').expect.poll(async()=>JSON.parse(await app.evaluate(({app})=>app.testPanel.inspect())).shown).toBe(false);
 }else{
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].emit('blur'));assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isVisible()),false);
 }
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].close());assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().length),1);
 assert.deepEqual(errors,[]);console.log('PASS: desktop launch, random selection, draft isolation, template fill, JSON import, speaking round, secret exclusion, native popover and glass, hidden Dock, hide/reopen/Escape, no page errors');await app.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
