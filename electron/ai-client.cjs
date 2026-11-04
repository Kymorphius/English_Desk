'use strict';
const {runWorkflow}=require('./ai-workflow.cjs');
const prompts=require('./prompts.cjs');
const localModels=['qwen3.5:4b','qwen3:8b','qwen3.5:9b','qwen3:0.6b'];
function permanent(message){return Object.assign(Error(message),{retryable:false})}
async function ai({config,task,prompt,audio},onStage){
 const base=(config.base_url||'https://api.openai.com/v1').replace(/\/+$/,'');const url=new URL(base);
 if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)))throw permanent('接口需使用 HTTPS；本地服务可使用 HTTP');
 if(url.username||url.password||url.search||url.hash)throw permanent('base_url 不能包含账号、参数或片段');
 const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname)&&url.port==='11434'&&localModels.includes(config.model);
 const headers={};if(config.api_key)headers.Authorization=`Bearer ${config.api_key}`;
 async function request(endpoint,body,json=true){
  let response;try{response=await fetch(endpoint,{method:'POST',headers:json?{...headers,'Content-Type':'application/json'}:headers,body:json?JSON.stringify(body):body,redirect:'error',signal:AbortSignal.timeout(local?180000:90000)})}catch(e){throw Error(local?'无法连接本地 Ollama 或请求超时。请检查部署，也可使用 API 或复制到大模型。':'请求失败或超时，请检查服务连接。')}
  if(!response.ok){if(local&&response.status===404)throw permanent('本地未部署所选模型，请先部署；也可使用 API 或复制到大模型。');const error=Error(`接口返回 ${response.status}，请检查地址、密钥、模型和额度。`);error.retryable=response.status===429||response.status>=500;throw error}
  return response.json();
 }
 if(task==='models'){
  let response;try{response=await fetch(base+'/models',{headers,redirect:'error',signal:AbortSignal.timeout(20000)})}catch{throw Error('无法获取模型列表，请检查地址和网络。')}
  if(!response.ok)throw permanent(`接口返回 ${response.status}，无法获取模型列表。请检查地址和密钥，或手动填写模型。`);
  const data=await response.json().catch(()=>null);const list=Array.isArray(data?.data)?data.data:Array.isArray(data?.models)?data.models:null;
  if(!list)throw permanent('该服务没有提供模型列表，请手动填写模型。');
  return [...new Set(list.map(m=>typeof m==='string'?m:m?.id||m?.name).filter(id=>typeof id==='string'&&id&&id.length<200))].slice(0,1000);
 }
 if(task==='transcribe'){
  if(local)throw permanent('所选 Qwen 模型不支持录音转写。请配置转写服务。');
  if(!audio?.length||audio.length>30e6)throw permanent('录音为空或超过 30 MB');
  const body=new FormData();body.append('file',new Blob([Uint8Array.from(audio)],{type:'audio/webm'}),'practice.webm');body.append('model',config.transcription_model||'whisper-1');body.append('language','en');
  const data=await request(base+'/audio/transcriptions',body,false);if(typeof data.text!=='string')throw Error('接口未返回转写文字');return data.text;
 }
 const input=String(prompt??'');if(input.length>(local?6000:24000))throw permanent('内容过长，请分段提交或复制到大模型。');
 const generate=async(messages,stage)=>{
  const data=local?await request(url.origin+'/api/chat',{model:config.model,messages,think:false,stream:false,options:{num_ctx:8192,num_predict:stage==='validate'?384:1024,temperature:stage==='validate'?0:0.4}}):await request(base+'/chat/completions',{model:config.model||'gpt-4o-mini',messages});
  if(data.done_reason==='length'||data.choices?.[0]?.finish_reason==='length')throw Error('模型输出被长度限制截断');
  const output=local?data.message?.content:data.choices?.[0]?.message?.content;if(typeof output!=='string'||!output.trim())throw Error('接口没有返回有效文本');return output;
 };
 if(task==='probe')return generate([{role:'user',content:'Reply with exactly: Ready'}],'validate');
 if(task==='example'||task==='explain')return generate([{role:'system',content:prompts[task]},{role:'user',content:input}],'generate'); // checked in the page: it must parse and use the collocation
 return runWorkflow({prompt:input,task,generate,onStage});
}
module.exports={ai};
