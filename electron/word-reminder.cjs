const fs=require('node:fs/promises');
const normalize=p=>{if(typeof p?.enabled!=='boolean'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(p.time))throw Error('请选择有效的提醒时间');return {enabled:p.enabled,time:p.time,lastDay:p.lastDay||''}};
const dateKey=d=>`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
const shouldNotify=(p,d)=>p.enabled&&p.lastDay!==dateKey(d)&&p.time===`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
function createReminder(file,notify){let pref={enabled:false,time:'20:00',lastDay:''};let busy=false;
 return {async load(){try{pref=normalize(JSON.parse(await fs.readFile(file,'utf8')))}catch{}},get(){return {...pref}},async set(p){const next={...normalize(p),lastDay:pref.lastDay};await fs.writeFile(file,JSON.stringify(next));pref=next;return {...pref}},async tick(d=new Date()){if(busy||!shouldNotify(pref,d))return;busy=true;try{if(await notify()){pref.lastDay=dateKey(d);await fs.writeFile(file,JSON.stringify(pref))}}finally{busy=false}}};
}
module.exports={normalize,shouldNotify,createReminder};
