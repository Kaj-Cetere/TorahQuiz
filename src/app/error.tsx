'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen text-gray-100 flex justify-center items-center">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-indigo-500/3 blur-3xl rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-blue-500/3 blur-3xl rounded-full"></div>
      </div>
      
      <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-gray-700 text-center max-w-md relative z-10">
        <div className="p-3 bg-amber-500/10 rounded-full text-amber-400 mx-auto mb-4 w-fit">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Something Went Wrong</h1>
        <p className="text-gray-400 mb-6">
          We apologize for the inconvenience. Please try again or return to the dashboard.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-lg shadow-lg text-white font-medium hover:from-indigo-700 hover:to-blue-700 transition-colors border border-indigo-500/10"
          >
            Try Again
          </button>
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