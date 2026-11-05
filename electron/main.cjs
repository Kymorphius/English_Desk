const {app,BrowserWindow,ipcMain,session,clipboard,dialog,Tray,Menu,nativeImage,screen,Notification,safeStorage,shell}=require('electron');
const path=require('node:path');const fs=require('node:fs/promises');
app.setName('English Desk Studio');
if(process.platform==='win32')app.setAppUserModelId('com.vienky.englishdesk.studio');
app.setPath('userData',process.env.ENGLISH_DESK_TEST === '1' ? path.join(app.getPath('temp'),'english-desk-studio-smoke') : path.join(app.getPath('appData'),'EnglishDeskStudio'));
if(!app.requestSingleInstanceLock()){app.quit();return;}
let win, tray, nativePanel, quitting=false;
app.on('second-instance',()=>{if(win)showPanel()});
const preferencePath=path.join(app.getPath('userData'),'window.json');
let pinned=false;
function showPanel(){
 if(quitting||!win)return;
 if(nativePanel){nativePanel.show();return;}
 if(!tray)return;
 const bounds=tray.getBounds();const area=screen.getDisplayMatching(bounds).workArea;
 // Use the panel's own size rather than reading it back: under fractional scaling (e.g. 150%) getSize/setSize drift by a pixel or two,
 // so the panel grew on every show and visibly resized as it appeared. Move and size in one call, and only when something changed.
 const width=Math.min(400,area.width),height=Math.min(720,area.height);
 const x=Math.max(area.x,Math.min(bounds.x+bounds.width-width,area.x+area.width-width));
 const y=bounds.y<area.y+area.height/2?area.y:area.y+area.height-height;
 const next={x:Math.round(x),y:Math.round(Math.max(area.y,y)),width,height},current=win.getBounds();
 if(['x','y','width','height'].some(k=>current[k]!==next[k]))win.setBounds(next);
 win.show();win.focus();
}
function trayMenu(){return Menu.buildFromTemplate([
 {label:'打开 English Desk',click:showPanel},
 {label:'窗口置顶',type:'checkbox',checked:pinned,click:async item=>{pinned=item.checked;win.setAlwaysOnTop(pinned);await fs.mkdir(app.getPath('userData'),{recursive:true});await fs.writeFile(preferencePath,JSON.stringify({pinned}));}},
 {type:'separator'}, {label:'退出 English Desk',click:()=>{quitting=true;app.quit();}}
 ])}
app.on('before-quit',()=>{quitting=true;if(nativePanel){nativePanel.dispose();nativePanel=null}});
const trusted=e=>e.sender===win?.webContents && e.senderFrame===win.webContents.mainFrame;
function handle(name,fn){ipcMain.handle(name,(e,...args)=>{if(!trusted(e))throw Error('Untrusted sender');return fn(...args)})}
const apiKeyPath=path.join(app.getPath('userData'),'api-keys.json');
async function readApiKeys(){try{return JSON.parse(await fs.readFile(apiKeyPath,'utf8'))}catch{return{}}}
function keySlot(provider){if(typeof provider!=='string'||!provider||provider.length>300)throw Error('无效的服务商');return provider}
async function writeApiKeys(keys){await fs.mkdir(app.getPath('userData'),{recursive:true});await fs.writeFile(apiKeyPath,JSON.stringify(keys),{mode:0o600})}
async function savedApiKey(slot){const keys=await readApiKeys(),stored=keys[keySlot(slot)];if(!stored)return '';if(!await safeStorage.isAsyncEncryptionAvailable())throw Error('系统加密不可用，无法读取已保存的密钥');let decrypted;try{decrypted=await safeStorage.decryptStringAsync(Buffer.from(stored,'base64'))}catch{throw Error('无法读取已保存的密钥，请在设置中重新填写')}
 if(decrypted.shouldReEncrypt){keys[slot]=(await safeStorage.encryptStringAsync(decrypted.result)).toString('base64');await writeApiKeys(keys).catch(console.error)}return decrypted.result}
handle('has-api-key',async slot=>Boolean((await readApiKeys())[keySlot(slot)]));
handle('set-api-key',async(slot,key)=>{key=String(key||'').trim();if(!key)return false;if(key.length>2000)throw Error('密钥过长');if(!await safeStorage.isAsyncEncryptionAvailable())throw Error('系统加密不可用，密钥未保存');const encrypted=(await safeStorage.encryptStringAsync(key)).toString('base64'),keys=await readApiKeys();keys[keySlot(slot)]=encrypted;await writeApiKeys(keys);return true});
handle('delete-api-key',async slot=>{const keys=await readApiKeys();delete keys[keySlot(slot)];await writeApiKeys(keys);return true});
const reminders=require('./word-reminder.cjs').createReminder(path.join(app.getPath('userData'),'word-reminder.json'),()=>{
 if(!Notification.isSupported())return false;
 const notification=new Notification({title:'English Desk · 背词提醒',body:'今天的单词可以开始复习了。点击打开背词面板。'});
 notification.on('click',()=>{showPanel();win.webContents.send('open-vocabulary')});notification.show();return true;
});
handle('get-word-reminder',()=>reminders.get());
handle('set-word-reminder',p=>reminders.set(p));
let appUpdates;
handle('app-update-state',()=>appUpdates.snapshot());
handle('app-update-check',()=>appUpdates.check());
handle('app-update-download',()=>appUpdates.download());
handle('app-update-install',()=>appUpdates.install());
handle('app-update-auto',enabled=>appUpdates.setEnabled(enabled));
handle('app-update-releases',()=>appUpdates.openRelease());
handle('copy',text=>clipboard.writeText(String(text)));
const localModel=require('./local-model.cjs');
handle('download-local-model',model=>localModel.start(model));
handle('local-model-status',()=>localModel.snapshot());
async function standaloneDialog(action){
 if(nativePanel)nativePanel.hide();
 try{return await action()}finally{if(nativePanel&&!quitting)showPanel()}
}
handle('confirm',message=>standaloneDialog(async()=>{if(process.env.ENGLISH_DESK_TEST==='1'&&app.testDialogs?.confirm)return app.testDialogs.confirm(message);if(nativePanel)return nativePanel.confirm(String(message).slice(0,2000));const result=await dialog.showMessageBox({type:'question',message:String(message).slice(0,2000),buttons:['取消','确定'],defaultId:1,cancelId:0});return result.response===1}));
handle('open-text-file',kind=>standaloneDialog(async()=>{
 const result=nativePanel?{filePaths:[nativePanel.selectFile(kind)]}:await dialog.showOpenDialog({properties:['openFile'],filters:[{name:'文字文件',extensions:kind==='template'?['txt','md']:['json','txt','md','csv','tsv']}]});
 if(result.canceled||!result.filePaths[0])return null;
 const file=result.filePaths[0],stat=await fs.stat(file);if(stat.size>2e6)throw Error('文件不能超过 2 MB');
 return {name:path.basename(file),size:stat.size,text:await fs.readFile(file,'utf8')};
}));
handle('save-recording',async bytes=>{if(!Array.isArray(bytes)||bytes.length>30e6)throw Error('录音过大');return standaloneDialog(async()=>{const r=nativePanel?{filePath:nativePanel.selectFile('recording')}:await dialog.showSaveDialog({defaultPath:'speaking.webm',filters:[{name:'WebM audio',extensions:['webm']}]});if(r.canceled||!r.filePath)return false;await fs.writeFile(r.filePath,Buffer.from(bytes));return true})});
const {ai}=require('./ai-client.cjs');
// Saved keys are decrypted only here, when a request is actually made, so launching the app never touches the keychain.
handle('ai',async payload=>{const {key_slot,...config}=payload?.config||{};if(!config.api_key&&key_slot)config.api_key=await savedApiKey(key_slot);return ai({...payload,config})});
// Where the menu bar panel opens: under its status item (default) or at the left of the screen.
const placementPath=path.join(app.getPath('userData'),'panel-placement.json');
handle('get-panel-placement',async()=>{try{return JSON.parse(await fs.readFile(placementPath,'utf8')).placement==='left'?'left':'icon'}catch{return 'icon'}});
handle('set-panel-placement',async placement=>{placement=placement==='left'?'left':'icon';nativePanel?.setPlacement(placement);await fs.mkdir(app.getPath('userData'),{recursive:true});await fs.writeFile(placementPath,JSON.stringify({placement}));return placement});
// Boss key: a global shortcut that hides the panel at once (and stops speech), or brings it back.
const {globalShortcut}=require('electron');
const bossKeyPath=path.join(app.getPath('userData'),'boss-key.json');
let bossKey='Alt+`',bossKeyActive=false;
function bossToggle(){if(quitting||!win)return;const shown=nativePanel?JSON.parse(nativePanel.inspect()).shown:win.isVisible();if(!shown)return showPanel();win.webContents.send('boss-key');if(nativePanel)nativePanel.hide();else win.hide()}
function registerBossKey(key){if(bossKeyActive)globalShortcut.unregister(bossKey);bossKeyActive=false;if(!key)return true;try{bossKeyActive=globalShortcut.register(key,bossToggle)}catch{bossKeyActive=false}return bossKeyActive}
// ⌘ (Ctrl on Windows) plus one key is how apps and the system spell copy, paste, tab switching…; a global boss key must not take those.
const primaryOnly=key=>{const mods=key.split('+').slice(0,-1).filter(m=>m!=='Shift');return mods.length===1&&mods[0]===(process.platform==='darwin'?'Command':'Control')};
const validBossKey=key=>key===''||(key.length<=40&&/^((Command|Control|Alt|Shift)\+)+[^+]+$/.test(key)&&/(Command|Control|Alt)\+/.test(key)&&!primaryOnly(key));
handle('get-boss-key',()=>({key:bossKey,active:bossKeyActive}));
handle('pause-boss-key',paused=>{if(paused){if(bossKeyActive)globalShortcut.unregister(bossKey);bossKeyActive=false}else registerBossKey(bossKey);return {key:bossKey,active:bossKeyActive}});
handle('set-boss-key',async key=>{key=key==null?'':String(key);if(!validBossKey(key))throw Error(primaryOnly(key)?'这个组合是常用的系统或应用快捷键，请再加上 ⌥ 或 ⌃':'老板键需要包含 ⌘、⌃ 或 ⌥ 中的至少一个');const prev=bossKey;
 if(!registerBossKey(key)){bossKey=prev;registerBossKey(prev);throw Error('这个组合已被其他应用占用，请换一个')}
 bossKey=key;await fs.mkdir(app.getPath('userData'),{recursive:true});await fs.writeFile(bossKeyPath,JSON.stringify({key}));return {key,active:bossKeyActive}});
app.on('will-quit',()=>globalShortcut.unregisterAll());
app.whenReady().then(async()=>{try{const saved=JSON.parse(await fs.readFile(bossKeyPath,'utf8')).key;if(typeof saved==='string'&&validBossKey(saved))bossKey=saved}catch{}registerBossKey(bossKey);if(process.env.ENGLISH_DESK_TEST==='1')app.testBossToggle=bossToggle});
app.whenReady().then(async()=>{
 await fs.mkdir(app.getPath('userData'),{recursive:true});await reminders.load();
 const updatePref=path.join(app.getPath('userData'),'updates.json');
 appUpdates=require('./app-updates.cjs').createUpdates({platform:process.platform,version:app.getVersion(),isPackaged:app.isPackaged,
  engine:process.platform==='win32'?require('electron-updater').autoUpdater:null,
  fetchRelease:async()=>{const r=await fetch('https://api.github.com/repos/Vienky/English_Desk/releases/latest',{headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Update check failed');return r.json()},
  openDownload:url=>shell.openExternal(url),beforeInstall:()=>{quitting=true},
  loadPreference:async()=>JSON.parse(await fs.readFile(updatePref,'utf8')).enabled,
  savePreference:enabled=>fs.writeFile(updatePref,JSON.stringify({enabled})),
  onChange:s=>{if(win&&!win.isDestroyed())win.webContents.send('app-update-status',s)}
 });await appUpdates.init();
 if(process.env.ENGLISH_DESK_TEST!=='1'){setTimeout(()=>appUpdates.check(true),15000).unref();setInterval(()=>appUpdates.check(true),6*60*60*1000).unref();}
 setInterval(()=>reminders.tick().catch(console.error),15000).unref();
 try{pinned=JSON.parse(await fs.readFile(preferencePath,'utf8')).pinned===true}catch{}
 session.defaultSession.setPermissionRequestHandler((contents,permission,callback,details)=>callback(contents===win?.webContents&&permission==='media'&&!(details.mediaTypes||[]).includes('video')));
 if(process.platform==='darwin')app.dock.hide();
 win=new BrowserWindow({show:false,transparent:true,frame:false,skipTaskbar:true,fullscreenable:false,roundedCorners:true,width:400,height:720,minWidth:400,minHeight:500,title:'English Desk Studio',backgroundColor:'#00000000',vibrancy:process.platform==='darwin'?undefined:'under-window',backgroundMaterial:'acrylic',visualEffectState:'active',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 win.setAlwaysOnTop(pinned);
 if(process.platform==='darwin'){
  nativePanel=require('../native/macos/popover.node');
  try{nativePanel.setPlacement(JSON.parse(require('node:fs').readFileSync(placementPath,'utf8')).placement)}catch{}
  if(process.env.ENGLISH_DESK_TEST==='1')app.testPanel=nativePanel;
  nativePanel.create(win.getNativeWindowHandle(),pinned,event=>{
   if(event==='show')win.webContents.focus();
   if(event==='quit'){quitting=true;app.quit()}
   if(event==='pin'){pinned=JSON.parse(nativePanel.inspect()).pinned;fs.mkdir(app.getPath('userData'),{recursive:true}).then(()=>fs.writeFile(preferencePath,JSON.stringify({pinned}))).catch(console.error)}
  });
 }else{
  const icon=nativeImage.createFromPath(path.join(__dirname,'tray.png')).resize({width:24,height:24});
  tray=new Tray(icon);tray.setToolTip('English Desk Studio');
  tray.on('click',()=>{if(win.isVisible()&&win.isFocused())win.hide();else showPanel()});
  tray.on('right-click',()=>tray.popUpContextMenu(trayMenu()));
  win.on('blur',()=>{if(!pinned&&!win.getChildWindows().length)win.hide()});
 }
 win.webContents.on('before-input-event',(event,input)=>{if(input.type==='keyDown'&&input.key==='Escape'){event.preventDefault();if(nativePanel)nativePanel.hide();else win.hide()}});
 win.once('ready-to-show',showPanel);
 win.on('close',e=>{if(!quitting){e.preventDefault();if(nativePanel)nativePanel.hide();else win.hide()}});
 app.on('activate',()=>showPanel());
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());win.loadFile(path.join(__dirname,'../src/index.html'));
});
app.on('window-all-closed',()=>app.quit());
