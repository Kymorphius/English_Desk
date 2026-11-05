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
  const due=words.filter(w=>progress[itemKey(w)]&&progress[itemKey(w)].due<=now).sort((a,b)=>progress[itemKey(a)].due-progress[itemKey(b)].due);
  // Words marked mastered the first time they appear are already known, so they don't use up the daily quota.
  const introduced=Object.values(progress).filter(p=>p.introduced===day(now)&&!p.known).length;
  return [...due,...words.filter(w=>!progress[itemKey(w)]).slice(0,Math.max(0,limit-introduced))];
 }
 const DAY=86400000,RATINGS=['again','hard','good','easy','mastered'],GRADE={again:1,hard:2,good:3,easy:4,mastered:4};
 const ALGORITHMS=['classic','fsrs','sm2'];
 function nextMonth(now){const due=new Date(now),date=due.getDate();due.setDate(1);due.setMonth(due.getMonth()+1);const last=new Date(due.getFullYear(),due.getMonth()+1,0).getDate();due.setDate(Math.min(date,last));return due.getTime()}
 // Fixed multipliers: the original and default schedule.
 // After seeing the answer: the author's fixed schedule brings the word back after a minute; FSRS and SM-2 wait ten, since a minute later
 // the answer is still in short-term memory and the re-test proves little.
 const AGAIN_STEP=1/1440,RELEARN=10/1440;
 function classic(previous,rating){const old=previous?.interval||0;return {interval:rating==='again'?AGAIN_STEP:rating==='hard'?Math.max(1,old*1.2):rating==='good'?Math.max(1,old*2.5):Math.max(4,old*3.5)}}
 // SuperMemo SM-2 (Wozniak, 1987): per-word easiness factor; a failed recall restarts the repetition count without touching EF.
 function sm2(previous,rating){
  const q={again:1,hard:3,good:4,easy:5,mastered:5}[rating];let ef=previous?.ef,reps=previous?.reps;const old=previous?.interval||0;
  if(ef===undefined){ef=2.5;reps=old>=6?2:old>=1?1:0}
  if(q<3)return {interval:RELEARN,ef,reps:0};
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
  s=Math.max(0.01,s);return {interval:g===1?RELEARN:fsrsInterval(s,retention),s,d};
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
  const pending=queue(words,progress,limit,now).filter(w=>!relearning.has(itemKey(w))).length+relearning.size;
  return {done:done.size,remaining:pending,total:done.size+pending,known};
 }
 // Overall progress. A word counts as mastered once its next review is at least 21 days away.
 const MASTERED_DAYS=21;
 function overall(words,progress){let learned=0,mastered=0;for(const w of words){const p=progress[key(w.word)];if(!p)continue;learned++;if(p.interval>=MASTERED_DAYS)mastered++}return {total:words.length,learned,mastered,learning:learned-mastered}}
 // What waits tomorrow: reviews falling due before tomorrow ends, plus tomorrow's new words.
 function tomorrow(words,progress,limit,now=Date.now()){const end=new Date(now);end.setHours(0,0,0,0);end.setDate(end.getDate()+2);let reviews=0,fresh=0;for(const w of words){const p=progress[itemKey(w)];if(p){if(p.due<end.getTime())reviews++}else fresh++}return {reviews,fresh:Math.min(limit,fresh)}}
 // Keyboard bindings, stored as physical key codes so they work regardless of input method or keyboard layout.
 const KEY_ACTIONS=['flip','again','hard','good','easy','mastered','speak','undo','ignore','link','sense1','sense2','sense3','col1','col2','col3','col4','col5','col6','peek','queue'];
 const ADDED_ACTIONS=['undo','ignore','link','sense1','sense2','sense3','col1','col2','col3','col4','col5','col6','peek','queue']; // actions introduced after bindings could first be saved
 const KEY_PRESETS={digits:{flip:'Space',again:'Digit1',hard:'Digit2',good:'Digit3',easy:'Digit4',mastered:'Digit5',speak:'KeyR',undo:'KeyO',ignore:'KeyX',link:'KeyL',sense1:'KeyQ',sense2:'KeyW',sense3:'KeyE',col1:'KeyZ',col2:'KeyC',col3:'KeyV',col4:'KeyB',col5:'KeyN',col6:'KeyM',peek:'KeyK',queue:'KeyP'},home:{flip:'Space',again:'KeyA',hard:'KeyS',good:'KeyD',easy:'KeyF',mastered:'KeyJ',speak:'KeyR',undo:'KeyO',ignore:'KeyX',link:'KeyL',sense1:'KeyQ',sense2:'KeyW',sense3:'KeyE',col1:'Digit1',col2:'Digit2',col3:'Digit3',col4:'Digit4',col5:'Digit5',col6:'Digit6',peek:'KeyK',queue:'KeyP'}};
 const DEFAULT_PRESET='home';
 const SYMBOLS={Space:'空格',Enter:'回车',Backspace:'⌫',ArrowLeft:'←',ArrowRight:'→',ArrowUp:'↑',ArrowDown:'↓',Semicolon:';',Quote:"'",Comma:',',Period:'.',Slash:'/',Backslash:'\\',BracketLeft:'[',BracketRight:']',Backquote:'`',Minus:'-',Equal:'='};
 const normalizeCode=code=>String(code||'').replace(/^Numpad(\d)$/,'Digit$1').replace(/^NumpadEnter$/,'Enter');
 const bindable=code=>/^(Key[A-Z]|Digit\d)$/.test(normalizeCode(code))||Object.hasOwn(SYMBOLS,normalizeCode(code));
 const keyLabel=code=>{code=normalizeCode(code);return SYMBOLS[code]||code.replace(/^Key|^Digit/,'')};
 function keyBindings(saved){saved=saved&&typeof saved==='object'?{...saved}:{};
  // Bindings saved before an action existed get its key from the layout they follow (else the default layout, the other one, or the first free letter).
  const layout=Object.values(KEY_PRESETS).find(p=>Object.entries(saved).every(([a,c])=>!KEY_ACTIONS.includes(a)||p[a]===normalizeCode(c)));
  for(const a of ADDED_ACTIONS)if(!saved[a]&&Object.keys(saved).length){const used=new Set(Object.values(saved).map(normalizeCode)),free=[layout?.[a],KEY_PRESETS[DEFAULT_PRESET][a],...Object.values(KEY_PRESETS).map(p=>p[a]),...'OPQUWXYZBCEGHIKLMNTV'.split('').map(c=>'Key'+c)].find(c=>c&&!used.has(c));if(free)saved[a]=free}
  const b={...KEY_PRESETS[DEFAULT_PRESET],...saved};const codes=KEY_ACTIONS.map(a=>b[a]);return codes.every(bindable)&&new Set(codes).size===codes.length?Object.fromEntries(KEY_ACTIONS.map(a=>[a,normalizeCode(b[a])])):{...KEY_PRESETS[DEFAULT_PRESET]}}
 function bindKey(bindings,action,code){code=normalizeCode(code);if(!KEY_ACTIONS.includes(action)||!bindable(code))throw Error('无法绑定这个按键');const next={...bindings},other=KEY_ACTIONS.find(a=>a!==action&&next[a]===code);if(other)next[other]=bindings[action];next[action]=code;return {bindings:next,swapped:other||null}}
 const keyPreset=bindings=>Object.keys(KEY_PRESETS).find(p=>KEY_ACTIONS.every(a=>KEY_PRESETS[p][a]===bindings[a]))||'custom';
 // Return is always another way to reveal the answer unless it has been bound to something else.
 function keyAction(bindings,code){code=normalizeCode(code);return KEY_ACTIONS.find(a=>bindings[a]===code)||(code==='Enter'?'flip':null)}
 // Levels follow mastered words, the most credible evidence of vocabulary actually retained. The last level is the whole list.
 // Levels are grouped into named stages; every level has its own title. Steps are small enough that no two levels are more than 400 mastered words apart.
 const STAGES=[['起步',[[0,'初来乍到'],[20,'小试牛刀']]],['入门',[[50,'词海拾贝'],[100,'初窥门径']]],['基础',[[150,'积少成多'],[200,'循序渐进'],[300,'根基渐稳']]],['进阶',[[400,'渐入佳境'],[500,'词汇新秀'],[650,'学有所成']]],['扎实',[[800,'稳扎稳打'],[1000,'千词在手'],[1200,'厚积薄发']]],['熟练',[[1400,'得心应手'],[1600,'博闻强记'],[1800,'融会贯通']]],['精进',[[2000,'出口成章'],[2300,'妙笔生花'],[2600,'学富五车'],[2900,'字斟句酌']]],['高阶',[[3200,'博览群书'],[3500,'游刃有余'],[3800,'炉火纯青'],[4100,'才高八斗'],[4400,'满腹经纶'],[4700,'卓尔不群']]],['词汇达人',[[5000,'词汇达人'],[5400,'过目不忘'],[5800,'出神入化'],[6200,'登峰造极'],[6600,'博古通今'],[7000,'一代词宗']]]];
 function levelTable(total){const t=[];for(const [stage,steps] of STAGES)for(const [min,title] of steps)if(min===0||min<total)t.push({min,stage,title});t.push({min:Math.max(total,1),stage:'词库通关',title:'词库通关'});return t}
 const levelName=x=>x.title;
 // Levels follow mastered words. peak is the highest mastered count ever reached, so forgetting words never takes a level away.
 function level(mastered,total,peak=0){const t=levelTable(total),best=Math.max(mastered,peak),n=t.filter(x=>best>=x.min).length||1,cur=t[n-1],next=t[n];return {n,name:levelName(cur),stage:cur.stage,min:cur.min,next:next?{n:n+1,name:levelName(next),min:next.min}:null}}
 // A peak saved under the earlier ten levels, as the mastered count that level required.
 const legacyPeak=(peakLevel,total)=>peakLevel>1?([0,50,100,200,500,1000,2000,3000,5000][peakLevel-1]??total):0;
 // British and American spellings of the same word. Each keeps its own card; the card names the other spelling.
 const SPELLING_VARIANTS=[['aeroplane','airplane'],['colour','color'],['colourful','colorful'],['centre','center'],['theatre','theater'],['travelling','traveling'],['traveller','traveler'],['organise','organize'],['organisation','organization'],['realise','realize'],['recognise','recognize'],['apologise','apologize'],['analyse','analyze'],['defence','defense'],['offence','offense'],['jewellery','jewelry'],['grey','gray'],['pyjamas','pajamas'],['mould','mold'],['aluminium','aluminum'],['catalogue','catalog'],['dialogue','dialog'],['favourite','favorite'],['favour','favor'],['honour','honor'],['labour','labor'],['neighbour','neighbor'],['neighbourhood','neighborhood'],['behaviour','behavior'],['humour','humor'],['harbour','harbor'],['flavour','flavor'],['litre','liter'],['fibre','fiber'],['kilometre','kilometer'],['centimetre','centimeter'],['enrol','enroll'],['fulfil','fulfill'],['cosy','cozy'],['sceptical','skeptical'],['judgement','judgment'],['encyclopaedia','encyclopedia'],['plough','plow'],['moustache','mustache'],['vapour','vapor'],['odour','odor'],['endeavour','endeavor'],['clamour','clamor'],['glamour','glamor'],['tumour','tumor'],['armour','armor'],['analogue','analog'],['criticise','criticize'],['summarise','summarize'],['maximise','maximize'],['specialise','specialize'],['sympathise','sympathize'],['characterise','characterize'],['civilisation','civilization'],['modernise','modernize'],['paralyse','paralyze'],['marvellous','marvelous'],['woollen','woolen'],['counsellor','counselor'],['gaol','jail'],['sulphur','sulfur'],['archaeology','archeology'],['maths','math']];
 // Spellings that differ only in some senses: labelled on the British side, never merged.
 const SPELLING_NOTES=[['programme','program','节目、计划义；计算机程序两边都写 program'],['licence','license','名词；动词两边都写 license'],['practise','practice','动词；名词两边都写 practice'],['tyre','tire','轮胎义'],['storey','story','楼层义'],['metre','meter','长度单位义'],['cheque','check','支票义'],['kerb','curb','路缘义'],['draught','draft','气流、生啤义'],['tonne','ton','公吨义']];
 const VARIANT_TIP='雅思英式、美式拼写都接受，同一篇里保持一致。';
 function variantOf(word){const k=key(word);for(const [br,am] of SPELLING_VARIANTS){if(k===br)return {label:'英式拼写',other:am,same:true,tip:VARIANT_TIP};if(k===am)return {label:'美式拼写',other:br,same:true,tip:VARIANT_TIP}}for(const [br,am,note] of SPELLING_NOTES)if(k===br)return {label:'英式拼写',other:am,note,tip:VARIANT_TIP};return null}
 // Known words have no daily target, so their bar uses steps that widen as the count grows.
 const knownGoal=n=>[10,20,50,100,200,500,1000,2000,5000].find(m=>m>n)||Math.max(n,1);
 // Built-in meanings run sense groups together, each led by its part of speech: "n. 小学生；中学生；n. 瞳孔". Later groups are the less familiar senses.
 const POS_TAG=/(^|[；;])\s*((?:n|v|vt|vi|adj|adv|prep|conj|pron|int|num|art|aux|abbr|det|phr)\.)\s*/g;
 function senses(meaning){const m=String(meaning||'').trim(),marks=[...m.matchAll(POS_TAG)],out=[];if(!marks.length)return m?[{pos:'',text:m}]:[];
  if(marks[0].index>0)out.push({pos:'',text:m.slice(0,marks[0].index)});
  marks.forEach((x,i)=>out.push({pos:x[2],text:m.slice(x.index+x[0].length,i+1<marks.length?marks[i+1].index:m.length).replace(/[；;\s]+$/,'')}));return out.filter(x=>x.text)}
 // Collocations ("dilated pupils｜扩大的瞳孔") aren't tied to a sense in the data. Each goes to the sense sharing the most two-character
 // words with its Chinese (ties to the earlier, usually main, sense); single characters are too loose ("出席" vs "提出"), so no overlap means none.
 function collocationSenses(col,parts){const pairs=t=>{const s=String(t).replace(/[；;，,。、（）()…\s]/g,''),out=new Set();for(let i=0;i+2<=s.length;i++)out.add(s.slice(i,i+2));return out};const sense=parts.map(p=>pairs(p.text));
  return (col||[]).map(c=>{const g=pairs(String(c).split('｜')[1]||''),scores=sense.map(s=>[...s].filter(x=>g.has(x)).length),best=Math.max(0,...scores);return best?scores.indexOf(best):-1})}
 // A sense marked 生义 becomes its own card, studied like a new word. Its key sets it apart from the word, so each keeps its own schedule.
 const itemKey=w=>w.sense?`${key(w.word)}#${w.sense.text}`:w.phrase?`${key(w.word)}@${w.phrase.en.toLowerCase()}`:key(w.word);
 // Whether a sentence uses a collocation: its words in order and close together, allowing inflection ("paid a fine"); sb/sth are placeholders.
 // Articles, pronouns and possessives stand in for any ("sun yourself" → "sun themselves"); forms of be and common irregular past forms map to the base verb.
 const PLACEHOLDERS=new Set('a an the sb sth someone something one oneself do doing my your yours his her hers its our their me you him us them myself yourself yourselves himself herself itself ourselves themselves'.split(' '));
 const IRREGULAR=Object.fromEntries('is:be are:be am:be made:make paid:pay took:take taken:take gave:give given:give went:go gone:go came:come got:get gotten:get kept:keep held:hold brought:bring thought:think bought:buy caught:catch taught:teach left:leave felt:feel met:meet ran:run told:tell sold:sell said:say found:find stood:stand understood:understand sat:sit spent:spend built:build sent:send lost:lose won:win broke:break broken:break spoke:speak spoken:speak chose:choose chosen:choose wrote:write written:write drove:drive driven:drive rose:rise risen:rise fell:fall fallen:fall grew:grow grown:grow knew:know known:know threw:throw thrown:throw drew:draw drawn:draw saw:see seen:see did:do done:do was:be were:be been:be had:have led:lead bore:bear borne:bear struck:strike laid:lay dealt:deal meant:mean became:become began:begin begun:begin forgot:forget forgotten:forget hid:hide hidden:hide shook:shake shaken:shake woke:wake woken:wake wore:wear worn:wear ate:eat eaten:eat flew:fly flown:fly hung:hang fed:feed fought:fight sought:seek arose:arise arisen:arise withdrew:withdraw withdrawn:withdraw overcame:overcome undertook:undertake undertaken:undertake'.split(' ').map(x=>x.split(':')));
 const stem=t=>{for(const s of ['ies','es','ed','ing','s'])if(t.endsWith(s)&&t.length-s.length>=3)return t.slice(0,-s.length);return t};
 const tokens=(s,skip)=>(String(s).toLowerCase().replace(/['’]s\b/g,'').match(/[a-z]+/g)||[]).filter(t=>!skip||!PLACEHOLDERS.has(t)).map(t=>stem(IRREGULAR[t]||t));
 const same=(t,w)=>t===w||t.length>=3&&w.length>=3&&(t.startsWith(w)||w.startsWith(t));
 function usesPhrase(sentence,phrase){const want=tokens(phrase,true),got=tokens(sentence);if(!want.length)return false;
  for(let s=0;s<got.length;s++){if(!same(got[s],want[0]))continue;let i=1,last=s;for(let j=s+1;j<got.length&&i<want.length&&j-last<=4;j++)if(same(got[j],want[i])){i++;last=j}if(i===want.length)return true}return false}
 // The list entry for a word as it appears in text: "suspended" → suspend, "paid" → pay, "studies" → study, "stopped" → stop.
 function lookupWord(token,has){const t=String(token).toLowerCase().replace(/[’']s$/,'').replace(/’/g,"'"),c=[t,IRREGULAR[t]];if(t.endsWith('ies'))c.push(t.slice(0,-3)+'y');if(t.endsWith('es'))c.push(t.slice(0,-2));if(t.endsWith('s'))c.push(t.slice(0,-1));
  for(const suffix of ['ed','ing'])if(t.endsWith(suffix)){const b=t.slice(0,-suffix.length);c.push(b,b+'e');if(/(.)\1$/.test(b))c.push(b.slice(0,-1));if(b.endsWith('i'))c.push(b.slice(0,-1)+'y')}
  return c.find(x=>x&&has(x))||null}
 // The learner's own imported texts, split into sentences once with a word index, so original sentences for a collocation are quick to find.
 function sentenceIndex(materials){const sentences=[],postings=new Map(),seen=new Set();
  const add=(paragraph,title)=>{for(const part of paragraph.split(/(?<=[.!?])\s+(?=["“‘(]?[A-Z0-9])/)){const text=part.trim(),n=(text.match(/[A-Za-z]+/g)||[]).length;if(n<5||n>60||seen.has(text))continue;seen.add(text);
   const id=sentences.push({text,title})-1;for(const t of new Set(tokens(text)))(postings.get(t)||postings.set(t,[]).get(t)).push(id)}};
  // Blank lines end a paragraph. A short line without closing punctuation, followed by a blank line or a capital, is a heading and is
  // dropped; any other line break is wrapping (text copied from a PDF), so the lines are joined.
  for(const m of materials||[]){const title=String(m?.title||'语料'),lines=String(m?.text||'').split(/\r?\n/).map(l=>l.trim());let paragraph='';
   lines.forEach((line,i)=>{const next=lines[i+1]||'',heading=line&&(line.match(/[A-Za-z]+/g)||[]).length<=8&&!/[.!?,;:]["”’)]?$/.test(line)&&(!next||/^["“‘(]?[A-Z0-9]/.test(next));if(!line||heading){add(paragraph,title);paragraph='';return}paragraph+=' '+line});add(paragraph,title)}
  return {sentences,postings}}
 // Sentences that use a collocation (or a word), shortest first.
 function originalsFor(index,phrase,limit=2){const want=tokens(phrase,true);if(!index||!want.length)return [];const first=want[0],ids=new Set();
  for(const [t,list] of index.postings)if(t===first||t.length>=3&&first.length>=3&&(t.startsWith(first)||first.startsWith(t)))for(const id of list)ids.add(id);
  return [...ids].map(id=>index.sentences[id]).filter(s=>usesPhrase(s.text,phrase)).sort((a,b)=>a.text.length-b.text.length).slice(0,limit)}
 // Where a sentence uses a word or collocation, as character ranges for highlighting; the same matching as usesPhrase.
 // Words joined only by spaces or hyphens become one range ("in suspension"); separated words get their own ("put … in place").
 function matchSpans(sentence,phrase){const text=String(sentence),want=tokens(phrase,true),got=[];if(!want.length)return [];
  for(const m of text.matchAll(/[A-Za-z]+/g)){const t=m[0].toLowerCase();if(t==='s'&&/['’]$/.test(text.slice(0,m.index)))continue;got.push({t:stem(IRREGULAR[t]||t),from:m.index,to:m.index+m[0].length})}
  for(let s=0;s<got.length;s++){if(!same(got[s].t,want[0]))continue;const hit=[got[s]];let i=1,last=s;for(let j=s+1;j<got.length&&i<want.length&&j-last<=4;j++)if(same(got[j].t,want[i])){hit.push(got[j]);i++;last=j}
   if(i===want.length){const out=[];for(const h of hit){const prev=out.at(-1);if(prev&&/^[\s-]*$/.test(text.slice(prev[1],h.from)))prev[1]=h.to;else out.push([h.from,h.to])}return out}}
  return []}
 // Where a translation renders a Chinese gloss: the longest stretch of two or more characters it shares with any item of the gloss.
 function glossSpans(text,gloss){const t=String(text),items=String(gloss).split(/[；;，,、…（）()\s]+/).filter(x=>x.length>=2);let best='';
  for(const item of items)for(let n=item.length;n>=2&&n>best.length;n--)for(let i=0;i+n<=item.length;i++){const part=item.slice(i,i+n);if(t.includes(part)){best=part;break}}
  const out=[];if(best)for(let at=t.indexOf(best);at>=0;at=t.indexOf(best,at+best.length))out.push([at,at+best.length]);return out}
 // An AI-written example is kept only if it parses, is a sentence of sensible length and really uses the collocation.
 function parseExample(text,phrase){const raw=String(text),json=raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1);let v;try{v=JSON.parse(json)}catch{throw Error('AI 返回的例句格式不对')}
  const en=String(v?.en||'').trim(),zh=String(v?.zh||'').trim(),n=(en.match(/[A-Za-z]+/g)||[]).length;if(!en||!zh||n<4||n>45)throw Error('AI 返回的例句不完整');if(!usesPhrase(en,phrase))throw Error('AI 写的例句没有用上这个搭配');return {en,zh}}
 // A saved collocation is its own card too: the Chinese and the word are the cue, the English collocation is the answer.
 function phraseItems(words,phrases,written={}){const byKey=new Map(words.map(w=>[key(w.word),w])),out=[];
  for(const [k,list] of Object.entries(phrases||{})){const w=byKey.get(k);if(!w||!Array.isArray(list))continue;
   for(const raw of list){if(!(w.col||[]).includes(raw))continue;const [en,zh='']=raw.split('｜'),ex=[[w.example,w.translation],[w.example2,w.translation2]].find(([e])=>e&&usesPhrase(e,en))||['',''];out.push({word:w.word,uk:w.uk,us:w.us,cefr:w.cefr,meaning:w.meaning,example:ex[0],translation:ex[1],phrase:{en,zh,raw},...(!ex[0]&&written[k]?.[raw]?{written:written[k][raw]}:{})})}}
  return out}
 function senseItems(words,rareSenses,written={}){const byKey=new Map(words.map(w=>[key(w.word),w])),fmt=p=>(p.pos?p.pos+' ':'')+p.text,out=[];
  for(const [k,texts] of Object.entries(rareSenses||{})){const w=byKey.get(k),parts=w?senses(w.meaning):[];if(parts.length<2||!Array.isArray(texts))continue;
   const owner=collocationSenses(w.col,parts);for(const text of texts){const j=parts.findIndex(p=>p.text===text),s=parts[j];if(s)out.push({word:w.word,uk:w.uk,us:w.us,cefr:w.cefr,meaning:fmt(s),def:w.en?.[j]||'',col:(w.col||[]).filter((c,i)=>owner[i]===j),...(written[k]?.[s.text]?{written:written[k][s.text]}:{}),sense:{text:s.text,pos:s.pos,others:parts.filter(p=>p!==s).map(fmt),known:parts.filter(p=>!texts.includes(p.text)).map(p=>p.text)}})}}
  return out}
 // The built-in list runs from A1 to C2 (CEFR). Starting new words at a higher level skips the easier ones; words already
 // studied keep their reviews, and imported words without a level are always included.
 const CEFR=['A1','A2','B1','B2','C1','C2'];
 function newFrom(words,progress,level){const from=CEFR.indexOf(level);return from<=0?words:words.filter(w=>progress[key(w.word)]||!CEFR.includes(w.cefr)||CEFR.indexOf(w.cefr)>=from)}
 // A card forgotten or first met moments ago can't be mastered yet: while it is in its short relearning step, 精通 counts as 简单.
 const effectiveRating=(prior,rating)=>rating==='mastered'&&prior&&prior.interval<1?'easy':rating;
 const api={key,day,parse,knownGoal,variantOf,senses,collocationSenses,itemKey,senseItems,phraseItems,usesPhrase,matchSpans,glossSpans,parseExample,lookupWord,sentenceIndex,originalsFor,effectiveRating,CEFR,newFrom,queue,grade,today,overall,tomorrow,level,levelTable,legacyPeak,MASTERED_DAYS,ALGORITHMS,KEY_ACTIONS,KEY_PRESETS,DEFAULT_PRESET,normalizeCode,bindable,keyLabel,keyBindings,bindKey,keyPreset,keyAction};if(typeof module!=='undefined')module.exports=api;else root.Vocab=api;
})(globalThis);
