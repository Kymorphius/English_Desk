const {test}=require('node:test');const assert=require('node:assert/strict');
test('fixed local model download handles progress, completion and connection failure',async()=>{
 const original=global.fetch;try{
  const load=()=>{delete require.cache[require.resolve('../electron/local-model.cjs')];return require('../electron/local-model.cjs')};
  const calls=[];global.fetch=async(url,options)=>{calls.push([url,options]);if(url.endsWith('/api/tags'))return {ok:true,json:async()=>({models:[]})};return {ok:true,body:(async function*(){yield Buffer.from('{"status":"pulling","total":100,"completed":50}\n{"status":"success"}\n')})()}};
  const m=load();assert.equal((await m.start('qwen3.5:4b')).phase,'downloading');await new Promise(r=>setImmediate(r));assert.equal(m.snapshot().phase,'ready');assert.equal(JSON.parse(calls[1][1].body).model,'qwen3.5:4b');assert.ok(calls.every(([url])=>url.startsWith('http://127.0.0.1:11434/')));
  global.fetch=async()=>{throw Error('offline')};await assert.rejects(load().start('qwen3.5:4b'),/安装并启动 Ollama/);
 }finally{global.fetch=original}
});
