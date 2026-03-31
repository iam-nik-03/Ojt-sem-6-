const CACHE_NAME = 'video-cache-v1';
const VIDEO_URL_PATTERN = /\/api\/stream\/|\.mp4$|\.webm$|\.ogg$/;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests for videos
  if (event.request.method === 'GET' && VIDEO_URL_PATTERN.test(url.pathname)) {
    event.respondWith(handleVideoRequest(event.request));
  }
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_CACHE') {
    checkCache(event.data.url).then(isCached => {
      event.source.postMessage({
        type: 'CACHE_STATUS',
        url: event.data.url,
        isCached
      });
    });
  } else if (event.data && event.data.type === 'PRECACHE_VIDEO') {
    precacheVideo(event.data.url);
  } else if (event.data && event.data.type === 'DELETE_CACHE') {
    deleteCache(event.data.url);
  }
});

async function checkCache(url) {
  const cache = await caches.open(CACHE_NAME);
  const response = await cache.match(url, { ignoreSearch: true });
  return !!response;
}

async function precacheVideo(url) {
  const cache = await caches.open(CACHE_NAME);
  const response = await cache.match(url, { ignoreSearch: true });
  if (!response) {
    try {
      const networkResponse = await fetch(url);
      if (networkResponse.ok) {
        await cache.put(url, networkResponse);
        console.log('Video precached:', url);
        
        // Notify clients that caching is complete
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'CACHE_STATUS',
            url: url,
            isCached: true
          });
        });
      }
    } catch (error) {
      console.error('Precache failed:', error);
    }
  }
}

async function deleteCache(url) {
  const cache = await caches.open(CACHE_NAME);
  await cache.delete(url, { ignoreSearch: true });
}

async function handleVideoRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request, { ignoreSearch: true });

  if (cachedResponse) {
    // If it's a range request, we need to handle it specially
    if (request.headers.has('Range')) {
      return handleRangeRequest(request, cachedResponse);
    }
    return cachedResponse;
  }

  // Not in cache, fetch from network
  try {
    const response = await fetch(request);
    
    // If it's a full response (200), cache it for future range requests
    if (response.status === 200) {
      const responseToCache = response.clone();
      cache.put(request, responseToCache);
    }

    return response;
  } catch (error) {
    console.error('Fetch failed for video:', error);
    return new Response('Video fetch failed', { status: 408 });
  }
}

async function handleRangeRequest(request, cachedResponse) {
  const rangeHeader = request.headers.get('Range');
  const bytesMatch = rangeHeader.match(/^bytes=(\d+)-(\d+)?$/);
  
  if (!bytesMatch) {
    return cachedResponse;
  }

  const fullBlob = await cachedResponse.blob();
  const start = parseInt(bytesMatch[1], 10);
  const end = bytesMatch[2] ? parseInt(bytesMatch[2], 10) : fullBlob.size - 1;

  const slicedBlob = fullBlob.slice(start, end + 1);
  
  return new Response(slicedBlob, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': cachedResponse.headers.get('Content-Type') || 'video/mp4',
      'Content-Range': `bytes ${start}-${end}/${fullBlob.size}`,
      'Content-Length': slicedBlob.size,
      'Accept-Ranges': 'bytes',
    },
  });
}
