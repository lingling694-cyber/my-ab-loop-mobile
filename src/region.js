export function validRegion(region, duration) {
  return Number.isFinite(duration) && Number.isFinite(region.start) && Number.isFinite(region.end)
    && region.start >= 0 && region.start < region.end && region.end <= duration;
}
export function seekableAt(video, time) {
  for (let i = 0; i < video.seekable.length; i++) {
    if (time >= video.seekable.start(i) && time <= video.seekable.end(i)) return true;
  }
  return false;
}
