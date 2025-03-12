'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LearningSelector from '@/components/LearningSelector';
import { User } from '@supabase/supabase-js';

export default function LearningPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (!user) {
        // Redirect to login if not authenticated
        router.push('/login');
        return;
      }

      setLoading(false);
    };

    getUser();
  }, [router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh] bg-gray-900">
        <div className="animate-pulse flex flex-col items-center">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 bg-blue-500/10 rounded-full"></div>
            <div className="absolute inset-0 bg-indigo-500/10 rounded-full animate-ping-slow"></div>
            <div className="absolute inset-2 bg-gray-800 rounded-full flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div className="h-4 bg-gray-800 rounded w-48 mb-2.5"></div>
          <div className="h-3 bg-gray-700 rounded w-32"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen text-gray-100">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-indigo-500/3 blur-3xl rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-blue-500/3 blur-3xl rounded-full"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mb-2">
                Learning Progress
              </h1>
              <p className="text-gray-400 max-w-3xl">
                Track your journey through Shas by marking which daf you've learned. 
                Your progress will synchronize with quizzes to help you review exactly what you've studied.
              </p>
            </div>
            
            <Link
              href="/dashboard"
              className="mt-4 md:mt-0 px-5 py-2.5 bg-gray-800 rounded-lg shadow-lg text-gray-200 hover:bg-gray-700 hover:text-blue-300 flex items-center gap-2 transition-colors border border-gray-700 group"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-blue-400 group-hover:text-blue-300 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Dashboard
            </Link>
          </div>
        </div>
        
        <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl p-6 mb-8 border border-gray-700">
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-4">
              <div className="p-3 bg-blue-500/10 rounded-full text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-1">Why track your learning?</h3>
              <p className="text-gray-400">
                Select the tractates and dapim you've learned. This information will be used to generate
                personalized quizzes tailored to your studies, helping reinforce your knowledge.
              </p>
            </div>
          </div>
        </div>
        
        <LearningSelector />
      </div>
    </div>
  );
} 