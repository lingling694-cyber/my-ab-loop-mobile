import { core } from '../src/ui.js';
import { CONFIG } from '../src/constants.js';
import { CASES } from './test-cases.js';
import { TestRunner } from './test-runner.js';
const $=id=>document.getElementById(id);
let downloadUrl=null;
const runner = new TestRunner(core, update => {
 $('test-status').textContent = update.running ? update.caseId+' · '+update.elapsed.toFixed(1)+' 秒 · 运行中' : update.report.functional;
 $('export').disabled = !update.report; $('run-test').disabled = update.running;
 for (const id of ['file','play','pause','seek','rate','a','b','set-a','set-b','mode','target','enable','disable','test-case','replacement']) $(id).disabled=update.running;
 if(update.report){const {records,ledger,loops,...summary}=update.report;$('report').textContent=JSON.stringify({...summary,rawRecords:records.length,ledgerEntries:ledger.length},null,2);}
});
for(const c of CASES){const o=document.createElement('option');o.value=c.id;o.textContent=c.id+' · '+c.region.start+'–'+c.region.end+'s / '+c.speed+'×';$('test-case').append(o);}
$('run-test').onclick=()=>{
 try{runner.start(CASES.find(c=>c.id===$('test-case').value),{build:CONFIG.version,device:$('device').value,fixture:$('fixture').value},$('replacement').files[0]);}
 catch(error){$('test-status').textContent=error.message;}
};
$('stop-test').onclick=()=>runner.finish();
$('export').onclick=()=>{
 if(!runner.report)return;if(downloadUrl)URL.revokeObjectURL(downloadUrl);
 downloadUrl=URL.createObjectURL(new Blob([JSON.stringify(runner.report,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=downloadUrl;a.download='ab-loop-'+runner.report.case.id+'.json';a.click();
};
document.addEventListener('visibilitychange',()=>{if(document.hidden)runner.finish('visibility-interrupted');});
window.addEventListener('pagehide',()=>{runner.finish('pagehide');runner.observer?.stop();if(downloadUrl)URL.revokeObjectURL(downloadUrl);});
