export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
            <svg 
              className="w-8 h-8 text-purple-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            You're Offline
          </h1>
          
          <p className="text-gray-600">
            No internet connection detected. Some features may be limited while offline.
          </p>
        </div>

        <div className="space-y-4">
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Try Again
          </button>
          
          <button 
            onClick={() => window.history.back()}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>Offline features coming soon:</p>
          <ul className="mt-2 space-y-1">
            <li>• View cached learning maps</li>
            <li>• Access downloaded content</li>
            <li>• Continue learning offline</li>
          </ul>
        </div>
      </div>
    </div>
  )
}