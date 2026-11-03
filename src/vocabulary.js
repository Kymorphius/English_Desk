function vocabulary(){
 state.vocab??={custom:[],progress:{},limit:20};const v=state.vocab;v.algorithm=Vocab.ALGORITHMS.includes(v.algorithm)?v.algorithm:'classic';v.retention=[0.85,0.9,0.95].includes(v.retention)?v.retention:0.9;
 const words=[...new Map([...VOCABULARY,...v.custom].map(w=>[Vocab.key(w.word),w])).values()];
 header('背单词',`${words.length} 个单词 · 先回忆，再翻面评分`);
 const names={classic:'固定倍数',fsrs:'FSRS',sm2:'SM-2'};
 $('#workspace').innerHTML=`<details id="vocabSettings" class="section vocab-settings" ${v.settingsOpen?'open':''}><summary>学习设置<span id="vocabSettingsSummary" class="muted"></span></summary><label>每天新词数量<input id="wordLimit" type="number" min="1" max="500" value="${v.limit}"></label><small>到期复习不占新词数量。再次打开会继续本机进度。</small><div class="field-row"><label>复习算法<select id="wordAlgorithm" aria-label="复习算法">${[['classic','固定倍数 · 默认'],['fsrs','FSRS'],['sm2','SM-2 · SuperMemo 经典']].map(([id,name])=>`<option value="${id}" ${id===v.algorithm?'selected':''}>${name}</option>`).join('')}</select></label><label id="wordRetentionLabel" ${v.algorithm==='fsrs'?'':'hidden'}>目标记住率<select id="wordRetention" aria-label="目标记住率">${[0.85,0.9,0.95].map(r=>`<option value="${r}" ${r===v.retention?'selected':''}>${Math.round(r*100)}%${r===0.9?' · 推荐':''}</option>`).join('')}</select></label></div><p id="wordAlgorithmNote" class="muted"></p><p class="muted">快捷键：空格或回车显示答案，1–5 依次评分，R 朗读。</p></details><section id="wordCard" class="section vocab-card"></section><div class="word-import-entry"><button id="openWordImport" class="quiet">导入单词库</button></div>`;
 $('#vocabSettings').ontoggle=e=>{v.settingsOpen=e.target.open;save()};
 const notes={fsrs:'按记忆模型估算每个词的遗忘速度，在记住概率降到目标值时安排复习。记住率越高，复习越频繁。',sm2:'SuperMemo 经典算法：每个词有自己的容易度，困难会降低、简单会提高；忘记后从 1 天重新开始。',classic:'默认算法：困难 ×1.2、记得 ×2.5、简单 ×3.5，所有单词使用相同倍数。'};
 const syncAlgorithm=()=>{$('#vocabSettingsSummary').textContent=` · ${names[v.algorithm]}${v.algorithm==='fsrs'?' '+Math.round(v.retention*100)+'%':''} · 每天 ${v.limit} 个新词`;$('#wordRetentionLabel').hidden=v.algorithm!=='fsrs';$('#wordAlgorithmNote').textContent=notes[v.algorithm]+' 切换算法会保留现有进度。'};syncAlgorithm();
 $('#wordAlgorithm').onchange=e=>{v.algorithm=e.target.value;save();syncAlgorithm();showWord()};
 $('#wordRetention').onchange=e=>{v.retention=Number(e.target.value);save();syncAlgorithm();showWord()};
 $('#wordLimit').onchange=e=>{const n=Number(e.target.value);if(!Number.isInteger(n)||n<1||n>500){e.target.value=v.limit;return toast('每天新词数量为 1–500')}v.limit=n;save();syncAlgorithm();showWord()};
 $('#openWordImport').onclick=()=>{changePage('settings');$('#wordImportSettings').scrollIntoView({block:'start'});$('#wordImportText').focus({preventScroll:true})};
 function showWord(){
  const options={algorithm:v.algorithm,retention:v.retention},q=Vocab.queue(words,v.progress,v.limit),w=q[0];const box=$('#wordCard');
  if(!w){box.innerHTML='<p>当前没有待学单词。已完成今日新词或复习，稍后再来看。</p><button id="refreshWords">刷新复习</button>';$('#refreshWords').onclick=showWord;return}
  const prior=v.progress[Vocab.key(w.word)],grades=[['again','重来'],['hard','困难'],['good','记得'],['easy','简单'],['mastered','精通']];
  box.innerHTML=`<p class="vocab-meta">${prior?'复习':'新词'} · 本轮还剩 ${q.length}</p><div class="vocab-head"><h2 class="vocab-word">${esc(w.word)}</h2><button id="speakWord" class="quiet vocab-speak" title="朗读单词（R）" aria-label="朗读单词">🔊</button></div><p class="vocab-phonetic">${esc((state.speechAccent==='en-US'?w.us:w.uk)||'')}</p><button id="flipWord" class="primary vocab-flip">显示答案 <kbd>空格</kbd></button><div id="wordBack" hidden><p class="vocab-meaning">${esc(w.meaning)}</p>${w.example?`<p class="vocab-example">${esc(w.example)}</p>`:''}${w.translation?`<p class="muted">${esc(w.translation)}</p>`:''}<div class="vocab-grades">${grades.map(([r,t],i)=>`<button data-grade="${r}" class="grade-${r}" title="${t}（${i+1}）"><span class="grade-key">${i+1}</span><strong>${t}</strong><small>${r==='mastered'?'1 个月':intervalText(Vocab.grade(prior,r,Date.now(),options).interval)}</small></button>`).join('')}</div></div>`;
  $('#speakWord').onclick=()=>speak(w.word);$('#flipWord').onclick=()=>{$('#wordBack').hidden=false;$('#flipWord').hidden=true};
  box.querySelectorAll('[data-grade]').forEach(b=>b.onclick=()=>{v.progress[Vocab.key(w.word)]=Vocab.grade(v.progress[Vocab.key(w.word)],b.dataset.grade,Date.now(),options);save();showWord()});
 }showWord();
}
// Keyboard review: Space/Enter flips the card, 1–5 grade it, R reads the word aloud.
document.addEventListener('keydown',e=>{
 if(page!=='vocabulary'||e.metaKey||e.ctrlKey||e.altKey||e.repeat||document.querySelector('.select-menu'))return;
 const t=e.target;if(t.closest?.('input,textarea,select,[contenteditable="true"]'))return;
 const back=$('#wordBack');if(!back)return;
 if((e.key===' '||e.key==='Enter')&&t.tagName==='BUTTON'&&t.id!=='flipWord')return; // a focused button keeps its standard activation
 if((e.key===' '||e.key==='Enter')&&back.hidden){e.preventDefault();$('#flipWord').click()}
 else if(/^[1-5]$/.test(e.key)&&!back.hidden){e.preventDefault();back.querySelectorAll('[data-grade]')[Number(e.key)-1]?.click()}
 else if(e.key==='r'||e.key==='R'){e.preventDefault();$('#speakWord')?.click()}
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
