'use strict';
// Tab shortcuts: ⌘1–⌘5 by default (Ctrl+1–5 on Windows), rebindable in the settings; ⌘, always opens settings, the standard
// settings shortcut. Holding ⌘ for a moment shows each tab's shortcut. Bindings need ⌘, ⌃ or ⌥ so they never clash with the
// single keys used on vocabulary cards.
(()=>{
 const mac=window.desktop?window.desktop.platform==='darwin':/Mac/.test(navigator.platform),primary=mac?'Meta':'Control',mod=mac?'⌘':'Ctrl+';
 const tabs=[...document.querySelectorAll('nav [data-page]')],names=tabs.map(b=>b.firstChild.textContent.trim()),settingsTab=tabs.find(b=>b.dataset.page==='settings');
 const STORE='english-desk-tab-keys',MODS=['Control','Alt','Shift','Meta'];
 const defaults=()=>Object.fromEntries(tabs.map((b,i)=>[b.dataset.page,`${primary}+Digit${i+1}`]));
 const comboOf=e=>[...MODS.filter(m=>e[{Control:'ctrlKey',Alt:'altKey',Shift:'shiftKey',Meta:'metaKey'}[m]]),e.code].join('+');
 const SYMBOLS={Comma:',',Period:'.',Slash:'/',Semicolon:';',Quote:"'",BracketLeft:'[',BracketRight:']',Backquote:'`',Minus:'-',Equal:'=',Backslash:'\\',Space:'空格'};
 const label=combo=>{const parts=combo.split('+'),code=parts.pop(),sym=mac?{Control:'⌃',Alt:'⌥',Shift:'⇧',Meta:'⌘'}:{Control:'Ctrl+',Alt:'Alt+',Shift:'Shift+',Meta:'Win+'};return MODS.filter(m=>parts.includes(m)).map(m=>sym[m]).join('')+(SYMBOLS[code]||code.replace(/^Key|^Digit|^Numpad/,''))};
 let keys;try{const saved=JSON.parse(localStorage.getItem(STORE)||'{}');keys={...defaults(),...saved}}catch{keys=defaults()}
 const save=()=>{try{localStorage.setItem(STORE,JSON.stringify(keys))}catch{}};
 // The hint shown while holding ⌘ drops the ⌘ itself, so only shortcuts using other modifiers show them.
 const hintOf=combo=>{const parts=combo.split('+');return parts.length===2&&parts[0]===primary?label(parts[1]):label(combo)};
 const applyTitles=()=>tabs.forEach((b,i)=>{const k=label(keys[b.dataset.page]);b.dataset.key=hintOf(keys[b.dataset.page]);b.title=`${names[i]}（${k}${b===settingsTab?` 或 ${mod},`:''}）`});applyTitles();
 // Under ⌘ (Ctrl on Windows) these are copy, paste, cut, select all, undo, quit, close, hide and minimise.
 const RESERVED=new Set(['KeyC','KeyV','KeyX','KeyA','KeyZ','KeyQ','KeyW','KeyH','KeyM','Comma']);
 const bossCombo=async()=>{try{const r=window.bossKey&&await window.bossKey.get();return r?.key?label(r.key.replace(/\bCommand\b/,'Meta').replace(/\+([A-Z])$/,'+Key$1').replace(/\+(\d)$/,'+Digit$1').replace(/\+`$/,'+Backquote')):''}catch{return ''}};
 let capture=null;
 // While a tab shortcut is being recorded, the next key press is captured here before anything else sees it.
 document.addEventListener('keydown',e=>{if(!capture)return;e.preventDefault();e.stopImmediatePropagation();
  if(e.key==='Escape'||e.key==='Tab')return capture.cancel();
  if(/^(Shift|Control|Alt|Meta|CapsLock|Fn)/.test(e.code))return;
  if(!(e.metaKey||e.ctrlKey||e.altKey))return capture.say('标签快捷键需要包含 ⌘、⌃ 或 ⌥，以免和单词卡片上的单键冲突。');
  const combo=comboOf(e);
  if(RESERVED.has(e.code)&&combo.split('+').slice(0,-1).filter(m=>m!=='Shift').join()===primary)return capture.say(`${label(combo)} 是复制、粘贴、退出等常用快捷键，请换一个。`);
  capture.done(combo)},true);
 let hintTimer;const hideHints=()=>{clearTimeout(hintTimer);document.body.classList.remove('show-tab-keys')};
 document.addEventListener('keydown',e=>{
  if(e.key===(mac?'Meta':'Control')){if(!e.repeat){clearTimeout(hintTimer);hintTimer=setTimeout(()=>document.body.classList.add('show-tab-keys'),500)}return}
  hideHints();
  if(!(e.metaKey||e.ctrlKey||e.altKey))return;
  const combo=comboOf(e),target=tabs.find(b=>keys[b.dataset.page]===combo)||(combo===`${primary}+Comma`?settingsTab:null);
  if(!target)return;
  e.preventDefault();if(!target.classList.contains('selected'))target.click();
 });
 document.addEventListener('keyup',hideHints);window.addEventListener('blur',hideHints);
 // Settings section: listed after the boss key, or after the panel appearance, whenever the settings page is drawn.
 function renderSettings(box,status=''){
  box.innerHTML=`<h2>标签切换</h2><div class="tab-key-list">${tabs.map((b,i)=>`<span><button type="button" class="tab-bind" data-tab="${b.dataset.page}" aria-label="${names[i]}的快捷键：${label(keys[b.dataset.page])}，点击更换">${label(keys[b.dataset.page])}</button>${names[i]}</span>`).join('')}<span><kbd>${mod},</kbd>设置</span></div><div class="tools"><button type="button" id="resetTabKeys" class="quiet">恢复默认</button></div><p class="muted">面板打开时有效。点击快捷键后按下新的组合即可更换，需包含 ⌘、⌃ 或 ⌥；与其他标签重复时自动交换。按住 ${mac?'⌘':'Ctrl'} 片刻，标签上会显示快捷键。</p><p class="muted" role="status" id="tabKeyStatus">${status}</p>`;
  const say=t=>{box.querySelector('#tabKeyStatus').textContent=t};
  box.querySelector('#resetTabKeys').disabled=JSON.stringify(keys)===JSON.stringify(defaults());
  box.querySelector('#resetTabKeys').onclick=()=>{keys=defaults();save();applyTitles();renderSettings(box,'已恢复默认快捷键。')};
  box.querySelectorAll('[data-tab]').forEach(btn=>{
   btn.onclick=()=>{if(capture)return capture.cancel();btn.classList.add('capturing');btn.textContent='按下组合键…';
    capture={say,cancel:()=>{capture=null;renderSettings(box)},done:async combo=>{capture=null;const page=btn.dataset.tab,name=names[tabs.findIndex(b=>b.dataset.page===page)];
     if(label(combo)===await bossCombo())return renderSettings(box,`${label(combo)} 已用作老板键，请换一个。`);
     const other=Object.keys(keys).find(p=>p!==page&&keys[p]===combo);if(other)keys[other]=keys[page];keys[page]=combo;save();applyTitles();
     renderSettings(box,other?`已与「${names[tabs.findIndex(b=>b.dataset.page===other)]}」交换。`:`「${name}」改为 ${label(combo)}。`)}}};
   btn.onblur=()=>{if(capture)capture.cancel()}});
 }
 const addSettings=()=>{const ws=document.querySelector('#workspace');if(!ws||ws.querySelector('#tabKeySettings')||!settingsTab?.classList.contains('selected'))return;
  const box=document.createElement('section');box.className='section';box.id='tabKeySettings';renderSettings(box);
  const after=ws.querySelector('#bossKeySettings')||ws.querySelector('#panelBackground')?.closest('section');if(after)after.after(box);else ws.prepend(box)};
 new MutationObserver(addSettings).observe(document.querySelector('#workspace'),{childList:true});
})();
