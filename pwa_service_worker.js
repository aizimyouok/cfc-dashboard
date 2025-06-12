// CFC 현황판 Service Worker
const CACHE_NAME = 'cfc-dashboard-v1.0.0';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// 설치 이벤트
self.addEventListener('install', function(event) {
  console.log('Service Worker 설치 완료');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('캐시 파일 저장 시작');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// 활성화 이벤트
self.addEventListener('activate', function(event) {
  console.log('Service Worker 활성화 완료');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('이전 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 네트워크 요청 처리
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // 캐시에 있으면 캐시 버전 반환
        if (response) {
          return response;
        }
        // 없으면 네트워크에서 가져오기
        return fetch(event.request).then(function(response) {
          // 유효한 응답인지 확인
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // 캐시에 저장
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        }).catch(function() {
          // 오프라인일 때 기본 페이지 반환
          return caches.match('./index.html');
        });
      })
  );
});

console.log('Service Worker 스크립트 로드 완료');
