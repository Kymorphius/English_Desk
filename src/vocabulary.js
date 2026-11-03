function vocabulary(){
 state.vocab??={custom:[],progress:{},limit:20};const v=state.vocab;v.algorithm=Vocab.ALGORITHMS.includes(v.algorithm)?v.algorithm:'classic';v.retention=[0.85,0.9,0.95].includes(v.retention)?v.retention:0.9;if(!v.keysV2){if(v.keys&&Vocab.keyPreset(Vocab.keyBindings(v.keys))==='digits')v.keys={...Vocab.KEY_PRESETS.home};v.keysV2=true} // the default moved from digits to the home row
 v.keys=Vocab.keyBindings(v.keys);
 lastOverall=null;lastToday=null;lastRing=null;linkReturn=null;
 v.ignored??={};const allWords=[...new Map([...VOCABULARY,...v.custom].map(w=>[Vocab.key(w.word),w])).values()];
 // Ignored words leave the list entirely: no reviews, and they don't count towards totals or levels.
 let words;const refreshWords=()=>{words=allWords.filter(w=>!v.ignored[Vocab.key(w.word)])};refreshWords();
 const syncSettingsButton=()=>{const b=$('#vocabSettingsToggle');if(!b)return;b.title=`学习设置 · ${names[v.algorithm]}${v.algorithm==='fsrs'?' '+Math.round(v.retention*100)+'%':''} · 每天 ${v.limit} 个新词`;b.setAttribute('aria-expanded',String(!!v.settingsOpen));b.classList.toggle('active',!!v.settingsOpen)};
 // The level block stays in place between words, so its bar can grow with a plain CSS transition.
 const renderOverall=()=>{const o=Vocab.overall(words,v.progress),l=Vocab.level(o.mastered,o.total,v.peakLevel||1),scale=l.next?l.next.min:Math.max(o.total,1),prev=lastOverall;
  const ignored=Object.keys(v.ignored).length,imported=v.custom.length;$('#vocabTotal').textContent=`词库 ${o.total}`;$('#vocabTotal').title=[`内置 ${VOCABULARY.length}`,imported&&`导入 ${imported}`,ignored&&`已忽略 ${ignored}`].filter(Boolean).join(' · ');
  $('#ovLevel').textContent=`Lv.${l.n} ${l.name}`;$('#ovMastered').textContent=o.mastered;$('#ovGoal').textContent=l.next?`距 Lv.${l.next.n} 还差 ${Math.max(0,l.next.min-o.mastered)}`:'已通关';
  const bar=$('.vocab-overall'),pct=n=>Math.min(n,scale)/scale*100+'%';if(!prev)bar.classList.add('instant');
  for(const [cls,n] of [['.seg-mastered',o.mastered],['.seg-learning',Math.min(o.learning,Math.max(0,scale-o.mastered))]]){const seg=$(cls);seg.style.minWidth=n?'2px':'0';seg.style.width=pct(n)}
  if(!prev){bar.offsetWidth;bar.classList.remove('instant')}
  else{if(o.mastered!==prev.mastered)bump('#ovMastered');if(l.n>prev.level&&!v.plain){bump('#ovLevel');toast(l.next?`升到 Lv.${l.n} ${l.name}：已掌握 ${o.mastered} 个词`:`词库通关：已掌握全部 ${o.total} 个词`)}}
  if(l.n>(v.peakLevel||1)){v.peakLevel=l.n;save()}
  lastOverall={...o,level:l.n};
  const known=Object.values(v.progress).filter(p=>p.known).length;
  $('#levelList').innerHTML=Vocab.levelTable(o.total).map(([min,name],i)=>`<li class="${i+1<l.n?'reached':i+1===l.n?'current':''}"><span>Lv.${i+1} ${name}</span><span>${min} 词</span></li>`).join('');
  $('#levelStats').textContent=`已学 ${o.learned} / ${o.total}${known?`，其中熟词 ${known}`:''}；已掌握 ${o.mastered}，学习中 ${o.learning}。`};
 header('背单词<span id="vocabTotal" class="title-count"></span>','','<button id="vocabPlain" class="quiet audio-icon vocab-plain-toggle" aria-label="素色模式"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/></svg></button><button id="vocabUndo" class="quiet audio-icon vocab-undo"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg><kbd aria-hidden="true"></kbd></button><button id="vocabSettingsToggle" class="quiet audio-icon vocab-settings-toggle" aria-controls="vocabSettings" aria-label="学习设置"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M3 6h10M17 6h4M3 12h2M9 12h12M3 18h12M19 18h2"/><circle cx="15" cy="6" r="2"/><circle cx="7" cy="12" r="2"/><circle cx="17" cy="18" r="2"/></svg></button>');
 $('#vocabSettingsToggle').onclick=()=>{v.settingsOpen=!v.settingsOpen;save();$('#vocabSettings').hidden=!v.settingsOpen;syncSettingsButton()};$('#vocabUndo').onclick=()=>undoGrade?.();
 // 素色模式: no colours, slimmer progress and quiet feedback, for studying unobtrusively.
 const syncPlain=()=>{document.body.classList.toggle('vocab-plain',!!v.plain);const b=$('#vocabPlain');b.setAttribute('aria-pressed',String(!!v.plain));b.title=v.plain?'素色模式已开启：点击恢复颜色和完整进度':'素色模式：去掉颜色、精简进度，适合安静地背';b.classList.toggle('active',!!v.plain)};syncPlain();
 $('#vocabPlain').onclick=()=>{v.plain=!v.plain;save();syncPlain()};
 const names={classic:'固定倍数',fsrs:'FSRS',sm2:'SM-2'};
 $('#workspace').innerHTML=`<div class="vocab-level-block"><div class="vocab-level-row"><button id="levelToggle" class="vocab-level-button" aria-expanded="${!!v.levelsOpen}" aria-controls="levelInfo" title="查看等级划分"><span id="ovLevel" class="count vocab-level"></span><span class="chevron" aria-hidden="true">›</span></button><span class="muted">· 已掌握 <span id="ovMastered" class="count"></span></span><span id="ovGoal" class="vocab-goal"></span></div><div class="vocab-overall" aria-hidden="true"><span class="seg-mastered"></span><span class="seg-learning"></span></div></div><section id="levelInfo" class="section level-info" aria-label="等级划分" ${v.levelsOpen?'':'hidden'}><h3>等级划分</h3><ol id="levelList" class="level-list"></ol><p class="muted">按已掌握的词数升级：下次复习间隔 ${Vocab.MASTERED_DAYS} 天以上算已掌握，熟词也计入。达到的等级不会因遗忘而降低。进度条深色为已掌握，浅色为学习中。</p><p id="levelStats" class="muted"></p></section><section id="vocabSettings" class="section vocab-settings" aria-label="学习设置" ${v.settingsOpen?'':'hidden'}><h3>学习设置</h3><label>每天新词数量<input id="wordLimit" type="number" min="1" max="500" value="${v.limit}"></label><small>到期复习不占新词数量；新词直接选「精通」视为熟词，也不占数量。再次打开会继续本机进度。</small><div class="field-row"><label>复习算法<select id="wordAlgorithm" aria-label="复习算法">${[['classic','固定倍数 · 默认'],['fsrs','FSRS · Anki 同款'],['sm2','SM-2 · SuperMemo 经典']].map(([id,name])=>`<option value="${id}" ${id===v.algorithm?'selected':''}>${name}</option>`).join('')}</select></label><label id="wordRetentionLabel" ${v.algorithm==='fsrs'?'':'hidden'}>目标记住率<select id="wordRetention" aria-label="目标记住率">${[0.85,0.9,0.95].map(r=>`<option value="${r}" ${r===v.retention?'selected':''}>${Math.round(r*100)}%${r===0.9?' · 推荐':''}</option>`).join('')}</select></label></div><label>翻面效果<select id="flipMotion" aria-label="翻面效果"><option value="instant" ${v.flipMotion!=='spring'?'selected':''}>直接 · 默认</option><option value="spring" ${v.flipMotion==='spring'?'selected':''}>弹起</option></select></label><p id="wordAlgorithmNote" class="muted"></p><div id="keyBindings" class="key-bindings"></div><div id="ignoredWords" class="ignored-words"></div></section><section id="wordCard" class="section vocab-card"></section><p id="vocabAnnounce" class="visually-hidden" role="status"></p><div class="word-import-entry"><button id="openWordImport" class="quiet">导入单词库</button></div>`;
 $('#levelToggle').onclick=()=>{v.levelsOpen=!v.levelsOpen;save();$('#levelInfo').hidden=!v.levelsOpen;$('#levelToggle').setAttribute('aria-expanded',String(v.levelsOpen))};syncUndoButton();

 const notes={fsrs:'按记忆模型估算每个词的遗忘速度，在记住概率降到目标值时安排复习。记住率越高，复习越频繁。',sm2:'SuperMemo 经典算法：每个词有自己的容易度，困难会降低、简单会提高；忘记后从 1 天重新开始。',classic:'默认算法：困难 ×1.2、记得 ×2.5、简单 ×3.5，所有单词使用相同倍数。'};
 const syncAlgorithm=()=>{syncSettingsButton();$('#wordRetentionLabel').hidden=v.algorithm!=='fsrs';$('#wordAlgorithmNote').textContent=notes[v.algorithm]+' 切换算法会保留现有进度。'};syncAlgorithm();
 $('#wordAlgorithm').onchange=e=>{v.algorithm=e.target.value;save();syncAlgorithm();showWord()};
 $('#flipMotion').onchange=e=>{v.flipMotion=e.target.value;save()};
 $('#wordRetention').onchange=e=>{v.retention=Number(e.target.value);save();syncAlgorithm();showWord()};
 $('#wordLimit').onchange=e=>{const n=Number(e.target.value);if(!Number.isInteger(n)||n<1||n>500){e.target.value=v.limit;return toast('每天新词数量为 1–500')}v.limit=n;save();syncAlgorithm();showWord()};
 $('#openWordImport').onclick=()=>{changePage('settings');$('#wordImportSettings').scrollIntoView({block:'start'});$('#wordImportText').focus({preventScroll:true})};
 const actionNames={flip:'显示答案',again:'重来',hard:'困难',good:'记得',easy:'简单',mastered:'精通',speak:'朗读',undo:'撤销',ignore:'忽略',link:'关联拼写'};
 function renderKeys(status='点按键位后按下新的键即可更换，点别处取消；与其他动作冲突时自动交换。'){
  const preset=Vocab.keyPreset(v.keys),box=$('#keyBindings'),keyField=a=>`<label class="key-field"><span>${actionNames[a]}</span><button type="button" class="key-bind" data-bind="${a}" aria-label="${actionNames[a]}的快捷键：${Vocab.keyLabel(v.keys[a])}，点击更换">${Vocab.keyLabel(v.keys[a])}</button></label>`;
  box.innerHTML=`<label>快捷键布局<select id="keyPreset" aria-label="快捷键布局"><option value="home" ${preset==='home'?'selected':''}>主键位 A S D F J · 默认</option><option value="digits" ${preset==='digits'?'selected':''}>数字 1–5</option><option value="custom" disabled ${preset==='custom'?'selected':''}>自定义</option></select></label><div class="key-row">${['flip','speak','undo','ignore','link'].map(keyField).join('')}</div><div class="key-grades">${['again','hard','good','easy','mastered'].map(keyField).join('')}</div><div class="tools"><button id="resetKeys" class="quiet" ${preset===Vocab.DEFAULT_PRESET?'disabled':''}>恢复默认</button></div><p id="keyBindStatus" class="muted" role="status">${status}</p>`;
  $('#keyPreset').onchange=e=>{if(!Vocab.KEY_PRESETS[e.target.value])return;v.keys={...Vocab.KEY_PRESETS[e.target.value]};save();renderKeys();showWord()};
  $('#resetKeys').onclick=()=>{v.keys={...Vocab.KEY_PRESETS[Vocab.DEFAULT_PRESET]};save();renderKeys('已恢复默认快捷键。');showWord()};
  box.querySelectorAll('[data-bind]').forEach(b=>{b.onclick=()=>{if(keyCapture?.button===b)return endKeyCapture();endKeyCapture();keyCapture={button:b,action:b.dataset.bind,done:(code,swapped)=>{v.keys=Vocab.bindKey(v.keys,b.dataset.bind,code).bindings;save();syncUndoButton();renderKeys(swapped?`已与「${actionNames[swapped]}」交换按键。`:`「${actionNames[b.dataset.bind]}」改为「${Vocab.keyLabel(code)}」。`);showWord()}};b.classList.add('capturing');b.textContent='按下新按键…'};b.onblur=()=>{if(keyCapture?.button===b)endKeyCapture()}});
 }renderKeys();
 // Undo restores the word's record and any level it unlocked; the undone word comes back with its answer showing.
 undoGrade=()=>{const h=undoStack.pop();if(!h)return;if(h.ignored){delete v.ignored[h.key];refreshWords();renderIgnored()}else if(h.before)v.progress[h.key]=h.before;else delete v.progress[h.key];v.peakLevel=h.peakBefore;lastOverall=null;save();showFirst={key:h.key,reason:'undo'};showWord();syncUndoButton();const message=`已撤销「${h.word}：${h.label}」`;toast(message);$('#vocabAnnounce').textContent=message};
 // How far the user has got with another card, shown next to a linked spelling.
 const wordStatus=k=>{const r=v.progress[k];return v.ignored[k]?'已忽略':!r?'未学':r.known?'熟词':r.interval>=Vocab.MASTERED_DAYS?'已掌握':'学习中'};
 function renderIgnored(){const box=$('#ignoredWords'),list=allWords.filter(w=>v.ignored[Vocab.key(w.word)]);
  box.innerHTML=list.length?`<h4>已忽略 ${list.length} 个词</h4><div class="ignored-list">${list.map(w=>`<span class="ignored-chip">${esc(w.word)}<button type="button" data-restore="${esc(Vocab.key(w.word))}" aria-label="恢复 ${esc(w.word)}">恢复</button></span>`).join('')}</div><button id="restoreIgnored" class="quiet">全部恢复</button>`:'<p class="muted">没有忽略的单词。在单词卡片上点「忽略」，这个词就不再出现。</p>';
  const restore=keys=>{for(const k of keys)delete v.ignored[k];refreshWords();save();lastOverall=null;renderIgnored();showWord()};
  box.querySelectorAll('[data-restore]').forEach(b=>b.onclick=()=>restore([b.dataset.restore]));if($('#restoreIgnored'))$('#restoreIgnored').onclick=()=>restore(Object.keys(v.ignored))}
 renderIgnored();
 function showWord(){
  const limit=v.limit+(v.extra?.day===Vocab.day()?v.extra.count:0),options={algorithm:v.algorithm,retention:v.retention},q=Vocab.queue(words,v.progress,limit),pick=showFirst&&words.find(x=>Vocab.key(x.word)===showFirst.key),reason=pick?showFirst.reason:null,undone=reason==='undo',w=pick||q[0];showFirst=null;const box=$('#wordCard');
  const t=Vocab.today(words,v.progress,limit),bar=status=>{if(!t.total&&!t.known)return '';const goal=Vocab.knownGoal(t.known),row=(id,label,n,max,side='')=>`<div class="hp-row hp-row-${id}"><div class="hp-head"><span>${label} <span id="today${id==='learned'?'Done':'Known'}" class="count">${n}</span> / ${max}</span>${side?`<span class="today-status">${side}</span>`:''}</div><div class="hp-bar hp-${id}" role="img" aria-label="${label} ${n} / ${max}"><span data-bar="${id}" data-w="${max?Math.min(n,max)/max*100:0}"></span></div></div>`;
   return `<div class="vocab-progress vocab-progress-row">${row('learned','学会',t.done,t.total,status)}${t.known?row('known','熟词',t.known,goal):''}</div>`};
  renderOverall();clearTimeout(wordTimer);const bumpToday=()=>{paintRing();if(lastToday){if(t.done!==lastToday.done)bump('#todayDone');if(t.known!==lastToday.known)bump('#todayKnown')}lastToday={done:t.done,known:t.known}};
  if(!w){
   const now=Date.now(),waiting=Object.values(v.progress).filter(p=>p.interval<1&&p.due>now);let message;
   if(waiting.length){const next=Math.min(...waiting.map(p=>p.due));message=`下一个单词约 ${Math.max(1,Math.ceil((next-now)/1000))} 秒后自动出现。`;wordTimer=setTimeout(()=>{if(page==='vocabulary'&&box.isConnected)showWord()},next-now+300)}
   else{const m=Vocab.tomorrow(words,v.progress,v.limit),parts=[m.reviews&&`${m.reviews} 个复习`,m.fresh&&`${m.fresh} 个新词`].filter(Boolean);message=(t.done||t.known?`今天学会 ${t.done} 个${t.known?`，标记熟词 ${t.known} 个`:''}。`:'')+(parts.length?`明天有 ${parts.join('和 ')}。`:'明天没有安排复习。')}
   const unlearned=words.filter(x=>!v.progress[Vocab.key(x.word)]).length,more=Math.min(10,unlearned);
   box.innerHTML=bar(t.remaining?`还有 ${t.remaining} 个稍后重来`:'已完成')+`<p class="vocab-empty">${message}</p>`+(more&&!waiting.length?`<div class="tools"><button id="moreWords" title="只增加今天的新词，不改每天新词数量">再学 ${more} 个新词</button></div>`:'');
   bumpToday();if($('#moreWords'))$('#moreWords').onclick=()=>{const d=Vocab.day();v.extra={day:d,count:(v.extra?.day===d?v.extra.count:0)+more};save();showWord()};return}
  const variant=Vocab.variantOf(w.word),canJump=!!variant?.same&&words.some(x=>Vocab.key(x.word)===variant.other)&&!(reason==='link'&&linkReturn?.from===variant.other),prior=v.progress[Vocab.key(w.word)],grades=[['again','重来'],['hard','困难'],['good','记得'],['easy','简单'],['mastered','精通']];
  box.innerHTML=`${bar('')}<div class="vocab-face"><div class="vocab-head"><h2 class="vocab-word">${esc(w.word)}</h2><button id="speakWord" class="quiet vocab-speak"></button><button id="ignoreWord" class="quiet audio-icon vocab-ignore" title="忽略这个词：不再出现，也不计入进度（按 ${Vocab.keyLabel(v.keys.ignore)}）" aria-label="忽略这个词"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7c2 0 3.7.6 5.1 1.5M22 12s-3.5 7-10 7c-2 0-3.7-.6-5.1-1.5"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="m3 3 18 18"/></svg><kbd aria-hidden="true">${Vocab.keyLabel(v.keys.ignore)}</kbd></button></div><p class="vocab-phonetic"><span>${esc((state.speechAccent==='en-US'?w.us:w.uk)||'')}</span><span class="vocab-tag${undone?' undone':''}">${undone?'已撤销 · 请重新评分':reason==='link'?`关联拼写 · 学完返回 ${esc(linkReturn?.fromWord||'')}`:prior?'复习':'新词'}</span></p>${variant?`<p class="vocab-variant" title="${variant.tip}"><span class="variant-kind">${variant.label}</span> · ${variant.label==='英式拼写'?'美式':'英式'}：${canJump?`<button id="linkWord" class="link-word" title="跳到「${esc(variant.other)}」学习，学完回到这里（按 ${Vocab.keyLabel(v.keys.link)}）">${esc(variant.other)} <kbd>${Vocab.keyLabel(v.keys.link)}</kbd></button>`:`<b>${esc(variant.other)}</b>`}${variant.note?`（${variant.note}）`:''}${variant.same&&allWords.some(x=>Vocab.key(x.word)===variant.other)?` · <span class="variant-status">${wordStatus(variant.other)}</span>`:''}</p>`:''}</div><button id="flipWord" class="primary vocab-flip">显示答案 <kbd>${Vocab.keyLabel(v.keys.flip)}</kbd></button><div id="wordBack" hidden><p class="vocab-meaning">${esc(w.meaning)}</p>${w.example?`<p class="vocab-example">${esc(w.example)}</p>`:''}${w.translation?`<p class="muted">${esc(w.translation)}</p>`:''}<div class="vocab-grades">${grades.map(([r,t],i)=>`<div class="grade"><small>${r==='mastered'?'1 个月':intervalText(Vocab.grade(prior,r,Date.now(),options).interval)}</small><button data-grade="${r}" class="grade-${r}" title="${r==='mastered'&&!prior?'认识这个词：不占今日新词数量，一个月后复习':t}（按 ${Vocab.keyLabel(v.keys[r])}）"><span class="grade-key">${Vocab.keyLabel(v.keys[r])}</span>${t}</button></div>`).join('')}</div></div>`;
  setAudioIcon($('#speakWord'),'speaker',`朗读单词（${Vocab.keyLabel(v.keys.speak)}）`);$('#speakWord').insertAdjacentHTML('beforeend',`<kbd aria-hidden="true">${Vocab.keyLabel(v.keys.speak)}</kbd>`);$('#speakWord').onclick=()=>speak(w.word);$('#flipWord').onclick=()=>{
   // The word sits centred on the front and jumps up when the answer appears; with 弹起 it slides up with an overshoot and the answer follows a beat later.
   const face=box.querySelector('.vocab-face'),word=face.querySelector('.vocab-word'),before=word.getBoundingClientRect().top;$('#wordBack').hidden=false;$('#flipWord').hidden=true;
   const dy=before-word.getBoundingClientRect().top;if(v.flipMotion!=='spring'||!dy||matchMedia('(prefers-reduced-motion: reduce)').matches)return; // 直接: an instant jump
   face.animate([{transform:`translateY(${dy}px)`},{transform:'none'}],{duration:260,easing:'cubic-bezier(.2,1.3,.4,1)'});
   $('#wordBack').animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:220,delay:70,easing:'ease-out',fill:'backwards'})};
  bumpToday();
  if(undone){$('#wordBack').hidden=false;$('#flipWord').hidden=true}
  // Jumping to the other spelling: study it, then come back to this word.
  if($('#linkWord'))$('#linkWord').onclick=()=>{linkReturn={from:Vocab.key(w.word),fromWord:w.word,to:variant.other};showFirst={key:variant.other,reason:'link'};showWord()};
  const returnFromLink=k=>{if(linkReturn?.to===k){showFirst={key:linkReturn.from,reason:'return'};linkReturn=null}};
  $('#ignoreWord').onclick=()=>{const k=Vocab.key(w.word);returnFromLink(k);v.ignored[k]=Date.now();refreshWords();save();undoStack.push({key:k,word:w.word,label:'忽略',ignored:true,before:prior,peakBefore:v.peakLevel||1});syncUndoButton();renderIgnored();showWord();const message=`已忽略「${w.word}」，按 ${Vocab.keyLabel(v.keys.undo)} 可撤销`;toast(message);$('#vocabAnnounce').textContent=message};
  box.querySelectorAll('[data-grade]').forEach(b=>b.onclick=()=>{const k=Vocab.key(w.word),label=grades.find(([g])=>g===b.dataset.grade)[1],peakBefore=v.peakLevel||1,r=Vocab.grade(prior,b.dataset.grade,Date.now(),options);v.progress[k]=r;save();returnFromLink(k);showWord();undoStack.push({key:k,word:w.word,label,before:prior,peakBefore});syncUndoButton();$('#vocabAnnounce').textContent=r.known&&!prior?`${w.word} 已标为熟词`:`${w.word}：${grades.find(([g])=>g===b.dataset.grade)[1]}，${intervalText(r.interval)}后复习`});
 }showWord();
}
// Today's bars (learned, known words) slide from where they were and briefly brighten when they grow.
let lastRing=null;
function paintRing(){const segs=[...document.querySelectorAll('.vocab-progress [data-bar]')];if(!segs.length)return;const now=Object.fromEntries(segs.map(x=>[x.dataset.bar,+x.dataset.w]));
 segs.forEach(x=>{x.style.width=(lastRing?.[x.dataset.bar]??(lastRing?0:now[x.dataset.bar]))+'%'});
 if(lastRing){segs[0].getBoundingClientRect();segs.forEach(x=>{const id=x.dataset.bar;x.style.width=now[id]+'%';if(now[id]!==(lastRing[id]??0))x.parentElement.classList.add('grew')})}
 lastRing=now}
let linkReturn=null,wordTimer,lastOverall=null,lastToday=null,showFirst=null,undoGrade=null;const undoStack=[];
function syncUndoButton(){const b=$('#vocabUndo');if(!b)return;b.querySelector('kbd').textContent=Vocab.keyLabel(state.vocab.keys.undo);const last=undoStack.at(-1);b.disabled=!last;b.title=last?`撤销「${last.word}：${last.label}」（${Vocab.keyLabel(state.vocab.keys.undo)}）`:'没有可撤销的评分';b.setAttribute('aria-label',last?`撤销 ${last.word} 的评分`:'撤销')}
// Brief highlight on a number that just changed; motion is dropped under Reduce Motion by the stylesheet.
function bump(selector){const el=$(selector);if(!el||document.body.classList.contains('vocab-plain'))return;el.classList.remove('bump');el.offsetWidth;el.classList.add('bump')}
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
 const back=$('#wordBack'),action=Vocab.keyAction(state.vocab?.keys||Vocab.KEY_PRESETS[Vocab.DEFAULT_PRESET],e.code);if(!back||!action)return;
 if(/^(Space|Enter|NumpadEnter)$/.test(e.code)&&t.tagName==='BUTTON'&&t.id!=='flipWord'&&tabFocus)return; // a button reached with Tab keeps its standard activation
 if(t.tagName==='BUTTON')t.blur(); // otherwise the button also fires on keyup
 if(action==='flip'){if(back.hidden){e.preventDefault();$('#flipWord').click()}}
 else if(action==='speak'){e.preventDefault();$('#speakWord')?.click()}
 else if(action==='undo'){e.preventDefault();undoGrade?.()}
 else if(action==='ignore'){e.preventDefault();$('#ignoreWord')?.click()}
 else if(action==='link'){e.preventDefault();$('#linkWord')?.click()}
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
