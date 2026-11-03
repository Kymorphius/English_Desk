'use strict';
function setAudioIcon(button,kind,label){
 const paths={mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',stop:'<rect x="6" y="6" width="12" height="12" rx="2"/>',transcribe:'<path d="M4 4h16M12 4v16M8 20h8M3 10v4M21 10v4"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',speaker:'<path d="m11 4-6 5H2v6h3l6 5zM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>',silent:'<path d="m11 4-6 5H2v6h3l6 5zM16 9l6 6m0-6-6 6"/>'};
 button.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[kind]}</svg>`;
 button.title=label;button.setAttribute('aria-label',label);button.classList.add('audio-icon');
}
function decorateAudioControls(root=document){
 const controls=[['#record, [data-action="record"]','mic','开始录音'],['#transcribe, [data-action="transcribe"]','transcribe','录音转文字'],['#saveAudio, [data-action="export"]','download','导出录音'],['#speak, [data-action="speak"]','speaker','朗读我的回答'],['#stopSpeech, [data-action="stop"]','silent','停止朗读']];
 for(const [selector,kind,label] of controls)root.querySelectorAll(selector).forEach(button=>setAudioIcon(button,kind,label));
}
