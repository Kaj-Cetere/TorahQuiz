'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          router.push('/dashboard');
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 relative overflow-hidden">
        
        
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-96 h-96 bg-indigo-500/10 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-blue-500/10 rounded-full filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-40 left-1/4 w-64 h-64 bg-indigo-500/10 rounded-full filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        <div className="relative z-10 text-center mb-12">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mb-4">
            Torah Quizician
          </h1>
          <p className="text-gray-400 text-xl max-w-lg">
            Your personalized Gemara learning companion
          </p>
        </div>

        <div className="relative z-10 bg-gray-800/70 backdrop-blur-sm p-8 rounded-lg shadow-xl border border-gray-700 max-w-md w-full">
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <svg className="animate-spin h-10 w-10 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <div className="absolute inset-0 rounded-full animate-ping-slow bg-blue-400/10"></div>
            </div>
          </div>
          <p className="text-center text-gray-300 mb-2">Initializing your learning environment...</p>
          <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 animate-pulse-width"></div>
          </div>
        </div>
      </div>
    );
  }

  // This should never be displayed as we immediately redirect
  return null;
}

// Add a style block for custom animations
const styles = `
@keyframes ping-slow {
  0% {
    transform: scale(1);
    opacity: 0.2;
  }
  50% {
    transform: scale(1.5);
    opacity: 0.1;
  }
  100% {
    transform: scale(1);
    opacity: 0.2;
  }
}

@keyframes pulse-width {
  0%, 100% {
    width: 20%;
  }
  50% {
    width: 100%;
  }
}

.animate-ping-slow {
  animation: ping-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite;
}

.animate-pulse-width {
  animation: pulse-width 2s ease-in-out infinite;
}
`;
