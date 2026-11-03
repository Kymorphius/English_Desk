'use strict';
const RELEASES='https://github.com/Vienky/English_Desk/releases/latest';
function newer(tag,current){const parse=v=>/^v?(\d+)\.(\d+)\.(\d+)$/.exec(v)?.slice(1).map(Number);const a=parse(tag),b=parse(current);if(!a||!b)return false;for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i]}return false}
function createUpdates({platform,version,isPackaged,engine,fetchRelease,openDownload,beforeInstall,loadPreference=async()=>true,savePreference=async()=>{},onChange=()=>{}}){
 let state={version,enabled:true,phase:'idle',latest:'',percent:0,message:'尚未检查更新',canInstall:platform==='win32'&&isPackaged};let checking=false,downloading=false;
 const snapshot=()=>({...state});const set=patch=>{state={...state,...patch};onChange(snapshot());return snapshot()};
 const fail=()=>set({phase:'error',message:'更新检查或下载失败，请重试，或从 Releases 下载。'});
 if(engine){engine.autoDownload=false;engine.autoInstallOnAppQuit=false;engine.allowPrerelease=false;engine.allowDowngrade=false;
  engine.on('update-available',info=>{set({phase:'available',latest:info.version,message:'发现新版本 '+info.version});if(state.enabled)void download()});
  engine.on('update-not-available',()=>set({phase:'current',message:'已是最新版本'}));
  engine.on('download-progress',p=>set({phase:'downloading',percent:Math.round(p.percent),message:'正在下载更新 '+Math.round(p.percent)+'%'}));
  engine.on('update-downloaded',info=>set({phase:'ready',latest:info.version,percent:100,message:'更新已下载，点击重启安装。'}));
  engine.on('error',fail);
 }
 async function check(automatic=false){
  if(checking||downloading||state.phase==='ready'||(automatic&&!state.enabled))return snapshot();
  if(!isPackaged)return set({phase:'error',message:'开发预览不安装更新，请使用正式安装包。'});
  checking=true;set({phase:'checking',message:'正在检查更新…'});
  try{if(platform==='win32'){await engine.checkForUpdates()}else{const r=await fetchRelease();if(typeof r?.tag_name!=='string'||!Array.isArray(r.assets)||r.draft||r.prerelease)throw Error('Invalid release');if(newer(r.tag_name,version)&&r.assets.some(a=>String(a.name).endsWith('.dmg')))set({phase:'available',latest:r.tag_name.replace(/^v/,''),message:'发现新版本 '+r.tag_name+'，下载后拖入应用程序文件夹替换。'});else set({phase:'current',message:'已是最新版本'});}}
  catch{fail()}finally{checking=false}return snapshot();
 }
 async function download(){if(downloading||!['available','error'].includes(state.phase)||!state.latest)return snapshot();
  if(platform!=='win32'){await openDownload(RELEASES);return snapshot()}
  downloading=true;set({phase:'downloading',percent:0,message:'正在下载更新…'});try{await engine.downloadUpdate()}catch{fail()}finally{downloading=false}return snapshot();
 }
 return {snapshot,check,download,async init(){try{state.enabled=(await loadPreference())!==false}catch{}return snapshot()},async setEnabled(enabled){if(typeof enabled!=='boolean')throw Error('无效的更新设置');await savePreference(enabled);set({enabled});if(enabled)void check(true);return snapshot()},install(){if(!state.canInstall||state.phase!=='ready')throw Error('尚无可安装的更新');beforeInstall();engine.quitAndInstall(false,true)},openRelease:()=>openDownload(RELEASES)};
}
module.exports={createUpdates,newer};
