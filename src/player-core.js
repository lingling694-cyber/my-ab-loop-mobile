import { createState, initialState } from './media-state.js';
import { MediaResource } from './media-resource.js';
import { Transport } from './media-transport.js';
import { LoopEngine } from './loop-engine.js';
import { PracticeSession } from './practice-session.js';
export class PlayerCore {
  constructor(mount) {
    this.state = createState(); this.resource = new MediaResource(mount); this.practice = new PracticeSession(this.state);
    this.cleanup = []; this.mediaListeners = new Set();
  }
  subscribe(fn) { return this.state.subscribe(fn); }
  onMedia(fn) { this.mediaListeners.add(fn); return () => this.mediaListeners.delete(fn); }
  get video() { return this.resource.video; }
  attempt(fn) {
    try { if (!this.video) throw new Error('请先选择本地视频。'); fn(); return true; }
    catch (error) { this.state.patch({ error: error.message }); return false; }
  }
  load(file) {
    if (!file) return false;
    this.loop?.dispose(); for (const off of this.cleanup) off(); this.cleanup = [];
    const generation = this.state.get().generation + 1;
    this.state.patch({ ...initialState(generation), resource: 'loading', fileName: file.name });
    try {
      const v = this.resource.prepare(file);
      this.transport = new Transport(v, this.state, () => this.video === v && this.state.get().generation === generation);
      this.loop = new LoopEngine(v, this.transport, this.state, this.practice);
      for (const event of ['loadedmetadata', 'durationchange', 'timeupdate', 'playing', 'pause', 'seeking', 'seeked', 'ratechange', 'ended', 'error', 'waiting']) {
        const fn = () => {
          this.transport.snapshot();
          if (event === 'loadedmetadata') this.state.patch({ resource: 'ready' });
          if (event === 'error') { this.loop.fault(`媒体错误 ${v.error?.code ?? ''}: ${v.error?.message ?? '无法解码此文件'}`); this.state.patch({ resource: 'error' }); }
        };
        v.addEventListener(event, fn); this.cleanup.push(() => v.removeEventListener(event, fn));
      }
      for (const fn of this.mediaListeners) fn(v);
      this.resource.load(); return true;
    } catch (error) { this.resource.release(); this.state.patch({ resource: 'error', error: error.message }); return false; }
  }
  play() { return this.attempt(() => { if (this.state.get().resource !== 'ready') throw new Error('视频尚未就绪。'); void this.transport.play(); }); }
  pause() { return this.attempt(() => this.transport.pause()); }
  seek(time) { return this.attempt(() => { this.loop.suspend(); this.transport.seek(time); }); }
  setEndpoint(key, value = this.video?.currentTime) {
    return this.attempt(() => {
      if (!['start', 'end'].includes(key) || !Number.isFinite(value) || value < 0 || value > this.video.duration || this.state.get().resource !== 'ready') throw new Error('端点超出范围或视频尚未就绪。');
      this.loop.suspend(); this.state.patch({ region: { ...this.state.get().region, [key]: value }, error: null });
    });
  }
  rate(value) { return this.attempt(() => this.transport.rate(value)); }
  enable(mode, target) { return this.attempt(() => { this.practice.configure(mode, target); this.loop.start(); }) && this.state.get().phase !== 'fault'; }
  disable() { return this.attempt(() => this.loop.disable()); }
  dispose() { this.loop?.dispose(); for (const off of this.cleanup) off(); this.state.patch(initialState(this.state.get().generation + 1)); this.resource.release(); }
}
