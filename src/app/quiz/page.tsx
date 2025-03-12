'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';

export default function QuizPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (!user) {
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
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
                Your Quizzes
              </h1>
              <p className="text-gray-400 max-w-3xl">
                Review your quiz history or create a new personalized quiz based on your learning progress.
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-gray-700">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-indigo-500/10 rounded-full text-indigo-400 mr-4">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white">Create a New Quiz</h2>
            </div>
            
            <p className="text-gray-400 mb-6">
              Generate a personalized quiz based on your learning progress to test and reinforce your knowledge.
            </p>
            
            <Link
              href="/quiz/new"
              className="block w-full py-3 px-4 text-center rounded-lg shadow-lg font-medium text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 transition-colors border border-indigo-500/10 relative overflow-hidden group"
            >
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-indigo-400 to-blue-400 opacity-0 group-hover:opacity-10 transition-opacity"></span>
              <span className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Create New Quiz
              </span>
            </Link>
          </div>
          
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-gray-700">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-blue-500/10 rounded-full text-blue-400 mr-4">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white">Quiz History</h2>
            </div>
            
            <div className="text-gray-400 text-center py-12 border-2 border-dashed border-gray-700 rounded-lg">
              <p>You don't have any quiz history yet.</p>
              <p className="text-sm mt-2">Start by creating your first quiz!</p>
            </div>
          </div>
        </div>
        
        <div className="mt-10 bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-gray-700">
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-4">
              <div className="p-3 bg-blue-500/10 rounded-full text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-100 mb-1">How quizzes work</h3>
              <p className="text-gray-400">
                Quizzes are generated based on your learning history. Each quiz contains questions 
                about tractates and pages you've marked as completed. The more you learn and track, 
                the more comprehensive your quizzes will be!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 