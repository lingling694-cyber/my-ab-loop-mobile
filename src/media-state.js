import { CONFIG } from './constants.js';
export function initialState(generation = 0) {
  return { generation, resource: 'empty', fileName: '', region: { start: null, end: null }, phase: 'disabled',
    mode: 'finite', target: 50, completed: 0, currentTime: 0, duration: null, playbackRate: CONFIG.initialRate,
    paused: true, seeking: false, ended: false, readyState: 0, operation: 0, pending: null,
    lastBoundary: null, lastSeek: null, frameMediaTime: null, error: null };
}
export function createState() {
  let value = initialState();
  const listeners = new Set();
  return { get: () => value, snapshot: () => structuredClone(value),
    patch(patch) { value = { ...value, ...patch }; for (const fn of listeners) fn(structuredClone(value)); },
    subscribe(fn) { listeners.add(fn); fn(structuredClone(value)); return () => listeners.delete(fn); } };
}
