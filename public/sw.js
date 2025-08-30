/**
 * Service Worker for Passion Seed
 * Provides offline caching and performance optimization
 */

const CACHE_NAME = 'pseed-v1'
const STATIC_CACHE = 'pseed-static-v1'
const DYNAMIC_CACHE = 'pseed-dynamic-v1'

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline',
  // Icons and favicons
  '/favicon.ico',
  '/android-chrome-192x192.webp',
  '/android-chrome-512x512.webp',
  '/apple-touch-icon.webp',
  // Logo
  '/passionseed-logo.svg',
  // Common island images (WebP versions)
  '/islands/winter.webp',
  '/islands/desert.webp',
  '/islands/crystal.webp',
]

// Network-first strategies for these patterns
const NETWORK_FIRST = [
  /^\/api\//,           // API calls
  /^\/auth\//,          // Authentication
  /^\/_next\/data\//,   // Next.js data
]

// Cache-first strategies for these patterns  
const CACHE_FIRST = [
  /^\/islands\//,       // Island images
  /^\/favicon/,         // Favicons
  /\.(?:png|jpg|jpeg|svg|webp|avif)$/,  // Images
  /\.(?:js|css)$/,      // Static assets
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Caching static assets...')
        return cache.addAll(STATIC_ASSETS)
      })
      .catch(err => console.error('Failed to cache static assets:', err))
  )
  // Skip waiting to activate immediately
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old cache versions
          if (cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE &&
              cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim()
    })
  )
})

// Fetch event - handle caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }
  
  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return
  }

  // Apply caching strategy based on URL patterns
  if (NETWORK_FIRST.some(pattern => pattern.test(url.pathname))) {
    // Network first for API calls and dynamic content
    event.respondWith(networkFirst(request))
  } else if (CACHE_FIRST.some(pattern => pattern.test(url.pathname))) {
    // Cache first for static assets
    event.respondWith(cacheFirst(request))
  } else {
    // Stale while revalidate for everything else
    event.respondWith(staleWhileRevalidate(request))
  }
})

// Network first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request)
    // Cache successful responses
    if (networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.log('Network failed, trying cache:', request.url)
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline')
    }
    throw error
  }
}

// Cache first strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.log('Failed to fetch:', request.url, error)
    throw error
  }
}

// Stale while revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE)
  const cachedResponse = await cache.match(request)
  
  // Always try to update cache in background
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.status === 200) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  }).catch(err => {
    console.log('Background fetch failed:', request.url)
    return null
  })
  
  // Return cached version immediately if available
  if (cachedResponse) {
    // Don't await the fetch promise to avoid blocking
    fetchPromise.catch(() => {}) // Prevent unhandled promise rejection
    return cachedResponse
  }
  
  // If no cache, wait for network
  try {
    return await fetchPromise
  } catch (error) {
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline')
    }
    throw error
  }
}

// Message handling for cache management
self.addEventListener('message', (event) => {
  const { action, data } = event.data
  
  switch (action) {
    case 'CACHE_UPDATE':
      // Force update specific resources
      event.waitUntil(updateCache(data.urls))
      break
    case 'CLEAR_CACHE':
      // Clear specific cache or all
      event.waitUntil(clearCache(data.cacheNames))
      break
    case 'GET_CACHE_STATUS':
      // Return cache status
      event.waitUntil(getCacheStatus().then(status => {
        event.ports[0].postMessage(status)
      }))
      break
  }
})

async function updateCache(urls) {
  const cache = await caches.open(DYNAMIC_CACHE)
  return Promise.all(
    urls.map(url => 
      fetch(url).then(response => {
        if (response.status === 200) {
          return cache.put(url, response)
        }
      }).catch(err => console.log('Failed to update cache for:', url))
    )
  )
}

async function clearCache(cacheNames = []) {
  if (cacheNames.length === 0) {
    // Clear all caches
    const allCaches = await caches.keys()
    return Promise.all(allCaches.map(name => caches.delete(name)))
  }
  return Promise.all(cacheNames.map(name => caches.delete(name)))
}

async function getCacheStatus() {
  const cacheNames = await caches.keys()
  const status = {}
  
  for (const name of cacheNames) {
    const cache = await caches.open(name)
    const keys = await cache.keys()
    status[name] = {
      count: keys.length,
      urls: keys.map(req => req.url).slice(0, 10) // First 10 URLs
    }
  }
  
  return status
}