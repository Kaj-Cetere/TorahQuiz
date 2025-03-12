'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import QuizSettingsComponent from '@/components/QuizSettings';
import QuizNavigation from '@/components/QuizNavigation';
import { QuizSettings } from '@/lib/types';

export default function QuizSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<QuizSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Check authentication status and load saved settings
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
        
        // Try to load saved settings from localStorage
        const savedSettings = localStorage.getItem('quizSettings');
        if (savedSettings) {
          try {
            setSettings(JSON.parse(savedSettings));
          } catch (err) {
            console.error('Error parsing saved settings:', err);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Authentication error:', err);
        setError('Authentication failed. Please try logging in again.');
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);

  // Handle quiz settings submission
  const handleSettingsSave = (newSettings: QuizSettings) => {
    setSettings(newSettings);
    localStorage.setItem('quizSettings', JSON.stringify(newSettings));
    setSaveSuccess(true);
    
    // Reset success message after 3 seconds
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  // Return to quiz page
  const handleBackClick = () => {
    router.push('/dashboard/quiz');
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
      
      {/* Back button */}
      <div className="mb-4">
        <button
          onClick={handleBackClick}
          className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          Back to Quiz
        </button>
      </div>
      
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-xl p-6 border border-purple-500/30 mb-8">
        <div className="flex items-center mb-6">
          <div className="p-2 bg-purple-500/20 rounded-full mr-3">
            <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
            Quiz Settings
          </h2>
        </div>
        
        {saveSuccess && (
          <div className="mb-6 bg-green-900/30 border border-green-600/30 rounded-lg p-3 text-green-400 flex items-center animate-fadeIn">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            Settings saved successfully!
          </div>
        )}
        
        <p className="text-gray-300 mb-6">
          Configure how your quizzes work. These settings will be applied to all quizzes you generate.
        </p>
        
        <QuizSettingsComponent 
          initialSettings={settings || undefined} 
          onSave={handleSettingsSave} 
        />
        
        <div className="mt-6 flex justify-center">
          <Link 
            href="/dashboard/quiz"
            className="text-purple-400 hover:text-purple-300 flex items-center gap-1"
          >
            Return to quiz page
          </Link>
        </div>
      </div>
    </div>
  );
} 