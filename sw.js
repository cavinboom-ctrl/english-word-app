/* =========================================================
   나의 영어 단어 도감 - 오프라인 지원 (서비스 워커)
   - 앱 파일: 저장해 둔 것을 바로 보여 주고, 인터넷이 있으면 뒤에서 새 버전으로 바꿔 둔다
     (앱을 고쳐 올리면 다음에 열 때 반영된다)
   - 글꼴: 한 번 받으면 저장해 두고 계속 쓴다
   - 사전·번역 같은 인터넷 검색은 건드리지 않는다
   이 파일을 고치면 VERSION 을 올려야 기기들이 새 파일을 받는다.
   ========================================================= */
const VERSION = 'v1';
const APP_CACHE = 'word-app-' + VERSION;
const FONT_CACHE = 'word-fonts-v1';
const APP_FILES = ['./', 'index.html', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(APP_CACHE).then(c=>c.addAll(APP_FILES)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==APP_CACHE && k!==FONT_CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

/** 저장본을 먼저 주고, 뒤에서 새로 받아 저장본을 바꿔 둔다 */
async function appFile(req){
  const cache = await caches.open(APP_CACHE);
  const key = req.mode==='navigate' ? 'index.html' : req;
  const saved = await cache.match(key, {ignoreSearch:true});
  const fresh = fetch(req).then(res=>{
    if(res && res.ok) cache.put(key, res.clone());
    return res;
  }).catch(()=>null);
  if(saved){ fresh.catch(()=>{}); return saved; }
  return (await fresh) || new Response('인터넷이 연결되면 다시 열어 주세요.', {status:503, headers:{'Content-Type':'text/plain; charset=utf-8'}});
}

/** 글꼴은 한 번 받으면 저장본만 쓴다 */
async function fontFile(req){
  const cache = await caches.open(FONT_CACHE);
  const saved = await cache.match(req);
  if(saved) return saved;
  try{
    const res = await fetch(req);
    if(res && (res.ok || res.type==='opaque')) cache.put(req, res.clone());
    return res;
  }catch(e){
    return new Response('', {status:504});
  }
}

self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method!=='GET') return;
  const url = new URL(req.url);
  if(url.origin===self.location.origin){ e.respondWith(appFile(req)); return; }
  if(url.hostname==='fonts.googleapis.com' || url.hostname==='fonts.gstatic.com'){ e.respondWith(fontFile(req)); return; }
  // 그 밖의 인터넷 요청(사전, 번역, 발음)은 그대로 보낸다
});
