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
 function grade(previous,rating,now=Date.now()){
  if(!['again','hard','good','easy','mastered'].includes(rating))throw Error('未知评分');
  if(rating==='mastered'){
   const due=new Date(now),date=due.getDate();due.setDate(1);due.setMonth(due.getMonth()+1);
   const last=new Date(due.getFullYear(),due.getMonth()+1,0).getDate();due.setDate(Math.min(date,last));
   return {introduced:previous?.introduced||day(now),interval:(due.getTime()-now)/86400000,due:due.getTime(),reviews:(previous?.reviews||0)+1};
  }
  const old=previous?.interval||0;
  const interval=rating==='again'?1/1440:rating==='hard'?Math.max(1,old*1.2):rating==='good'?Math.max(1,old*2.5):Math.max(4,old*3.5);
  return {introduced:previous?.introduced||day(now),interval,due:now+Math.round(interval*86400000),reviews:(previous?.reviews||0)+1};
 }
 const api={key,day,parse,queue,grade};if(typeof module!=='undefined')module.exports=api;else root.Vocab=api;
})(globalThis);
