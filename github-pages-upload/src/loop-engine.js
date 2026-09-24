import { validRegion } from './region.js';
import { secondsNow } from './constants.js';
export class LoopEngine {
  constructor(video, transport, state, practice) {
    Object.assign(this, { video, transport, state, practice });
    this.frameId = null; this.epoch = 0; this.disposed = false;
    this.listeners = [];
    for (const event of ['timeupdate', 'seeked', 'ended', 'playing']) {
      const fn = () => event === 'seeked' ? this.settle() : this.observe(event);
      video.addEventListener(event, fn); this.listeners.push([event, fn]);
    }
    this.onSeeking = () => {
      if (this.state.get().phase === 'armed') this.suspend();
    };
    video.addEventListener('seeking', this.onSeeking);
    this.schedule();
  }
  renew() {
    this.epoch++;
    if (this.frameId !== null && this.video.cancelVideoFrameCallback) this.video.cancelVideoFrameCallback(this.frameId);
    this.frameId = null; this.schedule();
  }
  schedule() {
    if (this.disposed || !this.video.requestVideoFrameCallback || this.frameId !== null) return;
    const epoch = this.epoch;
    this.frameId = this.video.requestVideoFrameCallback((_now, meta) => {
      if (this.disposed || epoch !== this.epoch) return;
      this.frameId = null;
      this.state.patch({ frameMediaTime: meta.mediaTime });
      this.observe('frame', meta.mediaTime); this.schedule();
    });
  }
  start() {
    const s = this.state.get();
    if (!validRegion(s.region, this.video.duration)) throw new Error('请先设置有效的 A < B，且不超过视频时长。');
    this.state.patch({ completed: 0, phase: 'positioning', error: null });
    this.position();
  }
  position() {
    this.renew();
    this.state.patch({ operation: this.state.get().operation + 1, pending: 'seek' });
    try { this.transport.seek(this.state.get().region.start); }
    catch (error) { this.fault(error.message); }
  }
  settle() {
    const s = this.state.get(), v = this.video;
    if (!['positioning', 'returning'].includes(s.phase) || v.seeking) return;
    this.state.patch({ lastSeek: { position: v.currentTime, target: s.region.start, at: secondsNow() }, pending: null });
    // No accuracy tolerance is inferred. A wrong landing is reported independently.
    if (!(v.currentTime >= s.region.start && v.currentTime < s.region.end)) {
      this.fault('跳转后位置不在 Region 内；已停止循环，没有自动重试。'); return;
    }
    this.state.patch({ phase: 'armed' }); this.renew();
  }
  observe(source, frameMediaTime = null) {
    const s = this.state.get(), v = this.video;
    if (s.phase !== 'armed' || v.seeking || (v.paused && source !== 'ended')) return;
    // Live timeline is the decision input; frame timestamp remains a separate diagnostic.
    if (v.currentTime < s.region.end) return;
    this.state.patch({ phase: 'returning', lastBoundary: { source, position: v.currentTime, frameMediaTime, target: s.region.end, at: secondsNow() } });
    if (this.practice.completePass()) {
      this.state.patch({ phase: 'complete' }); this.transport.pause(); this.renew(); return;
    }
    const ended = v.ended;
    this.position();
    if (ended && this.state.get().phase !== 'fault') void this.transport.play();
  }
  disable() { this.state.patch({ phase: 'disabled' }); this.renew(); }
  suspend() { this.state.patch({ phase: 'suspended', completed: 0 }); this.renew(); }
  fault(message) { this.state.patch({ phase: 'fault', pending: null, error: message }); this.transport.pause(); this.renew(); }
  dispose() {
    this.disposed = true; this.epoch++;
    if (this.frameId !== null && this.video.cancelVideoFrameCallback) this.video.cancelVideoFrameCallback(this.frameId);
    for (const [event, fn] of this.listeners) this.video.removeEventListener(event, fn);
    this.video.removeEventListener('seeking', this.onSeeking);
  }
}
