"use client"

import { useEffect } from 'react'
import { logger } from '@/lib/utils/logger'

const componentLogger = logger

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Only register service worker in production
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      registerServiceWorker()
    }
  }, [])

  const registerServiceWorker = async () => {
    try {
      componentLogger.info('Registering service worker...')
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      })
      
      componentLogger.info('Service worker registered successfully', {
        scope: registration.scope
      })

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          componentLogger.info('New service worker version available')
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available, notify user
              if (window.confirm('A new version is available. Reload to update?')) {
                window.location.reload()
              }
            }
          })
        }
      })

      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, payload } = event.data
        
        switch (type) {
          case 'CACHE_UPDATED':
            componentLogger.info('Cache updated', payload)
            break
          case 'OFFLINE_READY':
            componentLogger.info('App is ready for offline use')
            break
        }
      })

    } catch (error) {
      componentLogger.error('Service worker registration failed', error)
    }
  }

  // Check if app is running standalone (PWA)
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      componentLogger.info('App is running as PWA')
      document.documentElement.classList.add('standalone')
    }
  }, [])

  return null
}