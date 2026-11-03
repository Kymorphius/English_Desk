'use strict';
// Fixed loopback target and model: renderer cannot trigger arbitrary downloads.
const MODELS=['qwen3.5:4b','qwen3:8b','qwen3.5:9b'],ORIGIN='http://127.0.0.1:11434';
let state={phase:'idle',message:'尚未下载',percent:0};
const snapshot=()=>({...state});
async function start(model){
 if(!MODELS.includes(model))throw Error('请选择支持的本地模型');
 if(state.phase==='downloading')return snapshot();
 try{
  const res=await fetch(ORIGIN+'/api/tags',{signal:AbortSignal.timeout(3000)});if(!res.ok)throw Error();
  const data=await res.json();if(data.models?.some(m=>m.name===model)){state={phase:'ready',message:'模型已下载，可直接使用',percent:100};return snapshot()}
 }catch{throw Error('请先安装并启动 Ollama，再下载本地模型。')}
 state={phase:'downloading',message:'正在下载 '+model,percent:0,model};
 void pull(model);return snapshot();
}
async function pull(model){
 try{
  const response=await fetch(ORIGIN+'/api/pull',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model,stream:true}),signal:AbortSignal.timeout(30*60*1000)});
  if(!response.ok)throw Error(`下载返回 ${response.status}`);
  let pending='';const decoder=new TextDecoder();
  function update(line){if(!line.trim())return;const event=JSON.parse(line);if(event.error)throw Error(event.error);if(event.status==='success')state={phase:'ready',message:'下载完成，可切换到 '+model,percent:100};else{const percent=event.total?Math.floor((event.completed||0)/event.total*100):state.percent;state={phase:'downloading',message:event.total?`正在下载模型 · ${percent}%`:'正在准备或校验模型…',percent}}}
  for await(const chunk of response.body){pending+=decoder.decode(chunk,{stream:true});const lines=pending.split('\n');pending=lines.pop();for(const line of lines)update(line)}
  pending+=decoder.decode();update(pending);if(state.phase!=='ready')throw Error('下载未完成，请重试');
 }catch(e){state={phase:'error',message:'下载失败：'+e.message,percent:0}}
}
module.exports={start,snapshot};
