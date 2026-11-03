const {_electron:electron}=require('@playwright/test');
(async()=>{
 const app=await electron.launch({...(process.env.ED_ELECTRON_PATH?{executablePath:process.env.ED_ELECTRON_PATH}:{}),args:['.'],env:{...process.env,ENGLISH_DESK_TEST:'1'}});
 try{
 const p=await app.firstWindow();p.setDefaultTimeout(10000);
 await app.evaluate(({app})=>{app.testPanel?.setPinned(true);app.testPanel?.show()});
 await p.evaluate(()=>localStorage.clear());await p.reload();
 const shot=async name=>{await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:`docs/images/${name}.png`,scale:'css'})};
 await shot('writing-panel');
 await p.locator('[data-page=speaking]').click();await p.locator('#filter-trigger').click();await p.getByRole('option',{name:'Part 1',exact:true}).click();
 await shot('speaking-panel');
 const first=p.locator('[data-question-id]').first();await first.locator('.question-reference>summary').click();await first.locator('[data-action=edit-reference]').click();await shot('reference-editor');
 await p.locator('[data-page=speaking]').click();await p.locator('#filter-trigger').click();await p.getByRole('option',{name:'Part 2',exact:true}).click();await p.locator('.reference-logic>summary').click();await p.locator('[data-edit-logic]').click();await p.locator('.editable-logic').scrollIntoViewIfNeeded();await p.screenshot({path:'docs/images/logic-editor.png',scale:'css'});
 await p.locator('[data-page=library]').click();await p.locator('#loadTemplateExample').click();await p.locator('#toast.visible').waitFor({state:'hidden'});await shot('import-panel');
 await p.locator('[data-page=settings]').click();await p.locator('#speechAccent-trigger').click();await shot('settings-panel');
 await p.locator('[data-page=speaking]').click();await p.evaluate(()=>scrollTo(0,0));
 console.log('Screenshots saved. Press Enter to close the screenshot app.');
 if(process.env.ED_CAPTURE_NATIVE==='1'){await new Promise(resolve=>process.stdin.once('data',resolve));process.stdin.pause();}
 }finally{await app.close()}
})().catch(e=>{console.error(e);process.exit(1)});
