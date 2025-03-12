'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import QuizNavigation from '@/components/QuizNavigation';
import Link from 'next/link';

export default function QuizHistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuizHistory = async () => {
      try {
        setLoading(true);
        
        // Check authentication
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        
        if (authError) throw authError;
        
        if (!session || !session.user) {
          router.push('/login');
          return;
        }
        
        // Fetch quiz history
        const { data, error: fetchError } = await supabase
          .from('quiz_sessions')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });
        
        if (fetchError) throw fetchError;
        
        setQuizzes(data || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching quiz history:', err);
        setError('Failed to load your quiz history');
        setLoading(false);
      }
    };
    
    fetchQuizHistory();
  }, [router]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <QuizNavigation />
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-12 w-12 mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full bg-blue-500/30 animate-ping"></div>
            </div>
            <div className="text-gray-300">Loading quiz history...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <QuizNavigation />
        <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-gray-700">
          <div className="flex items-center text-red-400">
            <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <h3 className="font-medium">Error</h3>
              <p className="text-red-300">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <QuizNavigation />
      
      <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mb-6">
          Your Quiz History
        </h2>
        
        {quizzes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">You haven't taken any quizzes yet.</p>
            <Link href="/dashboard/quiz">
              <span className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-lg text-white font-medium shadow-lg border border-indigo-500/10 transition-colors inline-block">
                Take Your First Quiz
              </span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {quizzes.map((quiz, index) => (
              <div key={index} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 mb-4">
                <div className="flex flex-wrap items-center justify-between">
                  <div>
                    <div className="text-white font-medium">
                      Quiz {index + 1}
                      {quiz.difficulty && (
                        <span className="ml-2 text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded-full">
                          {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}
                        </span>
                      )}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {new Date(quiz.created_at).toLocaleString()}
                    </div>
                    <div className="mt-1">
                      {quiz.score !== null ? (
                        <span className="text-green-400">
                          Score: {quiz.score} / {quiz.questions?.length || 0}
                          {" "}
                          ({Math.round((quiz.score / (quiz.questions?.length || 1)) * 100)}%)
                        </span>
                      ) : (
                        <span className="text-yellow-400">Incomplete</span>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => router.push(`/dashboard/quiz/review/${quiz.id}`)}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm shadow-sm border border-purple-500/10 transition-colors mt-2 sm:mt-0"
                  >
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 