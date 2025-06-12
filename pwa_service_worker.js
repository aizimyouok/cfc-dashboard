// CFC 사무실 현황 대시보드 - Service Worker
// PWA 오프라인 지원 및 캐싱 관리

const CACHE_NAME = 'cfc-dashboard-v1.0.0';
const DATA_CACHE_NAME = 'cfc-data-v1.0.0';

// 캐시할 정적 파일들
const FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  // 외부 라이브러리들 (CDN)
  'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js'
];

// 설치 이벤트 - 앱이 처음 설치될 때
self.addEventListener('install', function(event) {
  console.log('[ServiceWorker] 설치 시작');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('[ServiceWorker] 파일 캐싱 시작');
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(function() {
        console.log('[ServiceWorker] 모든 파일 캐싱 완료');
        // 새 서비스워커를 즉시 활성화
        return self.skipWaiting();
      })
      .catch(function(error) {
        console.error('[ServiceWorker] 캐싱 실패:', error);
      })
  );
});

// 활성화 이벤트 - 서비스워커가 활성화될 때
self.addEventListener('activate', function(event) {
  console.log('[ServiceWorker] 활성화 시작');
  
  event.waitUntil(
    caches.keys()
      .then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(cacheName) {
            // 오래된 캐시 삭제
            if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
              console.log('[ServiceWorker] 오래된 캐시 삭제:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(function() {
        console.log('[ServiceWorker] 활성화 완료');
        // 모든 클라이언트를 즉시 제어
        return self.clients.claim();
      })
  );
});

// 네트워크 요청 인터셉트
self.addEventListener('fetch', function(event) {
  const requestUrl = new URL(event.request.url);
  
  // Apps Script API 요청 처리 (항상 네트워크 우선)
  if (requestUrl.hostname.includes('script.google.com')) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }
  
  // 다른 모든 요청은 캐시 우선 전략
  event.respondWith(handleStaticRequest(event.request));
});

// API 요청 처리 (네트워크 우선, 실패 시 오프라인 메시지)
function handleApiRequest(request) {
  return fetch(request)
    .then(function(response) {
      // 성공한 응답은 데이터 캐시에 저장
      if (response.status === 200) {
        const responseClone = response.clone();
        caches.open(DATA_CACHE_NAME)
          .then(function(cache) {
            cache.put(request, responseClone);
          });
      }
      return response;
    })
    .catch(function(error) {
      console.log('[ServiceWorker] API 요청 실패, 캐시 확인:', error);
      
      // 캐시된 데이터가 있는지 확인
      return caches.open(DATA_CACHE_NAME)
        .then(function(cache) {
          return cache.match(request);
        })
        .then(function(cachedResponse) {
          if (cachedResponse) {
            console.log('[ServiceWorker] 캐시된 데이터 반환');
            return cachedResponse;
          }
          
          // 캐시된 데이터도 없으면 오프라인 응답 반환
          return new Response(
            JSON.stringify({
              error: '네트워크 연결을 확인해주세요. 오프라인 상태입니다.',
              status: 'offline',
              timestamp: new Date().toISOString()
            }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
              }
            }
          );
        });
    });
}

// 정적 파일 요청 처리 (캐시 우선, 실패 시 네트워크)
function handleStaticRequest(request) {
  return caches.match(request)
    .then(function(cachedResponse) {
      // 캐시에 있으면 캐시된 버전 반환
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // 캐시에 없으면 네트워크에서 가져와서 캐시에 저장
      return fetch(request)
        .then(function(networkResponse) {
          // 유효한 응답인지 확인
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          
          // 응답을 복제하여 캐시에 저장
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(request, responseToCache);
            });
          
          return networkResponse;
        })
        .catch(function(error) {
          console.log('[ServiceWorker] 네트워크 요청 실패:', error);
          
          // 오프라인 상태일 때 기본 페이지 반환
          if (request.destination === 'document') {
            return caches.match('./index.html');
          }
          
          // 다른 리소스는 에러 반환
          return new Response('오프라인 상태입니다.', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
    });
}

// 백그라운드 동기화 (선택사항)
self.addEventListener('sync', function(event) {
  console.log('[ServiceWorker] 백그라운드 동기화:', event.tag);
  
  if (event.tag === 'background-data-sync') {
    event.waitUntil(syncDataInBackground());
  }
});

// 백그라운드에서 데이터 동기화
function syncDataInBackground() {
  console.log('[ServiceWorker] 백그라운드 데이터 동기화 실행');
  
  // 여기에 백그라운드에서 실행할 데이터 동기화 로직 추가
  return Promise.resolve()
    .then(function() {
      console.log('[ServiceWorker] 백그라운드 동기화 완료');
    })
    .catch(function(error) {
      console.error('[ServiceWorker] 백그라운드 동기화 실패:', error);
    });
}

// 푸시 알림 처리 (선택사항)
self.addEventListener('push', function(event) {
  console.log('[ServiceWorker] 푸시 알림 수신:', event);
  
  let notificationData = {
    title: 'CFC 현황판',
    body: '새로운 알림이 있습니다.',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%233498db"/><text x="50" y="55" font-size="30" fill="white" text-anchor="middle" font-family="Arial">CFC</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%233498db"/><text x="50" y="55" font-size="30" fill="white" text-anchor="middle" font-family="Arial">CFC</text></svg>',
    vibrate: [100, 50, 100],
    data: {
      url: './',
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'open',
        title: '열기',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="white" d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7z"/><path fill="white" d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>'
      },
      {
        action: 'dismiss',
        title: '닫기'
      }
    ]
  };
  
  // 푸시 데이터가 있으면 파싱
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = { ...notificationData, ...pushData };
    } catch (error) {
      console.error('[ServiceWorker] 푸시 데이터 파싱 실패:', error);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// 알림 클릭 처리
self.addEventListener('notificationclick', function(event) {
  console.log('[ServiceWorker] 알림 클릭:', event);
  
  event.notification.close();
  
  if (event.action === 'open' || event.action === '') {
    // 앱 열기
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(function(clientList) {
          // 이미 열린 창이 있으면 포커스
          for (let client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              return client.focus();
            }
          }
          
          // 열린 창이 없으면 새 창 열기
          if (clients.openWindow) {
            return clients.openWindow('./');
          }
        })
    );
  }
  // 'dismiss' 액션은 알림만 닫음 (별도 처리 불필요)
});

// 메시지 이벤트 처리 (클라이언트와 통신)
self.addEventListener('message', function(event) {
  console.log('[ServiceWorker] 메시지 수신:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys()
        .then(function(cacheNames) {
          return Promise.all(
            cacheNames.map(function(cacheName) {
              console.log('[ServiceWorker] 캐시 삭제:', cacheName);
              return caches.delete(cacheName);
            })
          );
        })
        .then(function() {
          event.ports[0].postMessage({ success: true });
        })
    );
  }
});

// 에러 처리
self.addEventListener('error', function(event) {
  console.error('[ServiceWorker] 에러 발생:', event.error);
});

self.addEventListener('unhandledrejection', function(event) {
  console.error('[ServiceWorker] 처리되지 않은 Promise 거부:', event.reason);
  event.preventDefault();
});

// 서비스워커 업데이트 체크
function checkForUpdates() {
  return self.registration.update()
    .then(function(registration) {
      console.log('[ServiceWorker] 업데이트 확인 완료');
      return registration;
    })
    .catch(function(error) {
      console.error('[ServiceWorker] 업데이트 확인 실패:', error);
    });
}

// 주기적 업데이트 체크 (24시간마다)
if ('serviceWorker' in navigator && 'periodicSync' in window.ServiceWorkerRegistration.prototype) {
  self.addEventListener('periodicsync', function(event) {
    if (event.tag === 'update-check') {
      event.waitUntil(checkForUpdates());
    }
  });
}

console.log('[ServiceWorker] 서비스워커 스크립트 로드 완료 - 버전:', CACHE_NAME);