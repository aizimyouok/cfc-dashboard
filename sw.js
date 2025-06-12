// CFC 현황판 Service Worker - 간단 버전
const CACHE_NAME = 'cfc-dashboard-v1.0.1';

// 설치 이벤트
self.addEventListener('install', function(event) {
  console.log('✅ Service Worker 설치됨');
  self.skipWaiting();
});

// 활성화 이벤트  
self.addEventListener('activate', function(event) {
  console.log('✅ Service Worker 활성화됨');
  event.waitUntil(self.clients.claim());
});

// 네트워크 요청 처리
self.addEventListener('fetch', function(event) {
  // 단순히 네트워크 요청 허용
  event.respondWith(fetch(event.request));
});

console.log('Service Worker 로드 완료');
