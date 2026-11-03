'use strict';
// Each question owns its draft and temporary audio, even within one topic card.
const part1Clips=new Map();
let part1Starting=false;
function renderPart1(card){
 $('#question-view').innerHTML=`<article class="question"><div class="eyebrow"><span>Speaking · Part 1</span><button id="copyQuestion" class="quiet">复制整张话题卡</button></div><h2 class="topic-title">${esc(card.title)}</h2><ol class="topic-questions">${card.questions.map(q=>`<li data-question-id="${esc(q.id)}"><div class="question-text">${esc(q.question)}</div><details class="question-practice"><summary>录音与作答</summary><details class="reference-logic"><summary>我的逻辑链与结构</summary>${editableLogic(q)}</details><textarea data-role="draft" aria-label="${esc(q.question)} 我的回答" placeholder="这道题的回答">${esc(state.drafts[q.id]||'')}</textarea><div class="tools audio-tools"><button data-action="record">开始录音</button><button data-action="transcribe" disabled>录音转文字</button><button data-action="export" disabled>导出录音</button><button data-action="speak">朗读我的回答</button><button data-action="stop">停止朗读</button></div><small data-role="status">录音仅保留在本次打开期间，可单独导出。</small><audio data-role="audio" controls hidden></audio><div class="tools"><button data-action="copy">复制到 AI 核对</button><button data-action="review">提交</button></div><div data-role="result" class="result" aria-live="polite"></div></details><details class="sample question-reference"><summary>参考回答</summary><div data-role="reference-answer"></div></details></li>`).join('')}</ol></article>`;
 bindLogicEditors($('#question-view'));
 $('#copyQuestion').onclick=()=>copy(card.title+'\n'+card.questions.map((q,i)=>(i+1)+'. '+q.question).join('\n'));
 document.querySelectorAll('[data-question-id]').forEach(root=>{
  const q=card.questions.find(q=>q.id===root.dataset.questionId),get=role=>root.querySelector(`[data-role="${role}"]`),button=action=>root.querySelector(`[data-action="${action}"]`);
  get('draft').oninput=()=>{state.drafts[q.id]=get('draft').value;save()};
  button('record').onclick=()=>recordPart1(q,root);button('export').onclick=async()=>{const clip=part1Clips.get(q.id);if(!clip)return;if(window.desktop){if(await desktop.saveRecording(Array.from(new Uint8Array(await clip.blob.arrayBuffer()))))toast('本题录音已导出')}else download(clip.blob,q.id+'.webm')};
  button('copy').onclick=()=>copy(Core.review(questionWithLogic(q),state.drafts[q.id]||''));
  button('speak').onclick=()=>speak(state.drafts[q.id]||'');button('stop').onclick=stopSpeech;
  bindPart1Reference(q,get('reference-answer'));
  button('review').onclick=async()=>{if(apiBusy||!apiReady())return;apiBusy=true;button('review').disabled=true;get('result').textContent='正在生成并校验，失败最多重试一次…';try{get('result').textContent=await desktop.ai({config,task:'review',prompt:Core.review(questionWithLogic(q),state.drafts[q.id]||'')})}catch(e){get('result').textContent=e.message}finally{apiBusy=false;button('review').disabled=false}};
  button('transcribe').onclick=async()=>{
   const clip=part1Clips.get(q.id);if(!clip||apiBusy||!apiReady())return;
   if(!await confirmAction('将本题录音发送到设置中的服务进行转写？'))return;
   apiBusy=true;button('transcribe').disabled=true;
   try{const text=await desktop.ai({config,task:'transcribe',audio:Array.from(new Uint8Array(await clip.blob.arrayBuffer()))});state.drafts[q.id]=[state.drafts[q.id]||'',text].filter(Boolean).join('\n');save();get('draft').value=state.drafts[q.id];toast('转写已追加到这道题的回答')}catch(e){toast(e.message)}finally{apiBusy=false;button('transcribe').disabled=false}
  };
  decorateAudioControls(root);syncPart1(q,root);
 });
}
function syncPart1(q,root){const clip=part1Clips.get(q.id);root.querySelector('[data-action="transcribe"]').disabled=!clip;root.querySelector('[data-action="export"]').disabled=!clip;const audio=root.querySelector('audio');audio.hidden=!clip;if(clip){audio.src=clip.url;setAudioIcon(root.querySelector('[data-action="record"]'),'mic','重新录音')}}
async function recordPart1(q,root){
 if(part1Starting)return;
 if(recorder?.state==='recording'){if(recordingQuestion===q.id)stopRecording();else toast('请先停止上一道题的录音');return}
 part1Starting=true;let localStream;
 try{
  localStream=await navigator.mediaDevices.getUserMedia({audio:true});stream=localStream;
  const r=new MediaRecorder(localStream,MediaRecorder.isTypeSupported('audio/webm;codecs=opus')?{mimeType:'audio/webm;codecs=opus'}:{});recorder=r;recordingQuestion=q.id;const chunks=[];
  const status=root.querySelector('[data-role="status"]'),button=root.querySelector('[data-action="record"]');
  r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  r.onstop=()=>{clearInterval(recordTimer);localStream.getTracks().forEach(t=>t.stop());const previous=part1Clips.get(q.id);if(previous)URL.revokeObjectURL(previous.url);const blob=new Blob(chunks,{type:r.mimeType});part1Clips.set(q.id,{blob,url:URL.createObjectURL(blob)});syncPart1(q,root);status.textContent='本题录音已完成，可回放、转写或导出。'};
  r.start();recordStart=Date.now();setAudioIcon(button,'stop','停止录音');status.textContent='正在录音…';root.querySelector('audio').hidden=true;root.querySelector('[data-action="transcribe"]').disabled=true;root.querySelector('[data-action="export"]').disabled=true;
  recordTimer=setInterval(()=>{const seconds=Math.floor((Date.now()-recordStart)/1000);status.textContent=`正在录音 · ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;if(seconds>=600)stopRecording()},500);
 }catch(e){localStream?.getTracks().forEach(t=>t.stop());toast('无法使用麦克风：'+e.message)}finally{part1Starting=false}
}

function bindPart1Reference(q,box){
 const answer=()=>state.referenceAnswers?.[q.id]??q.answer??'';
 function display(){
  const text=answer();
  box.innerHTML=`${text?`<p class="answer">${esc(text)}</p>`:'<p class="muted">暂未添加参考回答，可点击下方按钮填写。</p>'}<div class="tools"><button data-action="edit-reference">${text?'编辑参考回答':'添加参考回答'}</button>${text?'<button data-action="read-reference">朗读参考</button>':''}${Object.hasOwn(state.referenceAnswers||{},q.id)?'<button data-action="reset-reference">恢复默认</button>':''}</div>`;
  box.querySelector('[data-action="edit-reference"]').onclick=edit;
  const read=box.querySelector('[data-action="read-reference"]');if(read)read.onclick=()=>speak(answer());
  const reset=box.querySelector('[data-action="reset-reference"]');if(reset)reset.onclick=async()=>{if(await confirmAction('恢复这道题的默认参考回答？你的修改将被替换。')){stopSpeech();delete state.referenceAnswers[q.id];save();display()}};
 }
 function edit(){
  stopSpeech();
  box.innerHTML=`<textarea data-role="reference-editor" aria-label="参考回答" placeholder="填写这道题的参考回答">${esc(answer())}</textarea><div class="foot"><small>修改自动保存在本机，仅用于这道题</small><button data-action="finish-reference">完成编辑</button></div>`;
  box.querySelector('textarea').oninput=e=>{state.referenceAnswers??={};state.referenceAnswers[q.id]=e.target.value;save()};
  box.querySelector('[data-action="finish-reference"]').onclick=display;
 }
 display();
}
