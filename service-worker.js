// 캐시 이름 정의 (버전 관리를 위해 v1, v2 와 같이 지정)
const CACHE_NAME = 'cfc-dashboard-cache-v2';

// 오프라인 상태일 때 표시하기 위해 캐싱할 파일 목록
// index.html에서 사용하는 외부 라이브러리들을 포함합니다.
const FILES_TO_CACHE = [
  '/cfc-dashboard/index.html',
  '/cfc-dashboard/',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js',
  '/cfc-dashboard/icons/icon-192.png',
  '/cfc-dashboard/icons/icon-512.png'
];

// 서비스 워커 설치 이벤트: FILES_TO_CACHE에 있는 모든 파일을 캐싱합니다.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('서비스 워커: 캐시된 파일들', FILES_TO_CACHE);
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

// 서비스 워커 활성화 이벤트: 이전 버전의 캐시를 정리합니다.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('서비스 워커: 오래된 캐시 삭제', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch 이벤트: 네트워크 요청이 발생할 때마다 실행됩니다.
// 오프라인 상태일 경우 캐시에서 파일을 찾아 반환합니다.
self.addEventListener('fetch', (event) => {
  // Google Apps Script 요청은 캐시하지 않고 항상 네트워크로 보냅니다.
  if (event.request.url.includes('script.google.com')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      // 캐시에 파일이 있으면 캐시에서 반환하고, 없으면 네트워크로 요청합니다.
      return response || fetch(event.request);
    })
  );
});
