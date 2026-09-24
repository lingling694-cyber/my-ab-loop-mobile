// A fresh element per resource isolates queued DOM events as well as promise continuations.
export class MediaResource {
  constructor(mount) { this.mount = mount; this.video = null; this.url = null; }
  release() {
    if (this.video) { this.video.pause(); this.video.removeAttribute('src'); this.video.load(); this.video.remove(); }
    if (this.url) URL.revokeObjectURL(this.url);
    this.video = null; this.url = null;
  }
  prepare(file) {
    this.release();
    const video = document.createElement('video');
    video.playsInline = true; video.preload = 'metadata'; video.controls = false;
    video.setAttribute('aria-label', '本地练习视频');
    this.video = video; this.url = URL.createObjectURL(file); this.mount.replaceChildren(video);
    return video;
  }
  load() { this.video.src = this.url; this.video.load(); }
}
