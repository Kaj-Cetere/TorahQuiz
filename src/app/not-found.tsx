import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen text-gray-100 flex justify-center items-center">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-indigo-500/3 blur-3xl rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-blue-500/3 blur-3xl rounded-full"></div>
      </div>
      
      <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-gray-700 text-center max-w-md relative z-10">
        <div className="p-3 bg-blue-500/10 rounded-full text-blue-400 mx-auto mb-4 w-fit">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
        <p className="text-gray-400 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/" 
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-lg shadow-lg text-white font-medium hover:from-indigo-700 hover:to-blue-700 transition-colors border border-indigo-500/10"
          >
            Go Home
          </Link>
          <Link 
            href="/dashboard" 
            className="px-5 py-2.5 bg-gray-700 rounded-lg shadow-lg text-gray-200 hover:bg-gray-600 hover:text-blue-300 transition-colors border border-gray-600"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
} 