// Display-only controller: uses the existing media element and never writes practice state.
// Safari API: https://developer.apple.com/documentation/webkitjs/adding_picture_in_picture_to_your_safari_media_controls
export function setupPresentation(core, doc = document) {
 const get = id => doc.getElementById(id);
 const panel = get('video-panel'), expand = get('expand-video'), pip = get('pip-video'), status = get('presentation-status');
 let video = null, expanded = false, pending = false, detach = () => {};
 const active = () => !!video && (doc.pictureInPictureElement === video || video.webkitPresentationMode === 'picture-in-picture');
 const safari = () => !!video && typeof video.webkitSetPresentationMode === 'function' && !!video.webkitSupportsPresentationMode?.('picture-in-picture');
 const supported = () => safari() || (!!doc.pictureInPictureEnabled && typeof video?.requestPictureInPicture === 'function');
 const ready = () => !!video && video.readyState >= 2 && video.videoWidth > 0 && !video.error;
 function setExpanded(value) {
  expanded = value;
  panel.classList.toggle('video-expanded', value);
  expand.textContent = value ? '恢复大小' : '放大 / 悬浮';
  expand.setAttribute('aria-pressed', String(value));
 }
 function sync() {
  const inPip = active();
  if (inPip) setExpanded(false);
  expand.disabled = !ready() || inPip || pending;
  pip.disabled = pending || (!inPip && (!ready() || !supported()));
  pip.textContent = inPip ? '返回页面' : '画中画';
  pip.setAttribute('aria-pressed', String(inPip));
  if (pending) status.textContent = '正在切换显示方式…';
  else if (inPip) status.textContent = '画中画已开启，可切换到其他 App。';
  else if (!video) status.textContent = '选择视频后可放大或开启画中画。';
  else if (!ready()) status.textContent = '正在等待可播放的视频画面…';
  else if (!supported()) status.textContent = '当前浏览器或视频不支持画中画，仍可在页面内放大。';
  else status.textContent = expanded ? '视频已悬浮，仍可操作 A/B。' : '放大在本页观看，画中画可跨 App 观看。';
 }
 function pauseWhenHidden() {
  if (doc.hidden && core.video && !active()) core.pause();
 }
 function changed() { pending = false; sync(); pauseWhenHidden(); }
 core.onMedia(next => {
  detach(); video = next; pending = false; setExpanded(false);
  const events = ['loadeddata','canplay','error','emptied'];
  for (const name of events) video.addEventListener(name, sync);
  const modes = ['enterpictureinpicture','leavepictureinpicture','webkitpresentationmodechanged'];
  for (const name of modes) video.addEventListener(name, changed);
  detach = () => {
   for (const name of events) next.removeEventListener(name, sync);
   for (const name of modes) next.removeEventListener(name, changed);
  };
  sync();
 });
 expand.onclick = () => { if (!expand.disabled) { setExpanded(!expanded); sync(); } };
 doc.addEventListener('keydown', event => { if (event.key === 'Escape' && expanded) { setExpanded(false); sync(); expand.focus(); } });
 pip.onclick = async () => {
  if (pip.disabled || !video) return;
  const target = video;
  pending = true; sync();
  try {
   // Call directly within the click gesture, without awaiting other operations first.
   if (doc.pictureInPictureElement === target) await doc.exitPictureInPicture();
   else if (safari()) {
    target.webkitSetPresentationMode(active() ? 'inline' : 'picture-in-picture');
   } else await target.requestPictureInPicture();
   // Safari reports the completed transition through webkitpresentationmodechanged.
  } catch (error) {
   if (video === target) { pending = false; sync(); status.textContent = '无法切换画中画，请先播放视频后重试。' + (error.message ? '（'+error.message+'）' : ''); pauseWhenHidden(); }
  } finally {
   // Never leave controls blocked if the browser ignores a request. Actual mode
   // still comes from the browser, not from completion of this request.
   if (video === target) { pending = false; if (!status.textContent.startsWith('无法切换')) sync(); }
  }
 };
 doc.addEventListener('visibilitychange', pauseWhenHidden);
 sync();
 return { isPictureInPicture: active };
}
