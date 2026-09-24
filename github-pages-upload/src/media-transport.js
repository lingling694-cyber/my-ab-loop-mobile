import { CONFIG } from './constants.js';
import { seekableAt } from './region.js';
export class Transport {
  constructor(video, state, active) { this.video = video; this.state = state; this.active = active; this.playTicket = 0; }
  snapshot() {
    if (!this.active()) return;
    const v = this.video;
    this.state.patch({ currentTime: v.currentTime, duration: Number.isFinite(v.duration) ? v.duration : null,
      paused: v.paused, seeking: v.seeking, ended: v.ended, readyState: v.readyState, playbackRate: v.playbackRate });
  }
  play() {
    const ticket = ++this.playTicket;
    this.state.patch({ pending: 'play', error: null });
    // Invoke directly in the user event; do not defer until metadata/seeked.
    return this.video.play().then(() => {
      if (this.active() && ticket === this.playTicket) { this.state.patch({ pending: null }); this.snapshot(); }
    }, error => {
      if (this.active() && ticket === this.playTicket) this.state.patch({ pending: null, error: `${error.name}: ${error.message}` });
    });
  }
  pause() { ++this.playTicket; this.video.pause(); this.state.patch({ pending: null }); this.snapshot(); }
  seek(time) {
    if (!Number.isFinite(time) || !seekableAt(this.video, time)) throw new Error('目标位置尚不可跳转；请等待媒体就绪。');
    this.video.currentTime = time;
  }
  rate(value) {
    const step = (value - CONFIG.minRate) / CONFIG.rateStep;
    if (!Number.isFinite(value) || value < CONFIG.minRate || value > CONFIG.maxRate || Math.abs(step - Math.round(step)) > 1e-8)
      throw new Error('倍速必须为 0.25–2.00，步长 0.05。');
    this.video.playbackRate = value; this.snapshot();
  }
}
