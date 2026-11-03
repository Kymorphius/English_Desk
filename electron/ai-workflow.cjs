'use strict';
const prompts=require('./prompts.cjs');
function verdict(text){
 const clean=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');let value;try{value=JSON.parse(clean)}catch{throw Error('校验结果格式无效')}
 if(typeof value.passed!=='boolean'||!Array.isArray(value.issues)||value.issues.some(x=>typeof x!=='string'))throw Error('校验结果格式无效');
 return value;
}
async function runWorkflow({prompt,task='review',generate,onStage=()=>{}}){
 let issues='';
 for(let attempt=0;attempt<2;attempt++){
  try{
   onStage(attempt?'重试生成':'生成');
   const output=await generate([{role:'system',content:(task==='plan'?prompts.plan:prompts.review)+' 在保持内容完整的前提下简洁作答。'},{role:'user',content:prompt+(issues?'\n\n上一轮未通过，请修正以下问题：\n'+issues:'')}],'generate');
   if(typeof output!=='string'||!output.trim())throw Error('生成结果为空');
   onStage('校验');
   const check=verdict(await generate([{role:'system',content:prompts.validate},{role:'user',content:JSON.stringify({original_request:prompt,candidate:output})}],'validate'));
   if(!check.passed||check.issues.length)throw Error(check.issues.join('；')||'内容未通过自动校验');
   onStage('输出');return output;
  }catch(error){
   if(error.retryable===false)throw error;
   issues=error.message;
   if(attempt===1)throw Error('生成或校验未通过（已重试一次）：'+issues+'。请改用 API，或复制到大模型中核对。');
  }
 }
}
module.exports={runWorkflow,verdict};
