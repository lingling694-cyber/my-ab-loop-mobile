import { PlayerCore } from './player-core.js';
import { CONFIG } from './constants.js';
import { registerPwa } from './pwa.js';
import { setupPresentation } from './presentation.js';
const $ = id => document.getElementById(id);
Object.assign($('rate'), { min: CONFIG.minRate, max: CONFIG.maxRate, step: CONFIG.rateStep, value: CONFIG.initialRate });
export const core = new PlayerCore($('video-mount'));
setupPresentation(core);
let latest, dirty = true, displayedMode, displayedTarget;
core.subscribe(state => { latest = state; dirty = true; });
$('file').addEventListener('change',()=>{ core.load($('file').files[0]); $('file').value=''; });
$('play').onclick=()=>core.play(); $('pause').onclick=()=>core.pause();
$('seek').onclick=()=>core.seek(Number($('seek-time').value));
$('set-a').onclick=()=>core.setEndpoint('start'); $('set-b').onclick=()=>core.setEndpoint('end');
$('a').onchange=()=>core.setEndpoint('start',$('a').value===''?NaN:Number($('a').value));
$('b').onchange=()=>core.setEndpoint('end',$('b').value===''?NaN:Number($('b').value));
$('rate').oninput=()=>core.rate(Number($('rate').value));
$('enable').onclick=()=>{ if(core.enable($('mode').value,Number($('target').value)) && latest.phase!=='fault') core.play(); };
$('disable').onclick=()=>core.disable();
setInterval(()=>{
 if(!dirty)return;dirty=false;
 $('file-name').textContent=latest.fileName||'尚未选择视频';
 $('position').textContent=latest.currentTime.toFixed(3)+' / '+(latest.duration?.toFixed(3)??'—')+' 秒';
 $('rate-value').textContent=latest.playbackRate.toFixed(2)+'×';
 if(document.activeElement!==$('rate'))$('rate').value=latest.playbackRate;
 for(const [id,key] of [['a','start'],['b','end']])if(document.activeElement!==$(id))$(id).value=latest.region[key]??'';
 if(displayedMode!==latest.mode){$('mode').value=latest.mode;displayedMode=latest.mode;}
 if(displayedTarget!==latest.target){$('target').value=latest.target??'';displayedTarget=latest.target;}
 $('loop-status').textContent=latest.phase+' · 已完成 '+latest.completed+' 次';
 $('error').textContent=latest.error??'';
 $('debug').textContent=JSON.stringify({...latest,transitionGuard:['positioning','returning'].includes(latest.phase)},null,2);
},CONFIG.uiIntervalSeconds*1000);
// Visibility policy is owned by the display controller, which reads native PiP state.
// Preserve the live File, object URL and practice state when entering page cache.
// WebKit: https://webkit.org/blog/516/webkit-page-cache-ii-the-unload-event/
window.addEventListener('pagehide',event=>{
 if(event.persisted){ if(core.video)core.pause(); }
 else core.dispose();
});
window.addEventListener('pageshow',event=>{if(event.persisted)dirty=true;});
void registerPwa($('pwa-status'));
