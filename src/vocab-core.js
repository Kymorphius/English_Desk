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
  const introduced=Object.values(progress).filter(p=>p.introduced===day(now)).length;
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
  const record={...(previous||{}),...next,introduced:previous?.introduced||day(now),last:now,reviews:(previous?.reviews||0)+1,lapses:(previous?.lapses||0)+(rating==='again'&&previous?1:0)};
  if(rating==='mastered'){record.due=nextMonth(now);record.interval=(record.due-now)/DAY}else record.due=now+Math.round(record.interval*DAY);
  return record;
 }
 const api={key,day,parse,queue,grade,ALGORITHMS};if(typeof module!=='undefined')module.exports=api;else root.Vocab=api;
})(globalThis);
