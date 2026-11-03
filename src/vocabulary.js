function vocabulary(){
 state.vocab??={custom:[],progress:{},limit:20};const v=state.vocab;
 const words=[...new Map([...VOCABULARY,...v.custom].map(w=>[Vocab.key(w.word),w])).values()];
 header('背单词',`${words.length} 个单词 · 先回忆，再翻面评分`);
 $('#workspace').innerHTML=`<section class="section"><label>每天新词数量<input id="wordLimit" type="number" min="1" max="500" value="${v.limit}"></label><small>到期复习不占新词数量。再次打开会继续本机进度。</small><div id="wordCard"></div></section><div class="word-import-entry"><button id="openWordImport" class="quiet">导入单词库</button></div>`;
 $('#wordLimit').onchange=e=>{const n=Number(e.target.value);if(!Number.isInteger(n)||n<1||n>500){e.target.value=v.limit;return toast('每天新词数量为 1–500')}v.limit=n;save();showWord()};
 $('#openWordImport').onclick=()=>{changePage('settings');$('#wordImportSettings').scrollIntoView({block:'start'});$('#wordImportText').focus({preventScroll:true})};
 function showWord(){
  const q=Vocab.queue(words,v.progress,v.limit),w=q[0];const box=$('#wordCard');
  if(!w){box.innerHTML='<p>当前没有待学单词。已完成今日新词或复习，稍后再来看。</p><button id="refreshWords">刷新复习</button>';$('#refreshWords').onclick=showWord;return}
  box.innerHTML=`<p class="muted">本轮待学 ${q.length} · ${v.progress[Vocab.key(w.word)]?'复习':'新词'}</p><h2 class="vocab-word">${esc(w.word)}</h2><p>${esc((state.speechAccent==='en-US'?w.us:w.uk)||'')}</p><button id="speakWord" title="朗读单词" aria-label="朗读单词">🔊</button><button id="flipWord" class="primary">显示答案</button><div id="wordBack" hidden><p>${esc(w.meaning)}</p><p>${esc(w.example||'')}</p><p class="muted">${esc(w.translation||'')}</p><div class="tools">${[['again','重来'],['hard','困难'],['good','记得'],['easy','简单'],['mastered','精通']].map(([r,t])=>`<button data-grade="${r}">${t}<small> ${r==='mastered'?'1 个月':intervalText(Vocab.grade(v.progress[Vocab.key(w.word)],r).interval)}</small></button>`).join('')}</div></div>`;
  $('#speakWord').onclick=()=>speak(w.word);$('#flipWord').onclick=()=>{$('#wordBack').hidden=false;$('#flipWord').hidden=true};
  box.querySelectorAll('[data-grade]').forEach(b=>b.onclick=()=>{v.progress[Vocab.key(w.word)]=Vocab.grade(v.progress[Vocab.key(w.word)],b.dataset.grade);save();showWord()});
 }showWord();
}
function intervalText(days){return days<1?'1 分钟':Math.round(days)+' 天'}
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
