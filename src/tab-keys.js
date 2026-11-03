'use strict';
// Quick tab switching: ⌘1–⌘5 (Ctrl+1–5 on Windows), plus ⌘, for settings, the standard settings shortcut.
// Holding ⌘ for a moment shows each tab's number.
(()=>{
 const mac=window.desktop?window.desktop.platform==='darwin':/Mac/.test(navigator.platform),mod=mac?'⌘':'Ctrl+';
 const tabs=[...document.querySelectorAll('nav [data-page]')];
 tabs.forEach((b,i)=>{b.dataset.key=String(i+1);const name=b.firstChild.textContent.trim();b.title=b.dataset.page==='settings'?`${name}（${mod}${i+1} 或 ${mod},）`:`${name}（${mod}${i+1}）`});
 let hintTimer;const hideHints=()=>{clearTimeout(hintTimer);document.body.classList.remove('show-tab-keys')};
 document.addEventListener('keydown',e=>{
  if(e.key===(mac?'Meta':'Control')){if(!e.repeat){clearTimeout(hintTimer);hintTimer=setTimeout(()=>document.body.classList.add('show-tab-keys'),500)}return}
  hideHints();
  if(!(mac?e.metaKey:e.ctrlKey)||e.altKey||e.shiftKey||(mac?e.ctrlKey:e.metaKey))return;
  const target=/^Digit[1-9]$/.test(e.code)?tabs[Number(e.code.slice(5))-1]:e.code==='Comma'?tabs.find(b=>b.dataset.page==='settings'):null;
  if(!target)return;
  e.preventDefault();if(!target.classList.contains('selected'))target.click();
 });
 document.addEventListener('keyup',hideHints);window.addEventListener('blur',hideHints);
 // The shortcuts are listed in the settings, after the boss key or the panel appearance, whenever that page is drawn.
 const names=tabs.map(b=>b.firstChild.textContent.trim());
 const addSettings=()=>{const ws=document.querySelector('#workspace');if(!ws||ws.querySelector('#tabKeySettings')||!tabs.find(b=>b.dataset.page==='settings')?.classList.contains('selected'))return;
  const box=document.createElement('section');box.className='section';box.id='tabKeySettings';
  box.innerHTML=`<h2>标签切换</h2><div class="tab-key-list">${tabs.map((b,i)=>`<span><kbd>${mod}${i+1}</kbd>${names[i]}</span>`).join('')}<span><kbd>${mod},</kbd>设置</span></div><p class="muted">面板打开时有效。按住 ${mac?'⌘':'Ctrl'} 片刻，标签上会显示编号。</p>`;
  const after=ws.querySelector('#bossKeySettings')||ws.querySelector('#panelBackground')?.closest('section');if(after)after.after(box);else ws.prepend(box)};
 new MutationObserver(addSettings).observe(document.querySelector('#workspace'),{childList:true});
})();
