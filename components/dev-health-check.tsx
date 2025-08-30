"use client"

import { useEffect, useState } from "react"

interface HealthStatus {
  supabaseUrl: boolean
  supabaseKey: boolean
  environment: string
  error?: string
}

export function DevHealthCheck() {
  const [status, setStatus] = useState<HealthStatus | null>(null)

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') return

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      setStatus({
        supabaseUrl: !!supabaseUrl && supabaseUrl.length > 0,
        supabaseKey: !!supabaseKey && supabaseKey.length > 0,
        environment: process.env.NODE_ENV || 'unknown',
      })
    } catch (error) {
      setStatus({
        supabaseUrl: false,
        supabaseKey: false,
        environment: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }, [])

  // Only render in development and if there are issues
  if (process.env.NODE_ENV !== 'development' || !status) return null
  
  const hasIssues = !status.supabaseUrl || !status.supabaseKey || status.error

  if (!hasIssues) return null

  return (
    <div className="fixed top-4 right-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm z-50 max-w-sm">
      <h3 className="font-semibold text-red-800 mb-2">Development Issues Detected</h3>
      <ul className="space-y-1 text-red-700">
        {!status.supabaseUrl && <li>❌ Missing NEXT_PUBLIC_SUPABASE_URL</li>}
        {!status.supabaseKey && <li>❌ Missing NEXT_PUBLIC_SUPABASE_ANON_KEY</li>}
        {status.error && <li>❌ Error: {status.error}</li>}
      </ul>
      <p className="mt-2 text-xs text-red-600">
        Check your .env.local file and restart the dev server
      </p>
    </div>
  )
}