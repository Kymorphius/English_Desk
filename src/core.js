(function(root){
 const norm=s=>s.toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').trim();
 function unique(items){const seen=new Set();return items.filter(q=>{const k=q.part+':'+norm(q.question);if(seen.has(k))return false;seen.add(k);return true})}
 function slots(text){return [...new Set([...text.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)].map(x=>x[1]))]}
 function fill(text,values){return text.replace(/\{\{\s*([^{}]+?)\s*\}\}/g,(all,key)=>values[key]||all)}
 function draw(items,previous){if(!items.length)return null;const pool=items.length>1?items.filter(q=>q.id!==previous):items;return pool[Math.floor(Math.random()*pool.length)]}
 function imports(text,filename){
 if(text.length>2e6)throw Error('文件不能超过 2 MB');
 if(/\.json$/i.test(filename)){let data;try{data=JSON.parse(text)}catch{throw Error('JSON 格式不正确')};const rows=Array.isArray(data)?data:[data];if(rows.length>2000)throw Error('每次最多导入 2000 条');return rows.map((q,i)=>{
 if(!q||typeof q.question!=='string'||!q.question.trim())throw Error(`第 ${i+1} 条缺少 question`);
 if(![1,2,3].includes(Number(q.part)))throw Error(`第 ${i+1} 条 part 必须是 1、2 或 3`);
 if(q.answer!==undefined&&typeof q.answer!=='string')throw Error(`第 ${i+1} 条 answer 必须是文字`);
 if(q.cues!==undefined&&(!Array.isArray(q.cues)||q.cues.some(x=>typeof x!=='string')))throw Error(`第 ${i+1} 条 cues 必须是文字数组`);
 if(q.logic!==undefined&&(!Array.isArray(q.logic)||q.logic.some(x=>typeof x!=='string')))throw Error(`第 ${i+1} 条 logic 必须是文字数组`);
 return {id:'import-'+Date.now()+'-'+i+'-'+Math.random().toString(36).slice(2),kind:'speaking',part:Number(q.part),title:String(q.title||'自定义语料'),question:q.question,answer:q.answer||'',cues:q.cues||[],logic:{stance:'自定义逻辑链',chains:q.logic||[]},answerSource:'自定义导入'};
 });}
 if(!/\.(txt|md)$/i.test(filename))throw Error('请导入 JSON、TXT 或 Markdown 文件');
 if(!text.trim())throw Error('文件内容为空');
 return [{id:'material-'+Date.now(),kind:'material',title:filename,text}];
 }
 function speakingCards(items){
 const cards=[],topics=new Map();
 for(const q of items){
  if(q.part!==1){cards.push(q);continue}
  const key=norm(q.title)||'general';let card=topics.get(key);
  if(!card){card={id:'topic:'+key,kind:'speaking',part:1,title:q.title||'General',question:q.title||'General',questions:[],logic:{stance:'先直接回答，再补理由与具体细节',chains:[]}};topics.set(key,card);cards.push(card)}
  if(!card.questions.some(x=>norm(x.question)===norm(q.question)))card.questions.push(q);
 }
 for(const card of topics.values()){
  const examples=card.questions.filter(q=>q.answer);
  card.answer=examples.map(q=>q.question+'\n\n'+q.answer).join('\n\n');
  card.answerSource=examples[0]?.answerSource||'';
  card.logic.chains=['每个问题用两到四句话回答，先回应所问内容，再解释原因或补充例子。','同一话题的问题分开回答；不要把整张卡合成 Part 2 式的独白。'];
 }
 return cards;
 }
 function logicText(logic){return [logic?.stance,...(logic?.chains||[]).map(c=>typeof c==='string'?c:[c.title,c.steps.join(' → '),'例子：'+c.example,...(c.expressions||[]).map(e=>e.en+' — '+e.zh),c.paragraph||''].filter(Boolean).join('\n'))].filter(Boolean).join('\n')}
 function review(q,answer,ideas){return `请核对这道雅思${q.kind==='writing'?'Writing Task 2':'Speaking Part '+q.part}题目及回答。先检查题面是否完整、提问要求是否矛盾，不要假定它是官方真题。再检查回答是否逐项回应题目、逻辑是否成立和语言是否自然。保留原意，分别列出明确错误（原文→修正及原因）、最小修改版、可选建议。最小修改版只改明确错误，不做风格改写；正确句子保持原文。不得编造人物经历或遗漏原有细节。参考不是用户回答，不得将参考中出现的音量、人物等信息添加到用户答案。不得仅凭文字判断发音或给出精确总分。\n\n题目：${q.questions?q.questions.map((x,i)=>(i+1)+'. '+x.question).join('\n'):q.question}${q.cues?.length?'\n提示点：\n'+q.cues.join('\n'):''}\n\n${ideas!==undefined?'我的逻辑链：\n'+(ideas||'（尚未填写）')+'\n\n参考逻辑链（不是我的观点）：':'参考逻辑链（不是我的观点）：'}\n${logicText(q.logic)}\n\n我的回答：\n${answer||'（尚未作答，请先核对题目与逻辑链）'}`}
 function planPrompt(q,ideas){return `请根据这道雅思写作题补全学习者的中文逻辑链。保留学习者的立场、合理想法和个人例子，不要替换成另一种观点。每条逻辑链只写一段话，用 → 串联3–5个简短环节，尽量控制在120个中文字以内。不要编号、不要分条解释、不要写成长篇段落。保留必要条件、原因、直接结果与结论，避免推理跳步。区分学习者原有想法与新增建议，保留部分同意等限定。默认只输出一句立场与1–2条逻辑链，不主动展开例子、表达或范文；若用户要求假设例子则使用第三人称并明确标注，不能冒充用户亲身经历。说明使用简体中文。\n\n题目：${q.question}\n\n我的思路：\n${ideas||'（尚未填写）'}`}

 const api={norm,unique,slots,fill,draw,imports,review,speakingCards,logicText,planPrompt};if(typeof module!=='undefined')module.exports=api;else root.Core=api;
})(typeof window!=='undefined'?window:globalThis);
