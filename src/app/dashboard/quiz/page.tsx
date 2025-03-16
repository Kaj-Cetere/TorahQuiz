'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import QuizGenerationPopup from '@/components/QuizGenerationPopup';
import QuizNavigation from '@/components/QuizNavigation';
import { QuizSettings, QuizTopicSelection } from '@/lib/types';

// Sample conceptual topics for Talmud study - moved to QuizGenerationPopup

export default function QuizPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [settings, setSettings] = useState<QuizSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        
        if (authError) throw authError;
        
        if (!session || !session.user) {
          router.push('/login');
          return;
        }
        
        setUserId(session.user.id);
        setLoading(false);
      } catch (err) {
        console.error('Authentication error:', err);
        setError('Authentication failed. Please try logging in again.');
        setLoading(false);
      }
    };
    
    checkAuth();
    
    // Try to load saved settings from localStorage
    const savedSettings = localStorage.getItem('quizSettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (err) {
        console.error('Error parsing saved settings:', err);
      }
    }
  }, [router]);

  // Show the quiz generation popup
  const handleGenerateQuizClick = () => {
    setShowPopup(true);
  };

  // Handle topic selection from popup
  const handleTopicSelected = async (topicSelection: QuizTopicSelection) => {
    try {
      if (!settings || !userId) {
        setError('Please configure quiz settings first');
        return;
      }
      
      // Save topic selection to localStorage for use in generate page
      localStorage.setItem('quizTopicSelection', JSON.stringify(topicSelection));
      
      // Hide popup and navigate to the quiz generation page
      setShowPopup(false);
      router.push('/dashboard/quiz/generate');
    } catch (err) {
      console.error('Error saving quiz preferences:', err);
      setError('Failed to save your quiz preferences. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-12 w-12 mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full bg-blue-500/30 animate-ping"></div>
            </div>
            <div className="text-gray-300">Loading...</div>
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
      
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100 mb-2">Torah Quizician</h1>
        <p className="text-gray-400">Test your knowledge of the texts you've learned</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Quiz Generation Card */}
        <div className="md:col-span-2 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-xl p-6 border border-blue-500/30">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-blue-500/20 rounded-full mr-3">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
              Generate Quiz
            </h2>
          </div>
          
          <p className="text-gray-300 mb-6 pl-12">
            Create a personalized quiz based on your learned material to test your knowledge and reinforce your learning.
          </p>
          
          <button
            onClick={handleGenerateQuizClick}
            disabled={!settings}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-lg text-white font-medium shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
            </svg>
            {settings ? 'Generate Quiz' : 'Configure Settings First'}
          </button>
          
          {!settings && (
            <p className="text-amber-400 text-sm mt-3 text-center">
              Please configure your quiz settings first
            </p>
          )}
        </div>
        
        {/* Quiz Settings Card */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-xl p-6 border border-purple-500/30">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-purple-500/20 rounded-full mr-3">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
              Quiz Settings
            </h2>
          </div>
          
          {settings ? (
            <div className="space-y-3 mb-6">
              <div className="flex items-center text-gray-300">
                <span className="w-1/2">Questions:</span>
                <span className="w-1/2 text-purple-300 font-medium">{settings.questionCount}</span>
              </div>
              <div className="flex items-center text-gray-300">
                <span className="w-1/2">Difficulty:</span>
                <span className="w-1/2 text-purple-300 font-medium capitalize">{settings.difficulty}</span>
              </div>
              <div className="flex items-center text-gray-300">
                <span className="w-1/2">Types:</span>
                <span className="w-1/2 text-purple-300 font-medium">{settings.questionTypes.length} selected</span>
              </div>
              <div className="flex items-center text-gray-300">
                <span className="w-1/2">Language:</span>
                <span className="w-1/2 text-purple-300 font-medium">
                  {settings.language === 'en' ? 'English' : 
                   settings.language === 'he' ? 'Hebrew' : 'Both'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-300 mb-6 pl-12">
              Configure how your quizzes work, including difficulty, language, and question types.
            </p>
          )}
          
          <Link
            href="/dashboard/quiz/settings"
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg text-white font-medium shadow-lg flex items-center justify-center transition-all"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            {settings ? 'Modify Settings' : 'Configure Settings'}
          </Link>
        </div>
      </div>
      
      {/* Recent Quizzes Section Placeholder */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-xl p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-gray-100 mb-4">Recent Quizzes</h2>
        <div className="text-gray-400 text-center py-6">
          Your past quiz sessions will appear here. Generate a quiz to get started!
        </div>
      </div>
      
      {/* Quiz Generation Popup */}
      {showPopup && userId && (
        <QuizGenerationPopup 
          userId={userId}
          onGenerateQuiz={handleTopicSelected}
          onCancel={() => setShowPopup(false)}
        />
      )}
    </div>
  );
} 