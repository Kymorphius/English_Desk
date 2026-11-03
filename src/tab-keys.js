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
})();
