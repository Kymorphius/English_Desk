'use strict';
// Boss key: a global shortcut, registered by the main process, that hides the panel at once and stops speech, or brings it back.
// The settings live here; the panel placement next to it needs native support and is hidden without it.
const bossIsMac=window.desktop?.platform==='darwin';
let bossCapture=null;
function bossLabel(acc){const parts=acc.split('+'),key=parts.pop(),sym={Control:bossIsMac?'⌃':'Ctrl+',Alt:bossIsMac?'⌥':'Alt+',Shift:bossIsMac?'⇧':'Shift+',Command:bossIsMac?'⌘':'Win+'};return ['Control','Alt','Shift','Command'].filter(m=>parts.includes(m)).map(m=>sym[m]).join('')+(key==='Space'?'空格':key)}
function bossAccelerator(e){const map={Backquote:'`',Minus:'-',Equal:'=',BracketLeft:'[',BracketRight:']',Backslash:'\\',Semicolon:';',Quote:"'",Comma:',',Period:'.',Slash:'/',Space:'Space'};const key=/^Key[A-Z]$/.test(e.code)?e.code.slice(3):/^Digit\d$/.test(e.code)?e.code.slice(5):/^F\d{1,2}$/.test(e.code)?e.code:map[e.code];if(!key)return null;const mods=[e.ctrlKey&&'Control',e.altKey&&'Alt',e.shiftKey&&'Shift',e.metaKey&&'Command'].filter(Boolean);return mods.some(m=>m!=='Shift')?[...mods,key].join('+'):null}
// While a new combination is being recorded, the next key press is captured here before anything else sees it.
document.addEventListener('keydown',e=>{if(!bossCapture)return;e.preventDefault();e.stopImmediatePropagation();if(e.key==='Escape'||e.key==='Tab')return bossCapture.cancel();if(/^(Shift|Control|Alt|Meta|CapsLock|Fn)/.test(e.code))return;const acc=bossAccelerator(e);if(!acc){bossCapture.say('老板键需要同时按住 ⌘、⌃ 或 ⌥ 中的至少一个，再按一个字母、数字或符号键。');return}
 if(acc.split('+').slice(0,-1).filter(m=>m!=='Shift').join()===(bossIsMac?'Command':'Control')){bossCapture.say(`${bossIsMac?'⌘':'Ctrl'} 加单个键是常用的系统或应用快捷键（如复制、粘贴、切换标签），老板键请再加上 ${bossIsMac?'⌥ 或 ⌃':'Alt'}。`);return}
 bossCapture.done(acc)},true);
window.bossKey?.onTrigger(()=>{try{stopSpeech()}catch{}});
function bossKeySettings(){
 if(!window.bossKey)return;
 const box=document.createElement('section');box.className='section';box.id='bossKeySettings';
 box.innerHTML=`<h2>老板键</h2><div class="boss-row"><span>快捷键</span><button type="button" id="bossBind" class="boss-bind" aria-label="老板键，点击更换"></button><button type="button" id="bossOff" class="quiet">关闭</button></div><p class="muted">在任何应用里按下都会立即收起面板并停止朗读，再按一次打开；面板置顶时同样有效。点击快捷键后按下新的组合即可更换，需包含 ⌥ 或 ⌃（只用 ⌘ 的组合会与常用快捷键冲突）。</p>${bossIsMac&&window.panelPlacement?'<label>面板呼出位置<select id="panelPlacement" aria-label="面板呼出位置"><option value="icon">跟随菜单栏图标</option><option value="left">屏幕左侧</option></select></label>':''}<p id="bossStatus" class="muted" role="status"></p>`;
 const appearance=document.querySelector('#panelBackground')?.closest('section');if(appearance)appearance.after(box);else document.querySelector('#workspace').prepend(box);
 const say=text=>{box.querySelector('#bossStatus').textContent=text};
 const sync=async status=>{if(!box.isConnected)return;try{const r=await window.bossKey.get();const b=box.querySelector('#bossBind');b.textContent=r.key?bossLabel(r.key):'未设置';box.querySelector('#bossOff').hidden=!r.key;if(status)say(status);else if(r.key&&!r.active)say('老板键当前未生效，可能被其他应用占用，请换一个组合。')}catch{}};
 const bind=box.querySelector('#bossBind');
 bind.onclick=()=>{if(bossCapture)return bossCapture.cancel();window.bossKey.pause(true);bind.classList.add('capturing');bind.textContent='按下组合键…';
  bossCapture={say,done:async acc=>{bossCapture=null;bind.classList.remove('capturing');try{await window.bossKey.set(acc);sync(`老板键改为 ${bossLabel(acc)}。`)}catch(e){await window.bossKey.pause(false);sync(ipcMessage(e))}},cancel:()=>{bossCapture=null;bind.classList.remove('capturing');window.bossKey.pause(false);sync()}}};
 bind.onblur=()=>bossCapture?.cancel();
 box.querySelector('#bossOff').onclick=async()=>{await window.bossKey.set('');sync('老板键已关闭。')};
 const placement=box.querySelector('#panelPlacement');
 if(placement){window.panelPlacement.get().then(v=>{placement.value=v});placement.onchange=async()=>{const v=await window.panelPlacement.set(placement.value);say(v==='left'?'面板将在屏幕左侧呼出。':'面板将在菜单栏图标下方呼出。')}}
 sync();
}
