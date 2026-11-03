'use strict';
function questionWithLogic(q){return state.logicEdits?.[q.id]?{...q,logic:state.logicEdits[q.id]}:q}
function logicText(chains){return (chains||[]).map(chain=>typeof chain==='string'?chain:[chain.title,(chain.steps||[]).join(' → '),chain.example?'具体例子\n'+chain.example:'',...(chain.expressions||[]).map(e=>e.en+'\n'+e.zh),chain.paragraph?'段落示范\n'+chain.paragraph:''].filter(Boolean).join('\n\n')).join('\n\n')}
function editableLogic(q){return `<div class="editable-logic" data-logic-id="${esc(q.id)}"></div>`}
function bindLogicEditors(root=document){
 root.querySelectorAll('[data-logic-id]').forEach(box=>{
  const q=[...BANK.writing,...allSpeaking].find(q=>q.id===box.dataset.logicId);if(!q)return;
  function display(){const logic=questionWithLogic(q).logic||{};box.innerHTML=`<div class="tools"><button data-edit-logic>编辑逻辑链与结构</button>${state.logicEdits?.[q.id]?'<button data-reset-logic>恢复默认</button>':''}</div><div class="stance">${esc(logic.stance||'暂无作答结构')}</div>${(logic.chains||[]).map(renderChain).join('')}`;box.querySelector('[data-edit-logic]').onclick=edit;const reset=box.querySelector('[data-reset-logic]');if(reset)reset.onclick=async()=>{if(await confirmAction('恢复这道题的默认逻辑链与结构？你的修改将被替换。')){delete state.logicEdits[q.id];save();display()}}}
  function edit(){const logic=questionWithLogic(q).logic||{};box.innerHTML=`<label>立场与作答结构<textarea data-logic-field="stance" aria-label="立场与作答结构" rows="3">${esc(logic.stance||'')}</textarea></label><label>逻辑链、例子与表达<textarea data-logic-field="chains" aria-label="逻辑链、例子与表达" rows="10">${esc(logicText(logic.chains))}</textarea></label><div class="foot"><small>修改自动保存在本机，仅用于这道题</small><button data-finish-logic>完成编辑</button></div>`;
   box.querySelectorAll('[data-logic-field]').forEach(field=>field.oninput=()=>{state.logicEdits??={};const next=structuredClone(questionWithLogic(q).logic||{stance:'',chains:[]});next[field.dataset.logicField]=field.dataset.logicField==='chains'?[field.value]:field.value;state.logicEdits[q.id]=next;save()});
   box.querySelector('[data-finish-logic]').onclick=display;
  }
  display();
 });
}
