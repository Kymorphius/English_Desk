const panelAppearanceKey='english-desk-panel-background';
const panelIsMac=window.desktop?.platform==='darwin';
const panelBackgrounds=panelIsMac?['clear','soft','glass']:['clear','soft'];
let panelBackground=panelIsMac?'glass':'clear';
try{const saved=localStorage.getItem(panelAppearanceKey);if(panelBackgrounds.includes(saved))panelBackground=saved}catch{}
document.documentElement.dataset.panelBackground=panelBackground;
function appearanceSettings(){
 const box=document.createElement('section');box.className='section';
 box.innerHTML='<h2>面板外观</h2><label>面板背景<select id="panelBackground"><option value="clear">清晰背景（不透明）</option><option value="soft">轻微透明</option>'+(panelIsMac?'<option value="glass">磨砂玻璃</option>':'')+'</select></label><p class="muted">看不清文字时请选择清晰背景。切换后立即生效并自动保存。</p><p id="appearanceStatus" role="status"></p>';
 document.querySelector('#workspace').prepend(box);
 const select=box.querySelector('select');select.value=panelBackground;
 select.onchange=()=>{if(!panelBackgrounds.includes(select.value))return;panelBackground=select.value;document.documentElement.dataset.panelBackground=panelBackground;try{localStorage.setItem(panelAppearanceKey,panelBackground);box.querySelector('#appearanceStatus').textContent='已保存'}catch{box.querySelector('#appearanceStatus').textContent='已应用，但无法保存。下次启动将使用默认背景。'}};
}
