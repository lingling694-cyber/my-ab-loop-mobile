// Independent recorder. No production imports, setters, or player-state reads.
export class Observer {
  constructor(video, sink) {
    this.video = video; this.sink = sink; this.alive = true; this.frame = null;
    this.handlers = [];
    for (const name of ['loadstart','loadedmetadata','durationchange','play','playing','pause','timeupdate','seeking','seeked','ratechange','waiting','stalled','ended','error','emptied']) {
      const fn = () => this.record(name); video.addEventListener(name, fn); this.handlers.push([name, fn]);
    }
    this.visibility = () => this.record('visibilitychange');
    document.addEventListener('visibilitychange', this.visibility);
    this.record('attach'); this.schedule();
  }
  record(event, metadata = null) {
    const v = this.video;
    this.sink(Object.freeze({ event, at: performance.now()/1000, position: v.currentTime,
      duration: Number.isFinite(v.duration) ? v.duration : null, rate: v.playbackRate,
      paused: v.paused, seeking: v.seeking, ended: v.ended, readyState: v.readyState,
      error: v.error ? { code: v.error.code, message: v.error.message } : null,
      visible: document.visibilityState, frameTime: metadata?.mediaTime ?? null,
      presentedFrames: metadata?.presentedFrames ?? null,
      expectedDisplayAt: metadata ? metadata.expectedDisplayTime/1000 : null }));
  }
  schedule() {
    if (!this.video.requestVideoFrameCallback || !this.alive) return;
    this.frame = this.video.requestVideoFrameCallback((_now, metadata) => {
      if (!this.alive) return;
      this.record('frame', metadata); this.schedule();
    });
  }
  stop() {
    this.alive = false;
    if (this.frame !== null) this.video.cancelVideoFrameCallback(this.frame);
    for (const [name, fn] of this.handlers) this.video.removeEventListener(name, fn);
    document.removeEventListener('visibilitychange', this.visibility);
  }
}
