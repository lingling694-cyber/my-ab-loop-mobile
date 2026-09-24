export async function registerPwa(status) {
  if (!('serviceWorker' in navigator) || !isSecureContext) { status.textContent = '离线缓存不可用；播放器仍可运行。'; return; }
  try {
    await navigator.serviceWorker.register(new URL('../service-worker.js', import.meta.url));
    status.textContent = '离线缓存已注册；请在真机验证离线冷启动。';
  } catch (error) { status.textContent = '离线缓存失败：'+error.message+'；播放器不受此注册失败影响。'; }
}
