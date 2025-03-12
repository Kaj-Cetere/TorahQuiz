export default function Loading() {
  return (
    <div className="min-h-screen text-gray-100 flex justify-center items-center">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-indigo-500/3 blur-3xl rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-blue-500/3 blur-3xl rounded-full"></div>
      </div>
      
      <div className="flex flex-col items-center relative z-10">
        <div className="relative w-20 h-20 mb-6">
          <div className="absolute inset-0 bg-blue-500/10 rounded-full"></div>
          <div className="absolute inset-0 bg-indigo-500/10 rounded-full animate-ping-slow"></div>
          <div className="absolute inset-3 bg-gray-800 rounded-full flex items-center justify-center">
            <svg className="h-8 w-8 text-blue-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
        </div>
        <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-gray-700 text-center">
          <h2 className="text-xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">Loading...</h2>
          <p className="text-gray-400">Please wait while we prepare your content</p>
        </div>
      </div>
    </div>
  );
} 