const CACHE = 'ab-loop-shell-v0.1.0-r5';
const FILES = ['./','./index.html','./style.css','./manifest.json','./icon.svg',
 './src/constants.js','./src/media-state.js','./src/media-resource.js','./src/media-transport.js','./src/region.js','./src/loop-engine.js','./src/practice-session.js','./src/player-core.js','./src/ui.js','./src/pwa.js',
 './tests/index.html','./tests/observer.js','./tests/test-runner.js','./tests/test-cases.js','./tests/report.js','./tests/panel.js'];
const allowed = new Set(FILES.map(p=>new URL(p,self.registration.scope).href));
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('ab-loop-shell-')&&k!==CACHE).map(k=>caches.delete(k))))));
// No skipWaiting: never replace the active shell mid-practice.
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||!allowed.has(event.request.url))return;
 event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(event.request))||fetch(event.request)));
});
