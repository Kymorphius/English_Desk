(function(root){
 const key=word=>String(word).trim().toLowerCase();
 const day=(now=Date.now())=>{const d=new Date(now);return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`};
 function parse(text){
  text=text.replace(/^\uFEFF/,'').trim();let rows;
  if(text.startsWith('[')){rows=JSON.parse(text);if(!Array.isArray(rows))throw Error('JSON 必须是单词数组');}
  else {
   const sep=text.includes('\t')?'\t':',';rows=[];let fields=[],field='',quoted=false;
   for(let i=0;i<=text.length;i++){const c=text[i]??'\n';if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++}else quoted=!quoted;}else if(!quoted&&(c===sep||c==='\n')){fields.push(field.trim());field='';if(c==='\n'){if(fields.some(Boolean))rows.push(fields);fields=[]}}else if(c!=='\r')field+=c;}
   if(quoted)throw Error('CSV 引号未闭合');
   if(rows[0]&&/^(word|单词)$/i.test(rows[0][0]))rows.shift();
   rows=rows.map(r=>({word:r[0],meaning:r[1],example:r[2]||''}));
  }
  if(!rows.length||rows.length>10000)throw Error('一次导入 1–10000 个单词');
  const result=new Map();for(const [i,w] of rows.entries()){
   if(!w||typeof w.word!=='string'||typeof w.meaning!=='string'||!w.word.trim()||!w.meaning.trim())throw Error(`第 ${i+1} 条需要 word（单词）和 meaning（释义）`);
   if(w.word.length>120||w.meaning.length>2000)throw Error(`第 ${i+1} 条过长`);
   result.set(key(w.word),{word:w.word.trim(),meaning:w.meaning.trim(),example:String(w.example||'').slice(0,2000)});
  }return [...result.values()];
 }
 function queue(words,progress,limit,now=Date.now()){
  const due=words.filter(w=>progress[key(w.word)]&&progress[key(w.word)].due<=now).sort((a,b)=>progress[key(a.word)].due-progress[key(b.word)].due);
  // Words marked mastered the first time they appear are already known, so they don't use up the daily quota.
  const introduced=Object.values(progress).filter(p=>p.introduced===day(now)&&!p.known).length;
  return [...due,...words.filter(w=>!progress[key(w.word)]).slice(0,Math.max(0,limit-introduced))];
 }
 const DAY=86400000,RATINGS=['again','hard','good','easy','mastered'],GRADE={again:1,hard:2,good:3,easy:4,mastered:4};
 const ALGORITHMS=['classic','fsrs','sm2'];
 function nextMonth(now){const due=new Date(now),date=due.getDate();due.setDate(1);due.setMonth(due.getMonth()+1);const last=new Date(due.getFullYear(),due.getMonth()+1,0).getDate();due.setDate(Math.min(date,last));return due.getTime()}
 // Fixed multipliers: the original and default schedule.
 function classic(previous,rating){const old=previous?.interval||0;return {interval:rating==='again'?1/1440:rating==='hard'?Math.max(1,old*1.2):rating==='good'?Math.max(1,old*2.5):Math.max(4,old*3.5)}}
 // SuperMemo SM-2 (Wozniak, 1987): per-word easiness factor; a failed recall restarts the repetition count without touching EF.
 function sm2(previous,rating){
  const q={again:1,hard:3,good:4,easy:5,mastered:5}[rating];let ef=previous?.ef,reps=previous?.reps;const old=previous?.interval||0;
  if(ef===undefined){ef=2.5;reps=old>=6?2:old>=1?1:0}
  if(q<3)return {interval:1/1440,ef,reps:0};
  const interval=reps===0?1:reps===1?6:Math.round(Math.max(old,1)*ef);
  return {interval,reps:reps+1,ef:Math.max(1.3,ef+0.1-(5-q)*(0.08+(5-q)*0.02))};
 }
 // FSRS-5 with its published default parameters. Stability s is the interval (days) at which recall probability falls to 90%.
 const W=[0.40255,1.18385,3.173,15.69105,7.1949,0.5345,1.4604,0.0046,1.54575,0.1192,1.01925,1.9395,0.11,0.29605,2.2698,0.2315,2.9898,0.51655,0.6621],DECAY=-0.5,FACTOR=19/81;
 const clampD=d=>Math.min(10,Math.max(1,d)),initD=g=>clampD(W[4]-Math.exp(W[5]*(g-1))+1);
 const retrievability=(elapsed,s)=>Math.pow(1+FACTOR*elapsed/s,DECAY);
 function fsrsInterval(s,retention){return Math.min(36500,Math.max(1,Math.round(s/FACTOR*(Math.pow(retention,1/DECAY)-1))))}
 function fsrs(previous,rating,now,retention){
  const g=GRADE[rating];let s=previous?.s,d=previous?.d;
  if(previous&&s===undefined){s=Math.max(previous.interval||0,0.1);d=previous.ef?clampD(5+(2.5-previous.ef)*4):5}
  if(s===undefined){s=W[g-1];d=initD(g)}
  else{
   const last=previous.last??(previous.due-(previous.interval||0)*DAY),elapsed=Math.max(0,(now-last)/DAY);
   if(elapsed<1)s=s*Math.exp(W[17]*(g-3+W[18]));
   else{const r=retrievability(elapsed,s);
    s=g===1?Math.min(s,W[11]*Math.pow(d,-W[12])*(Math.pow(s+1,W[13])-1)*Math.exp(W[14]*(1-r)))
     :s*(1+Math.exp(W[8])*(11-d)*Math.pow(s,-W[9])*(Math.exp(W[10]*(1-r))-1)*(g===2?W[15]:1)*(g===4?W[16]:1));}
   d=clampD(W[7]*initD(4)+(1-W[7])*(d+(-W[6]*(g-3))*(10-d)/9));
  }
  s=Math.max(0.01,s);return {interval:g===1?1/1440:fsrsInterval(s,retention),s,d};
 }
 function grade(previous,rating,now=Date.now(),options={}){
  if(!RATINGS.includes(rating))throw Error('未知评分');
  const algorithm=ALGORITHMS.includes(options.algorithm)?options.algorithm:'classic',retention=Math.min(0.97,Math.max(0.7,Number(options.retention)||0.9));
  const next=algorithm==='sm2'?sm2(previous,rating):algorithm==='fsrs'?fsrs(previous,rating,now,retention):classic(previous,rating);
  const record={...(previous||{}),...next,...(!previous&&rating==='mastered'?{known:true}:{}),introduced:previous?.introduced||day(now),last:now,reviews:(previous?.reviews||0)+1,lapses:(previous?.lapses||0)+(rating==='again'&&previous?1:0)};
  if(rating==='mastered'){record.due=nextMonth(now);record.interval=(record.due-now)/DAY}else record.due=now+Math.round(record.interval*DAY);
  return record;
 }
 // Today's progress. Words being relearned after "again" count as remaining until they pass, so the total stays steady.
 function today(words,progress,limit,now=Date.now()){
  const d=day(now),relearning=new Set(),done=new Set();
  let known=0;for(const [k,p] of Object.entries(progress)){if(!p.last||day(p.last)!==d)continue;if(p.known&&p.introduced===d)known++;else (p.interval<1?relearning:done).add(k)}
  const pending=queue(words,progress,limit,now).filter(w=>!relearning.has(key(w.word))).length+relearning.size;
  return {done:done.size,remaining:pending,total:done.size+pending,known};
 }
 // Overall progress. A word counts as mastered once its next review is at least 21 days away.
 const MASTERED_DAYS=21;
 function overall(words,progress){let learned=0,mastered=0;for(const w of words){const p=progress[key(w.word)];if(!p)continue;learned++;if(p.interval>=MASTERED_DAYS)mastered++}return {total:words.length,learned,mastered,learning:learned-mastered}}
 // What waits tomorrow: reviews falling due before tomorrow ends, plus tomorrow's new words.
 function tomorrow(words,progress,limit,now=Date.now()){const end=new Date(now);end.setHours(0,0,0,0);end.setDate(end.getDate()+2);let reviews=0,fresh=0;for(const w of words){const p=progress[key(w.word)];if(p){if(p.due<end.getTime())reviews++}else fresh++}return {reviews,fresh:Math.min(limit,fresh)}}
 // Keyboard bindings, stored as physical key codes so they work regardless of input method or keyboard layout.
 const KEY_ACTIONS=['flip','again','hard','good','easy','mastered','speak','undo','ignore'];
 const ADDED_ACTIONS=['undo','ignore']; // actions introduced after bindings could first be saved
 const KEY_PRESETS={digits:{flip:'Space',again:'Digit1',hard:'Digit2',good:'Digit3',easy:'Digit4',mastered:'Digit5',speak:'KeyR',undo:'KeyO',ignore:'KeyX'},home:{flip:'Space',again:'KeyA',hard:'KeyS',good:'KeyD',easy:'KeyF',mastered:'KeyJ',speak:'KeyR',undo:'KeyO',ignore:'KeyX'}};
 const SYMBOLS={Space:'空格',Enter:'回车',Backspace:'⌫',ArrowLeft:'←',ArrowRight:'→',ArrowUp:'↑',ArrowDown:'↓',Semicolon:';',Quote:"'",Comma:',',Period:'.',Slash:'/',Backslash:'\\',BracketLeft:'[',BracketRight:']',Backquote:'`',Minus:'-',Equal:'='};
 const normalizeCode=code=>String(code||'').replace(/^Numpad(\d)$/,'Digit$1').replace(/^NumpadEnter$/,'Enter');
 const bindable=code=>/^(Key[A-Z]|Digit\d)$/.test(normalizeCode(code))||Object.hasOwn(SYMBOLS,normalizeCode(code));
 const keyLabel=code=>{code=normalizeCode(code);return SYMBOLS[code]||code.replace(/^Key|^Digit/,'')};
 function keyBindings(saved){saved=saved&&typeof saved==='object'?{...saved}:{};
  // Bindings saved before an action existed get its default key, or the first free letter if that key is taken.
  for(const a of ADDED_ACTIONS)if(!saved[a]&&Object.keys(saved).length){const used=new Set(Object.values(saved).map(normalizeCode)),free=[KEY_PRESETS.digits[a],...'OPQUWXYZBCEGHIKLMNTV'.split('').map(c=>'Key'+c)].find(c=>!used.has(c));if(free)saved[a]=free}
  const b={...KEY_PRESETS.digits,...saved};const codes=KEY_ACTIONS.map(a=>b[a]);return codes.every(bindable)&&new Set(codes).size===codes.length?Object.fromEntries(KEY_ACTIONS.map(a=>[a,normalizeCode(b[a])])):{...KEY_PRESETS.digits}}
 function bindKey(bindings,action,code){code=normalizeCode(code);if(!KEY_ACTIONS.includes(action)||!bindable(code))throw Error('无法绑定这个按键');const next={...bindings},other=KEY_ACTIONS.find(a=>a!==action&&next[a]===code);if(other)next[other]=bindings[action];next[action]=code;return {bindings:next,swapped:other||null}}
 const keyPreset=bindings=>Object.keys(KEY_PRESETS).find(p=>KEY_ACTIONS.every(a=>KEY_PRESETS[p][a]===bindings[a]))||'custom';
 // Return is always another way to reveal the answer unless it has been bound to something else.
 function keyAction(bindings,code){code=normalizeCode(code);return KEY_ACTIONS.find(a=>bindings[a]===code)||(code==='Enter'?'flip':null)}
 // Levels follow mastered words, the most credible evidence of vocabulary actually retained. The last level is the whole list.
 const LEVELS=[[0,'起步'],[50,'入门'],[100,'基础'],[200,'进阶'],[500,'扎实'],[1000,'熟练'],[2000,'精熟'],[3000,'高阶'],[5000,'词汇达人']];
 function levelTable(total){const t=LEVELS.filter(([min])=>min===0||min<total);return [...t,[Math.max(total,1),'词库通关']]}
 // A level once reached is kept (peak), so forgetting a few words never takes it away; the count itself stays truthful.
 function level(mastered,total,peak=1){const t=levelTable(total);let n=t.filter(([min])=>mastered>=min).length;n=Math.max(n,Math.min(peak,t.length));const [min,name]=t[n-1],next=t[n];return {n,name,min,next:next?{n:n+1,name:next[1],min:next[0]}:null}}
 const api={key,day,parse,queue,grade,today,overall,tomorrow,level,levelTable,MASTERED_DAYS,ALGORITHMS,KEY_ACTIONS,KEY_PRESETS,normalizeCode,bindable,keyLabel,keyBindings,bindKey,keyPreset,keyAction};if(typeof module!=='undefined')module.exports=api;else root.Vocab=api;
})(globalThis);
