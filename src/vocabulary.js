function vocabulary(){
 state.vocab??={custom:[],progress:{},limit:20};const v=state.vocab;v.algorithm=Vocab.ALGORITHMS.includes(v.algorithm)?v.algorithm:'classic';v.retention=[0.85,0.9,0.95].includes(v.retention)?v.retention:0.9;v.keys=Vocab.keyBindings(v.keys);
 const words=[...new Map([...VOCABULARY,...v.custom].map(w=>[Vocab.key(w.word),w])).values()];
 const syncSettingsButton=()=>{const b=$('#vocabSettingsToggle');if(!b)return;b.title=`学习设置 · ${names[v.algorithm]}${v.algorithm==='fsrs'?' '+Math.round(v.retention*100)+'%':''} · 每天 ${v.limit} 个新词`;b.setAttribute('aria-expanded',String(!!v.settingsOpen));b.classList.toggle('active',!!v.settingsOpen)};
 const renderOverall=()=>{const o=Vocab.overall(words,v.progress);header('背单词',`已学 ${o.learned} / ${o.total} · 已掌握 ${o.mastered}<span class="vocab-overall" aria-hidden="true"><span class="seg-mastered"></span><span class="seg-learning"></span></span>`,'<button id="vocabSettingsToggle" class="quiet audio-icon vocab-settings-toggle" aria-controls="vocabSettings" aria-label="学习设置"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M3 6h10M17 6h4M3 12h2M9 12h12M3 18h12M19 18h2"/><circle cx="15" cy="6" r="2"/><circle cx="7" cy="12" r="2"/><circle cx="17" cy="18" r="2"/></svg></button>');
  $('#vocabSettingsToggle').onclick=()=>{v.settingsOpen=!v.settingsOpen;save();$('#vocabSettings').hidden=!v.settingsOpen;syncSettingsButton()};syncSettingsButton();
  for(const [cls,n] of [['.seg-mastered',o.mastered],['.seg-learning',o.learning]]){const seg=$(cls);seg.style.width=(o.total?n/o.total*100:0)+'%';if(n)seg.style.minWidth='2px'}
  $('#top small').title=`已掌握：下次复习间隔 ${Vocab.MASTERED_DAYS} 天以上；学习中：已学但未掌握`};
 const names={classic:'固定倍数',fsrs:'FSRS',sm2:'SM-2'};
 $('#workspace').innerHTML=`<section id="vocabSettings" class="section vocab-settings" aria-label="学习设置" ${v.settingsOpen?'':'hidden'}><h3>学习设置</h3><label>每天新词数量<input id="wordLimit" type="number" min="1" max="500" value="${v.limit}"></label><small>到期复习不占新词数量。再次打开会继续本机进度。</small><div class="field-row"><label>复习算法<select id="wordAlgorithm" aria-label="复习算法">${[['classic','固定倍数 · 默认'],['fsrs','FSRS · 开源记忆模型'],['sm2','SM-2 · SuperMemo 经典']].map(([id,name])=>`<option value="${id}" ${id===v.algorithm?'selected':''}>${name}</option>`).join('')}</select></label><label id="wordRetentionLabel" ${v.algorithm==='fsrs'?'':'hidden'}>目标记住率<select id="wordRetention" aria-label="目标记住率">${[0.85,0.9,0.95].map(r=>`<option value="${r}" ${r===v.retention?'selected':''}>${Math.round(r*100)}%${r===0.9?' · 推荐':''}</option>`).join('')}</select></label></div><p id="wordAlgorithmNote" class="muted"></p><div id="keyBindings" class="key-bindings"></div></section><section id="wordCard" class="section vocab-card"></section><div class="word-import-entry"><button id="openWordImport" class="quiet">导入单词库</button></div>`;

 const notes={fsrs:'按记忆模型估算每个词的遗忘速度，在记住概率降到目标值时安排复习。记住率越高，复习越频繁。',sm2:'SuperMemo 经典算法：每个词有自己的容易度，困难会降低、简单会提高；忘记后从 1 天重新开始。',classic:'默认算法：困难 ×1.2、记得 ×2.5、简单 ×3.5，所有单词使用相同倍数。'};
 const syncAlgorithm=()=>{syncSettingsButton();$('#wordRetentionLabel').hidden=v.algorithm!=='fsrs';$('#wordAlgorithmNote').textContent=notes[v.algorithm]+' 切换算法会保留现有进度。'};syncAlgorithm();
 $('#wordAlgorithm').onchange=e=>{v.algorithm=e.target.value;save();syncAlgorithm();showWord()};
 $('#wordRetention').onchange=e=>{v.retention=Number(e.target.value);save();syncAlgorithm();showWord()};
 $('#wordLimit').onchange=e=>{const n=Number(e.target.value);if(!Number.isInteger(n)||n<1||n>500){e.target.value=v.limit;return toast('每天新词数量为 1–500')}v.limit=n;save();syncAlgorithm();showWord()};
 $('#openWordImport').onclick=()=>{changePage('settings');$('#wordImportSettings').scrollIntoView({block:'start'});$('#wordImportText').focus({preventScroll:true})};
 const actionNames={flip:'显示答案',again:'重来',hard:'困难',good:'记得',easy:'简单',mastered:'精通',speak:'朗读'};
 function renderKeys(status='点按键位后按下新的键即可更换，点别处取消；与其他动作冲突时自动交换。'){
  const preset=Vocab.keyPreset(v.keys),box=$('#keyBindings'),keyField=a=>`<label class="key-field"><span>${actionNames[a]}</span><button type="button" class="key-bind" data-bind="${a}" aria-label="${actionNames[a]}的快捷键：${Vocab.keyLabel(v.keys[a])}，点击更换">${Vocab.keyLabel(v.keys[a])}</button></label>`;
  box.innerHTML=`<label>快捷键布局<select id="keyPreset" aria-label="快捷键布局"><option value="digits" ${preset==='digits'?'selected':''}>数字 1–5 · 默认</option><option value="home" ${preset==='home'?'selected':''}>主键位 A S D F J</option><option value="custom" disabled ${preset==='custom'?'selected':''}>自定义</option></select></label><div class="key-row">${['flip','speak'].map(keyField).join('')}</div><div class="key-grades">${['again','hard','good','easy','mastered'].map(keyField).join('')}</div><div class="tools"><button id="resetKeys" class="quiet" ${preset==='digits'?'disabled':''}>恢复默认</button></div><p id="keyBindStatus" class="muted" role="status">${status}</p>`;
  $('#keyPreset').onchange=e=>{if(!Vocab.KEY_PRESETS[e.target.value])return;v.keys={...Vocab.KEY_PRESETS[e.target.value]};save();renderKeys();showWord()};
  $('#resetKeys').onclick=()=>{v.keys={...Vocab.KEY_PRESETS.digits};save();renderKeys('已恢复默认快捷键。');showWord()};
  box.querySelectorAll('[data-bind]').forEach(b=>{b.onclick=()=>{if(keyCapture?.button===b)return endKeyCapture();endKeyCapture();keyCapture={button:b,action:b.dataset.bind,done:(code,swapped)=>{v.keys=Vocab.bindKey(v.keys,b.dataset.bind,code).bindings;save();renderKeys(swapped?`已与「${actionNames[swapped]}」交换按键。`:`「${actionNames[b.dataset.bind]}」改为「${Vocab.keyLabel(code)}」。`);showWord()}};b.classList.add('capturing');b.textContent='按下新按键…'};b.onblur=()=>{if(keyCapture?.button===b)endKeyCapture()}});
 }renderKeys();
 function showWord(){
  const options={algorithm:v.algorithm,retention:v.retention},q=Vocab.queue(words,v.progress,v.limit),w=q[0];const box=$('#wordCard');
  const t=Vocab.today(words,v.progress,v.limit),bar=label=>t.total?`<div class="vocab-progress"><div class="vocab-progress-row"><span>${label}</span><span>今日 ${t.done} / ${t.total}</span></div><progress value="${t.done}" max="${t.total}" aria-label="今日进度 ${t.done} / ${t.total}"></progress></div>`:'';
  renderOverall();clearTimeout(wordTimer);
  if(!w){
   const now=Date.now(),waiting=Object.values(v.progress).filter(p=>p.interval<1&&p.due>now);let message;
   if(waiting.length){const next=Math.min(...waiting.map(p=>p.due));message=`下一个单词约 ${Math.max(1,Math.ceil((next-now)/1000))} 秒后自动出现。`;wordTimer=setTimeout(()=>{if(page==='vocabulary'&&box.isConnected)showWord()},next-now+300)}
   else{const m=Vocab.tomorrow(words,v.progress,v.limit),parts=[m.reviews&&`${m.reviews} 个复习`,m.fresh&&`${m.fresh} 个新词`].filter(Boolean);message=parts.length?`明天有 ${parts.join('和 ')}。`:'明天没有安排复习。'}
   box.innerHTML=bar(t.remaining?`还有 ${t.remaining} 个稍后重来`:'今日已完成')+`<p class="vocab-empty">${message}</p>`;return}
  const prior=v.progress[Vocab.key(w.word)],grades=[['again','重来'],['hard','困难'],['good','记得'],['easy','简单'],['mastered','精通']];
  box.innerHTML=`${bar(prior?'复习':'新词')}<div class="vocab-face"><div class="vocab-head"><h2 class="vocab-word">${esc(w.word)}</h2><button id="speakWord" class="quiet vocab-speak"></button></div><p class="vocab-phonetic">${esc((state.speechAccent==='en-US'?w.us:w.uk)||'')}</p></div><button id="flipWord" class="primary vocab-flip">显示答案 <kbd>${Vocab.keyLabel(v.keys.flip)}</kbd></button><div id="wordBack" hidden><p class="vocab-meaning">${esc(w.meaning)}</p>${w.example?`<p class="vocab-example">${esc(w.example)}</p>`:''}${w.translation?`<p class="muted">${esc(w.translation)}</p>`:''}<div class="vocab-grades">${grades.map(([r,t],i)=>`<div class="grade"><small>${r==='mastered'?'1 个月':intervalText(Vocab.grade(prior,r,Date.now(),options).interval)}</small><button data-grade="${r}" class="grade-${r}" title="${t}（按 ${Vocab.keyLabel(v.keys[r])}）"><span class="grade-key">${Vocab.keyLabel(v.keys[r])}</span>${t}</button></div>`).join('')}</div></div>`;
  setAudioIcon($('#speakWord'),'speaker',`朗读单词（${Vocab.keyLabel(v.keys.speak)}）`);$('#speakWord').onclick=()=>speak(w.word);$('#flipWord').onclick=()=>{$('#wordBack').hidden=false;$('#flipWord').hidden=true};
  box.querySelectorAll('[data-grade]').forEach(b=>b.onclick=()=>{v.progress[Vocab.key(w.word)]=Vocab.grade(v.progress[Vocab.key(w.word)],b.dataset.grade,Date.now(),options);save();showWord()});
 }showWord();
}
let wordTimer;
// Keyboard review uses the bindings in state.vocab.keys (default: Space/Return flip, 1–5 grade, R speaks).
// Chromium treats any focused element as keyboard-focused once a key is pressed, so track how focus arrived.
let tabFocus=false,keyCapture=null;document.addEventListener('pointerdown',()=>{tabFocus=false},true);
function endKeyCapture(){const c=keyCapture;keyCapture=null;if(c?.button.isConnected){c.button.classList.remove('capturing');c.button.textContent=Vocab.keyLabel(state.vocab.keys[c.action])}}
// While rebinding, the next key press is captured here before anything else sees it.
document.addEventListener('keydown',e=>{
 if(!keyCapture)return;
 if(e.key==='Tab'){endKeyCapture();return}
 e.preventDefault();e.stopImmediatePropagation();
 if(/^(Shift|Control|Alt|Meta|CapsLock|Fn)/.test(e.code))return;
 const status=$('#keyBindStatus');
 if(e.metaKey||e.ctrlKey||e.altKey){if(status)status.textContent='不支持组合键，请按单个按键。';return}
 if(!Vocab.bindable(e.code)){if(status)status.textContent='这个按键不能用作快捷键，请换一个字母、数字、符号、空格或回车。';return}
 const c=keyCapture,code=Vocab.normalizeCode(e.code),swapped=Vocab.bindKey(state.vocab.keys,c.action,code).swapped;keyCapture=null;c.done(code,swapped);
},true);
document.addEventListener('keydown',e=>{
 if(e.key==='Tab'){tabFocus=true;return}
 if(page!=='vocabulary'||e.metaKey||e.ctrlKey||e.altKey||e.repeat||document.querySelector('.select-menu'))return;
 const t=e.target;if(t.closest?.('input,textarea,select,[contenteditable="true"]'))return;
 const back=$('#wordBack'),action=Vocab.keyAction(state.vocab?.keys||Vocab.KEY_PRESETS.digits,e.code);if(!back||!action)return;
 if(/^(Space|Enter|NumpadEnter)$/.test(e.code)&&t.tagName==='BUTTON'&&t.id!=='flipWord'&&tabFocus)return; // a button reached with Tab keeps its standard activation
 if(t.tagName==='BUTTON')t.blur(); // otherwise the button also fires on keyup
 if(action==='flip'){if(back.hidden){e.preventDefault();$('#flipWord').click()}}
 else if(action==='speak'){e.preventDefault();$('#speakWord')?.click()}
 else if(!back.hidden){e.preventDefault();back.querySelector(`[data-grade="${action}"]`)?.click()}
});
function intervalText(days){return days<1?'1 分钟':days<30?Math.round(days)+' 天':days<365?Math.round(days/30)+' 个月':(Math.round(days/36.5)/10)+' 年'}
async function reminderSettings(){
 const section=document.createElement('section');section.className='section';section.innerHTML='<h2>背词提醒</h2><label><input type="checkbox" id="wordReminderEnabled"> 开启每日提醒</label><label>提醒时间<input id="wordReminderTime" type="time" value="20:00"></label><button id="saveWordReminder">保存提醒</button><p class="muted">默认关闭。开启后需允许系统通知，并让应用保持运行；关闭面板仍可提醒，退出应用后不提醒。</p><p id="wordReminderStatus" role="status"></p>';$('#workspace').append(section);
 const license=document.createElement('details');license.className='section';license.innerHTML='<summary>开源许可</summary><p>Word Atlas contributors — CC BY 4.0。词条已精简字段。来源：github.com/designfuchen/word-atlas；授权：creativecommons.org/licenses/by/4.0/。</p>';$('#workspace').append(license);
 if(!window.desktop){$('#saveWordReminder').disabled=true;return}
 try{const pref=await desktop.getWordReminder();if(!section.isConnected)return;$('#wordReminderEnabled').checked=pref.enabled;$('#wordReminderTime').value=pref.time}catch(e){$('#wordReminderStatus').textContent=e.message}
 $('#saveWordReminder').onclick=async()=>{try{await desktop.setWordReminder({enabled:$('#wordReminderEnabled').checked,time:$('#wordReminderTime').value});$('#wordReminderStatus').textContent=$('#wordReminderEnabled').checked?'提醒已开启，请在系统设置中允许 English Desk Studio 通知。':'提醒已关闭'}catch(e){$('#wordReminderStatus').textContent=e.message}};
}

function wordImportSettings(){
 state.vocab??={custom:[],progress:{},limit:20};const v=state.vocab;
 const section=document.createElement('div');section.innerHTML=`<section class="section" id="wordImportSettings"><h2>导入单词库</h2><p>支持 JSON、CSV 和制表符分隔的 TXT/TSV。每行依次为单词、释义、例句（选填）。同名单词更新释义并保留复习进度。</p><pre>word,meaning,example\nabandon,放弃,Do not abandon your plan.</pre><textarea id="wordImportText" aria-label="单词导入内容" placeholder='[{"word":"abandon","meaning":"放弃","example":"Do not abandon your plan."}]'></textarea><div class="tools"><button id="wordImportFile">选择文件</button><button id="wordImport">导入单词</button></div><p id="wordImportStatus" role="status"></p><button id="backToWords" class="quiet">返回背单词</button></section>`;$('#workspace').append(section);
 $('#wordImportFile').onclick=async()=>{try{if(!window.desktop)return toast('请粘贴文件内容导入');const f=await desktop.openTextFile('vocabulary');if(f)$('#wordImportText').value=f.text}catch(e){toast(e.message)}};
 $('#wordImport').onclick=()=>{try{const items=Vocab.parse($('#wordImportText').value);const map=new Map(v.custom.map(w=>[Vocab.key(w.word),w]));items.forEach(w=>map.set(Vocab.key(w.word),w));v.custom=[...map.values()];save();$('#wordImportStatus').textContent=`已导入 ${items.length} 个单词（文件内重复词已合并）`;}catch(e){$('#wordImportStatus').textContent=e.message}};

 $('#backToWords').onclick=()=>changePage('vocabulary');
}
