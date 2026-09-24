import { Observer } from './observer.js';
import { summarize } from './report.js';
// Only the runner controls the public command API. Observer/report never receive it.
export class TestRunner {
  constructor(core, publish) {
    this.core = core; this.publish = publish; this.running = false; this.observer = null; this.report = null; this.resource = 0;
    core.onMedia(video => this.attach(video));
  }
  attach(video) {
    this.observer?.stop(); const resource = ++this.resource;
    this.observer = new Observer(video, row => {
      if (this.running) { this.records.push({ ...row, resource }); this.check(row); }
    });
  }
  start(testCase, environment, replacement = null) {
    if (this.running) throw new Error('测试已经运行。');
    const v = this.core.video;
    if (!v || !Number.isFinite(v.duration) || v.duration < testCase.region.end) throw new Error('请先载入足够长的视频（矩阵需要至少 14 秒）。');
    if (testCase.actions.some(a=>a.command==='replace') && !replacement) throw new Error('替换测试需要先选择第二个本地视频。');
    this.case = structuredClone(testCase); this.environment = { ...environment, userAgent: navigator.userAgent,
      standalone: matchMedia('(display-mode: standalone)').matches, frameCallback: !!v.requestVideoFrameCallback,
      startedAt: new Date().toISOString(), duration: v.duration, videoWidth: v.videoWidth, videoHeight: v.videoHeight };
    this.replacement = replacement; this.records = []; this.ledger = []; this.report = null;
    this.startAt = performance.now()/1000; this.executed = new Set(); this.expectedPauses = 0; this.running = true;
    this.command({ command: 'pause' }); this.core.disable();
    this.command({ command: 'endpoint', key: 'start', value: testCase.region.start });
    this.command({ command: 'endpoint', key: 'end', value: testCase.region.end });
    this.command({ command: 'rate', value: testCase.speed });
    this.ledger.push({ command: 'enable', at: performance.now()/1000 });
    if (!this.core.enable(testCase.mode, testCase.repeat)) { this.finish('setup-failed'); return; }
    this.command({ command: 'play' });
    // Execution limit only, never a media accuracy tolerance.
    const lowestRate = Math.min(testCase.speed, ...testCase.actions.filter(a=>a.command==='rate').map(a=>a.value));
    this.limit = testCase.stopAfter ?? testCase.repeat*(testCase.region.end-testCase.region.start)/lowestRate + 120;
    this.timer = setInterval(()=>this.tick(),100);
    this.publish({ running: true, caseId: testCase.id, elapsed: 0 });
  }
  command(action) {
    this.ledger.push({ ...action, at: performance.now()/1000 });
    if (action.command === 'pause' && this.core.video && !this.core.video.paused) this.expectedPauses++;
    if (action.command === 'endpoint') return this.core.setEndpoint(action.key, action.value);
    if (action.command === 'replace') return this.core.load(this.replacement);
    return this.core[action.command](action.value);
  }
  check(row) {
    if (row.event === 'error') queueMicrotask(()=>this.finish('media-error'));
    if (row.event === 'pause') {
      if (this.expectedPauses > 0) { this.expectedPauses--; return; }
      if (row.visible !== 'visible') { queueMicrotask(()=>this.finish('visibility-interrupted')); return; }
      if (!this.case.scenario && row.paused) queueMicrotask(()=>this.finish(row.position >= this.case.region.end ? 'natural-stop' : 'unexpected-stop'));
    }
  }
  tick() {
    if (!this.running) return;
    const elapsed = performance.now()/1000-this.startAt;
    this.case.actions.forEach((action,i) => {
      if (!this.executed.has(i) && elapsed>=action.at) { this.executed.add(i); this.command(action); }
    });
    this.publish({ running: true, caseId: this.case.id, elapsed });
    if (elapsed >= this.limit) this.finish(this.case.stopAfter ? 'scheduled-stop' : 'execution-limit');
  }
  finish(reason = 'cancelled') {
    if (!this.running) return;
    this.observer?.record('test-end'); this.running = false; clearInterval(this.timer);
    this.report = summarize(this.case, this.records, this.ledger, reason, this.environment);
    this.core.pause(); this.core.disable(); this.publish({ running: false, report: this.report });
  }
}
